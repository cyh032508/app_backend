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
// Vercel 函數超時配置（Hobby 計劃是 10 秒，Pro 計劃是 60 秒）
// 如果處理時間過長，需要考慮優化或使用異步處理
export const maxDuration = 300; // 5 分鐘（Pro 計劃）

export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();
  
  try {
    console.log('🚀 [OCR API] 開始處理請求');
    
    // 验证图片上传
    const validation = await validateImageUpload(req);
    if (!validation.isValid) {
      return validation.response;
    }

    const imageFile = validation.file!;

    // 读取图片为 Buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageName = imageFile.name || 'image.jpg';
    console.log(`📸 [OCR API] 圖片大小: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // 执行 OCR 处理
    console.log('⏳ [OCR API] 開始 OCR 處理...');
    const result = await processImage(imageBuffer, imageName);
    const processingTime = (Date.now() - requestStartTime) / 1000;
    console.log(`⏱️ [OCR API] OCR 處理完成，耗時: ${processingTime.toFixed(2)} 秒`);

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
      // 確保所有欄位都是可序列化的（移除 undefined、null 等）
      const safeStringify = (value: any): string => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') return value;
        return String(value);
      };

      const responseData = {
        // 兼容舊的 upload_segment_ocr 格式
        message: 'OCR 辨識完成',
        result_text: safeStringify(finalText),
        text: safeStringify(finalText),
        ocr_text: safeStringify(finalText),

        // 保留完整的詳細資料供未來使用
        success: true,
        data: {
          original_ocr: {
            success: result.original_ocr.success || false,
            text: safeStringify(result.original_ocr.text),
            text_length: result.original_ocr.text_length || 0,
            ocr_time: result.original_ocr.ocr_time || 0,
            finish_reason: safeStringify(result.original_ocr.finish_reason),
            error: safeStringify(result.original_ocr.error),
          },
          binary_ocr: {
            success: result.binary_ocr.success || false,
            text: safeStringify(result.binary_ocr.text),
            text_length: result.binary_ocr.text_length || 0,
            ocr_time: result.binary_ocr.ocr_time || 0,
            finish_reason: safeStringify(result.binary_ocr.finish_reason),
            error: safeStringify(result.binary_ocr.error),
          },
          optimized: {
            success: result.cross_compare.success || false,
            text: safeStringify(result.cross_compare.text),
            text_length: result.cross_compare.text_length || 0,
            compare_time: result.cross_compare.compare_time || 0,
            finish_reason: safeStringify(result.cross_compare.finish_reason),
            error: safeStringify(result.cross_compare.error),
          },
          total_time: result.total_time || 0,
          load_time: result.load_time || 0,
          binarize_time: result.binarize_time || 0,
        },
      };

      // 測試 JSON 序列化（檢查是否有無法序列化的數據）
      let responseSize = 0;
      try {
        const testString = JSON.stringify(responseData);
        responseSize = testString.length;
        console.log('✅ JSON 序列化測試成功');
      } catch (serializeError: any) {
        console.error('❌ JSON 序列化失敗:', serializeError.message);
        throw new Error(`無法序列化回應資料: ${serializeError.message}`);
      }

      console.log('✅ 構建回應資料成功');
      console.log(`   - Final Text 長度: ${finalText.length}`);
      console.log(`   - Response Data 大小: ${(responseSize / 1024 / 1024).toFixed(2)} MB (${responseSize} bytes)`);
      
      if (responseSize > 4 * 1024 * 1024) {
        console.warn('⚠️ 回應資料過大，可能超過 Vercel 限制 (4.5MB)');
        // 如果回應過大，只返回必要的資料
        const compactResponseData = {
          message: 'OCR 辨識完成',
          result_text: safeStringify(finalText),
          text: safeStringify(finalText),
          ocr_text: safeStringify(finalText),
          success: true,
          data: {
            optimized: {
              success: result.cross_compare.success || false,
              text: safeStringify(result.cross_compare.text),
              text_length: result.cross_compare.text_length || 0,
            },
            total_time: result.total_time || 0,
          },
        };
        const compactSize = JSON.stringify(compactResponseData).length;
        console.log(`   - 使用精簡回應，大小: ${(compactSize / 1024 / 1024).toFixed(2)} MB`);
        return NextResponse.json(
          compactResponseData,
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
            },
          }
        );
      }

      // 嘗試返回回應
      try {
        const responseStartTime = Date.now();
        console.log('📤 [OCR API] 準備返回回應...');
        
        // responseData 已經包含完整的結構，直接返回
        // 再次測試序列化
        try {
          JSON.stringify(responseData);
        } catch (finalSerializeError: any) {
          console.error('❌ 最終序列化測試失敗:', finalSerializeError.message);
          throw finalSerializeError;
        }
        
        const response = NextResponse.json(
          responseData,
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
            },
          }
        );
        
        const responseTime = (Date.now() - responseStartTime) / 1000;
        console.log(`✅ 成功創建 NextResponse (耗時: ${responseTime.toFixed(2)} 秒)`);
        console.log(`   - Status: ${response.status}`);
        
        const totalTime = (Date.now() - requestStartTime) / 1000;
        console.log(`🎉 [OCR API] 請求處理完成，總耗時: ${totalTime.toFixed(2)} 秒`);
        console.log('📤 [OCR API] 返回回應...');
        
        return response;
      } catch (responseError: any) {
        console.error('❌ 創建 NextResponse 失敗:', responseError.message);
        console.error('   錯誤堆疊:', responseError.stack);
        console.error('   錯誤詳情:', responseError);
        throw responseError;
      }
    } catch (buildError: any) {
      console.error('❌ 構建回應資料失敗:', buildError.message);
      console.error('   錯誤堆疊:', buildError.stack);
      console.error('   錯誤詳情:', buildError);
      return errorResponse(
        `構建回應資料失敗: ${buildError.message}`,
        undefined,
        { 
          finalTextLength: finalText.length,
          errorType: buildError.constructor.name,
        },
        500
      );
    }
  } catch (error: any) {
    const totalTime = (Date.now() - requestStartTime) / 1000;
    console.error('❌ [OCR API] 請求處理失敗');
    console.error(`   總耗時: ${totalTime.toFixed(2)} 秒`);
    console.error(`   錯誤訊息: ${error.message}`);
    console.error(`   錯誤類型: ${error.constructor.name}`);
    console.error(`   錯誤堆疊:`, error.stack);
    
    // 檢查是否為超時錯誤
    if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT') || totalTime > 250) {
      console.error('⚠️ 可能是函數超時錯誤');
      return errorResponse(
        'OCR 處理超時，請稍後再試或使用較小的圖片',
        'TIMEOUT',
        { processingTime: totalTime },
        504
      );
    }
    
    return errorResponse(
      `處理過程發生錯誤: ${error.message}`,
      undefined,
      { 
        processingTime: totalTime,
        errorType: error.constructor.name,
      },
      500
    );
  }
}

