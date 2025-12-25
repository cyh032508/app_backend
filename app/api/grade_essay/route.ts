import { NextRequest } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { generateText } from '@/lib/gemini-ocr/text-generation';
import {
    getDirectGradingSystemPrompt,
    getDirectGradingUserPrompt,
} from '@/lib/prompts/grading-prompts';

/**
 * @swagger
 * /api/grade_essay:
 *   post:
 *     summary: 使用 Prompt 直接對作文進行評分
 *     description: 根據提供的內容和評分標準，直接調用 AI 進行評分
 *     tags: [Grading]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - rubric
 *             properties:
 *               content:
 *                 type: string
 *                 description: 作文內容
 *               rubric:
 *                 type: string
 *                 description: 評分標準
 *     responses:
 *       200:
 *         description: 評分成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: string
 *                     feedback:
 *                       type: string
 *                     details:
 *                       type: object
 */
export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        // 驗證輸入
        const validation = validateJsonFields(data, ['content', 'rubric']);
        if (!validation.isValid) {
            return validation.response;
        }

        const content = data.content.trim();
        const rubric = data.rubric.trim();

        if (!content || !rubric) {
            return errorResponse('content 或 rubric 內容為空', undefined, undefined, 400);
        }

        console.log('🚀 [Direct Grading] 開始評分流程');
        console.log(`   - 內容長度: ${content.length} 字`);

        // 生成 Prompt
        const systemPrompt = getDirectGradingSystemPrompt();
        const userPrompt = getDirectGradingUserPrompt(content, rubric);

        // 調用 AI
        console.log('📝 調用 AI 進行評分...');
        const result = await generateText(systemPrompt, userPrompt, 0.3);

        if (!result.success || !result.text) {
            console.error('❌ 評分失敗:', result.error);
            return errorResponse(
                result.error || '無法完成評分',
                undefined,
                undefined,
                500
            );
        }

        // 解析結果
        try {
            // 提取 JSON 部分
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            let jsonString = jsonMatch ? jsonMatch[0] : result.text;

            // 清理 JSON
            jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            const gradingData = JSON.parse(jsonString);

            console.log('✅ 評分完成');
            console.log(`   - 分數: ${gradingData.score}`);

            return successResponse(gradingData);
        } catch (parseError: any) {
            console.error('❌ JSON 解析錯誤:', parseError.message);
            console.log('原始回應:', result.text);
            return errorResponse(
                'AI 返回的格式錯誤，無法解析',
                undefined,
                undefined,
                500
            );
        }
    } catch (error: any) {
        console.error('❌ [Direct Grading] 處理錯誤:', error.message);
        return errorResponse(error.message || '處理過程發生錯誤', undefined, undefined, 500);
    }
}
