import { NextRequest, NextResponse } from 'next/server';
import { validateImageUpload } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';

/**
 * POST /api/upload_segment_ocr_EffecientNet
 * 
 * 注意：此端点需要 Python 服务支持 PyTorch EfficientNet 模型
 * 建议保留 Python 微服务或使用替代方案
 */
export async function POST(req: NextRequest) {
  try {
    // 验证图片上传
    const validation = await validateImageUpload(req);
    if (!validation.isValid) {
      return validation.response;
    }

    const imageFile = validation.file!;
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // 检查是否有 Python OCR 服务 URL
    const PYTHON_OCR_SERVICE_URL = process.env.PYTHON_OCR_SERVICE_URL;

    if (!PYTHON_OCR_SERVICE_URL) {
      return errorResponse(
        'PyTorch OCR 服务未配置。请设置 PYTHON_OCR_SERVICE_URL 环境变量，或使用 /api/gemini_ocr 端点',
        undefined,
        undefined,
        503
      );
    }

    // 转发请求到 Python 服务
    try {
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: imageFile.type });
      formData.append('image', blob, imageFile.name);

      const response = await fetch(`${PYTHON_OCR_SERVICE_URL}/api/upload_segment_ocr_EffecientNet`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return errorResponse(
          `Python OCR 服务错误: ${response.status}`,
          undefined,
          { status_code: response.status, error: errorText },
          response.status
        );
      }

      const result = await response.json();
      return successResponse(result);
    } catch (fetchError: any) {
      return errorResponse(
        '无法连接到 Python OCR 服务',
        undefined,
        { detail: fetchError.message },
        502
      );
    }
  } catch (error: any) {
    console.error('Error in upload_segment_ocr_EffecientNet:', error);
    return errorResponse(error.message || '處理過程發生錯誤', undefined, undefined, 500);
  }
}

