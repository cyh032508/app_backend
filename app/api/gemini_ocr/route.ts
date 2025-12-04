import { NextRequest, NextResponse } from 'next/server';
import { validateImageUpload } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { processImage } from '@/lib/gemini-ocr/pipeline';

/**
 * @swagger
 * /api/gemini_ocr:
 *   post:
 *     summary: 使用 Gemini AI 進行 OCR 識別（推薦）
 *     description: 對上傳的圖片執行 OCR 辨識，會對原始圖片和二值化圖片分別進行識別，然後交叉比對優化結果
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 需上傳的圖片檔案（作文稿紙照片）
 *     responses:
 *       200:
 *         description: OCR 辨識成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OCRResult'
 *       400:
 *         description: 請求錯誤（缺少圖片或格式錯誤）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服務器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: NextRequest) {
  try {
    // 验证图片上传
    const validation = await validateImageUpload(req);
    if (!validation.isValid) {
      return validation.response;
    }

    const imageFile = validation.file!;

    // 读取图片为 Buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageName = imageFile.name || 'image.jpg';

    // 执行 OCR 处理
    const result = await processImage(imageBuffer, imageName);

    // 检查处理结果
    if (!result.success) {
      return errorResponse(
        result.error || 'OCR 處理失敗',
        undefined,
        result,
        500
      );
    }

    // 決定最終使用的文字結果（優先順序：優化結果 > 原始 OCR > 二值化 OCR）
    let finalText = '';
    try {
      if (result.cross_compare.success && result.cross_compare.text) {
        finalText = result.cross_compare.text;
        console.log('✅ 使用交叉比對結果作為最終文字');
      } else if (result.original_ocr.success && result.original_ocr.text) {
        finalText = result.original_ocr.text;
        console.log('✅ 使用原始 OCR 結果作為最終文字');
      } else if (result.binary_ocr.success && result.binary_ocr.text) {
        finalText = result.binary_ocr.text;
        console.log('✅ 使用二值化 OCR 結果作為最終文字');
      }
      console.log(`📝 最終文字長度: ${finalText.length} 字元`);
    } catch (textError: any) {
      console.error('❌ 提取最終文字失敗:', textError.message);
      finalText = '';
    }

    // 構建回應資料（兼容舊格式）
    try {
      const responseData = {
        // 兼容舊的 upload_segment_ocr 格式
        message: 'OCR 辨識完成',
        result_text: finalText, // 舊格式欄位
        text: finalText, // 前端可能使用的欄位
        ocr_text: finalText, // 前端可能使用的欄位

        // 保留完整的詳細資料供未來使用
        success: true,
        data: {
          original_ocr: {
            success: result.original_ocr.success,
            text: result.original_ocr.text || '',
            text_length: result.original_ocr.text_length || 0,
            ocr_time: result.original_ocr.ocr_time || 0,
            finish_reason: result.original_ocr.finish_reason,
            error: result.original_ocr.error,
          },
          binary_ocr: {
            success: result.binary_ocr.success,
            text: result.binary_ocr.text || '',
            text_length: result.binary_ocr.text_length || 0,
            ocr_time: result.binary_ocr.ocr_time || 0,
            finish_reason: result.binary_ocr.finish_reason,
            error: result.binary_ocr.error,
          },
          optimized: {
            success: result.cross_compare.success,
            text: result.cross_compare.text || '',
            text_length: result.cross_compare.text_length || 0,
            compare_time: result.cross_compare.compare_time || 0,
            finish_reason: result.cross_compare.finish_reason,
            error: result.cross_compare.error,
          },
          total_time: result.total_time,
          load_time: result.load_time,
          binarize_time: result.binarize_time,
        },
      };

      // 檢查回應大小（Vercel 限制約 4.5MB）
      const responseSize = JSON.stringify(responseData).length;
      console.log('✅ 構建回應資料成功');
      console.log(`   - Final Text 長度: ${finalText.length}`);
      console.log(`   - Response Data 大小: ${(responseSize / 1024 / 1024).toFixed(2)} MB (${responseSize} bytes)`);
      
      if (responseSize > 4 * 1024 * 1024) {
        console.warn('⚠️ 回應資料過大，可能超過 Vercel 限制 (4.5MB)');
        // 如果回應過大，只返回必要的資料
        const compactResponseData = {
          message: 'OCR 辨識完成',
          result_text: finalText,
          text: finalText,
          ocr_text: finalText,
          success: true,
          data: {
            optimized: {
              success: result.cross_compare.success,
              text: result.cross_compare.text || '',
              text_length: result.cross_compare.text_length || 0,
            },
            total_time: result.total_time,
          },
        };
        console.log(`   - 使用精簡回應，大小: ${(JSON.stringify(compactResponseData).length / 1024 / 1024).toFixed(2)} MB`);
        return successResponse(compactResponseData, 'OCR 辨識完成');
      }

      return successResponse(responseData, 'OCR 辨識完成');
    } catch (buildError: any) {
      console.error('❌ 構建回應資料失敗:', buildError.message);
      console.error('   錯誤詳情:', buildError);
      return errorResponse(
        `構建回應資料失敗: ${buildError.message}`,
        undefined,
        { finalTextLength: finalText.length },
        500
      );
    }
  } catch (error: any) {
    console.error('Error in gemini_ocr:', error);
    return errorResponse(
      `處理過程發生錯誤: ${error.message}`,
      undefined,
      undefined,
      500
    );
  }
}

