import { NextRequest, NextResponse } from 'next/server';
import { validateImageUpload } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';

/**
 * @swagger
 * /api/upload_segment_ocr:
 *   post:
 *     summary: 使用 ResNet 模型進行 OCR 識別
 *     description: 接收圖片檔案，先進行格線切割，再對切割後的每個格子圖片進行 OCR 辨識。注意：此端點需要 Python 服務支持 PyTorch 模型
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
 *                 description: 需上傳的圖片檔案（如掃描的作文稿紙）
 *     responses:
 *       200:
 *         description: 切割並辨識成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "操作成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "切割並辨識成功"
 *                     result_text:
 *                       type: string
 *                       example: "辨識後的文字結果字串"
 *       400:
 *         description: 請求錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: Python OCR 服務未配置
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

      const response = await fetch(`${PYTHON_OCR_SERVICE_URL}/api/upload_segment_ocr`, {
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
    console.error('Error in upload_segment_ocr:', error);
    return errorResponse(error.message || '處理過程發生錯誤', undefined, undefined, 500);
  }
}

