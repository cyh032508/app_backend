import { NextRequest, NextResponse } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { generateText } from '@/lib/gemini-ocr/text-generation';
import { getGradingExpertSystemPrompt } from '@/lib/prompts/system-prompts';

/**
 * @swagger
 * /api/generate_rubric:
 *   post:
 *     summary: 根據題目生成評分標準
 *     description: 使用 Gemini AI 根據作文題目自動生成詳細的評分標準
 *     tags: [Grading]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 description: 作文題目
 *                 example: "我的夢想"
 *     responses:
 *       200:
 *         description: 生成成功
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
 *                     rubric:
 *                       type: string
 *                       example: "評分標準：\nA+ (90-100分): ..."
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

    const validation = validateJsonFields(data, ['topic']);
    if (!validation.isValid) {
      return validation.response;
    }

    const topic = data.topic.trim();
    if (!topic) {
      return errorResponse('topic 內容為空', undefined, undefined, 400);
    }

    // 使用共用的 generateRubric 函數
    const { generateRubric } = await import('@/lib/gemini-ocr/text-generation');
    const result = await generateRubric(topic);

    if (!result.success || !result.text) {
      return errorResponse(
        result.error || '無法取得生成的評分標準',
        undefined,
        undefined,
        500
      );
    }

    // 保持與原本相同的回傳格式
    return successResponse({ rubric: result.text.trim() });
  } catch (error: any) {
    console.error('Error in generate_rubric:', error);
    return errorResponse(error.message || '處理過程發生錯誤', undefined, undefined, 500);
  }
}

