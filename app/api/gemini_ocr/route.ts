import { NextRequest, NextResponse } from 'next/server';
import { validateImageUpload } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { processImage } from '@/lib/gemini-ocr/pipeline';

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
    if (result.cross_compare.success && result.cross_compare.text) {
      finalText = result.cross_compare.text;
    } else if (result.original_ocr.success && result.original_ocr.text) {
      finalText = result.original_ocr.text;
    } else if (result.binary_ocr.success && result.binary_ocr.text) {
      finalText = result.binary_ocr.text;
    }

    // 構建回應資料（兼容舊格式）
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

    return successResponse(responseData, 'OCR 辨識完成');
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

