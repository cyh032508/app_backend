import { NextRequest, NextResponse } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = process.env.GEMINI_API_URL;

/**
 * @swagger
 * /api/refine_ocr_text:
 *   post:
 *     summary: 優化 OCR 識別結果
 *     description: 使用 Gemini AI 改善從圖片辨識出來的文字，使其更通順、符合語意但不改變原本內容意思
 *     tags: [Text Processing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: 需要優化的 OCR 識別文字
 *                 example: "這是一段從圖片識別出來的文字，可能有一些錯誤..."
 *     responses:
 *       200:
 *         description: 優化成功
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
 *                     refined_text:
 *                       type: string
 *                       example: "優化後的文字內容..."
 *       400:
 *         description: 請求錯誤
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
    const data = await req.json();

    const validation = validateJsonFields(data, ['text']);
    if (!validation.isValid) {
      return validation.response;
    }

    const originalText = data.text.trim();
    if (!originalText) {
      return errorResponse('text 內容為空', undefined, undefined, 400);
    }

    if (!API_KEY || !API_URL) {
      return errorResponse('API_KEY 或 API_URL 尚未設定或讀取失敗', undefined, undefined, 500);
    }

    const prompt = `請協助我改善以下從圖片辨識出來的文字，使其更通順、符合語意但不改變原本內容意思。
請僅回傳修正後的段落，不需要解釋與格式說明。若這不是有效的文字，無法進行修正，請回傳原始文字。

原始文字：
${originalText}
`;

    // 呼叫 Gemini API（加入逾時與溫和錯誤處理，避免中斷連線）
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 非 2xx：直接轉拋上游訊息與狀態碼（例如 429 配額用盡）
      if (!response.ok) {
        let errBody: any;
        try {
          errBody = await response.json();
        } catch {
          const text = await response.text();
          errBody = { message: text.substring(0, 500) };
        }
        return errorResponse(
          '上游服務回傳錯誤',
          undefined,
          {
            status_code: response.status,
            upstream: errBody,
          },
          response.status
        );
      }

      const result = await response.json();

      // 根據官方格式，取 candidates 裡第一筆的 content 物件內的 parts 第一筆的 text
      let refinedText: string | null = null;
      const candidates = result.candidates;
      if (candidates && candidates.length > 0) {
        const content = candidates[0].content;
        if (content) {
          const parts = content.parts;
          if (parts && parts.length > 0) {
            refinedText = parts[0].text;
          }
        }
      }

      if (!refinedText) {
        return errorResponse('無法取得回傳的 refined_text', undefined, undefined, 500);
      }

      return successResponse({ refined_text: refinedText.trim() });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return errorResponse('請求超時', undefined, undefined, 504);
      }
      return errorResponse('上游服務連線失敗', undefined, { detail: fetchError.message }, 502);
    }
  } catch (error: any) {
    console.error('Error in refine_ocr_text:', error);
    return errorResponse(error.message || '處理過程發生錯誤', undefined, undefined, 500);
  }
}

