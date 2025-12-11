import { NextRequest, NextResponse } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { generateText } from '@/lib/gemini-ocr/text-generation';
import {
  getFiveDimensionFeedbackPrompt,
  getFiveDimensionFeedbackUserPrompt,
} from '@/lib/prompts/feedback-prompts';

/**
 * @swagger
 * /api/feedback_essay:
 *   post:
 *     summary: 針對作文進行五維度評語分析
 *     description: 使用 Gemini AI 針對立意取材、表達與文采、組織結構、格式及錯別字、綜合表現五個維度撰寫詳細評語
 *     tags: [Grading]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *               - content
 *               - rubric
 *             properties:
 *               topic:
 *                 type: string
 *                 description: 作文題目
 *                 example: "我的夢想"
 *               content:
 *                 type: string
 *                 description: 作文內容
 *                 example: "我的夢想是成為一名醫生..."
 *               rubric:
 *                 type: string
 *                 description: 評分標準
 *                 example: "評分標準：內容 40%，結構 30%，語言 30%"
 *     responses:
 *       200:
 *         description: 評語生成成功
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
 *                     feedbacks:
 *                       type: object
 *                       properties:
 *                         ideaAndMaterial:
 *                           type: string
 *                           example: "立意取材的評語..."
 *                         expressionAndStyle:
 *                           type: string
 *                           example: "表達與文采的評語..."
 *                         organization:
 *                           type: string
 *                           example: "組織結構的評語..."
 *                         formatAndTypos:
 *                           type: string
 *                           example: "格式及錯別字的評語..."
 *                         overallPerformance:
 *                           type: string
 *                           example: "綜合表現的評語..."
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

    // 驗證輸入
    const validation = validateJsonFields(data, ['topic', 'content', 'rubric']);
    if (!validation.isValid) {
      return validation.response;
    }

    const topic = data.topic.trim();
    const content = data.content.trim();
    const rubric = data.rubric.trim();

    if (!topic || !content || !rubric) {
      return errorResponse('topic、content 或 rubric 內容為空', undefined, undefined, 400);
    }

    console.log('🔍 [Feedback Essay] 開始生成五維度評語');
    console.log(`   - 題目: ${topic.substring(0, 30)}...`);
    console.log(`   - 內容長度: ${content.length} 字`);

    // 生成系統提示詞和用戶提示詞
    const systemPrompt = getFiveDimensionFeedbackPrompt();
    const userPrompt = getFiveDimensionFeedbackUserPrompt(topic, rubric, content);

    // 調用 AI 生成五維度評語
    const result = await generateText(systemPrompt, userPrompt, 0.3);

    if (!result.success || !result.text) {
      console.error('❌ [Feedback Essay] AI 調用失敗:', result.error);
      return errorResponse(
        result.error || '無法生成評語',
        undefined,
        undefined,
        500
      );
    }

    const feedbackText = result.text;
    console.log('✅ [Feedback Essay] AI 響應成功');

    // 解析 JSON 格式的回應
    try {
      // 使用正則表達式提取 JSON 部分
      const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : feedbackText;

      const feedbackData = JSON.parse(jsonString);

      // 驗證必要欄位
      const requiredFields = [
        'ideaAndMaterial',
        'expressionAndStyle',
        'organization',
        'formatAndTypos',
        'overallPerformance',
      ];

      const missingFields = requiredFields.filter((field) => !feedbackData[field]);
      if (missingFields.length > 0) {
        console.error('❌ [Feedback Essay] 缺少必要欄位:', missingFields);
        return errorResponse(
          `AI 返回的評語缺少必要欄位: ${missingFields.join(', ')}`,
          undefined,
          undefined,
          500
        );
      }

      console.log('✅ [Feedback Essay] 評語生成完成');
      console.log(`   - 立意取材: ${feedbackData.ideaAndMaterial.substring(0, 30)}...`);
      console.log(`   - 表達與文采: ${feedbackData.expressionAndStyle.substring(0, 30)}...`);
      console.log(`   - 組織結構: ${feedbackData.organization.substring(0, 30)}...`);
      console.log(`   - 格式及錯別字: ${feedbackData.formatAndTypos.substring(0, 30)}...`);
      console.log(`   - 綜合表現: ${feedbackData.overallPerformance.substring(0, 30)}...`);

      return successResponse({
        feedbacks: {
          ideaAndMaterial: feedbackData.ideaAndMaterial,
          expressionAndStyle: feedbackData.expressionAndStyle,
          organization: feedbackData.organization,
          formatAndTypos: feedbackData.formatAndTypos,
          overallPerformance: feedbackData.overallPerformance,
        },
      });
    } catch (parseError: any) {
      console.error('❌ [Feedback Essay] JSON 解析錯誤:', parseError.message);
      console.log('原始回應:', feedbackText);

      return errorResponse(
        'AI 返回的評語格式錯誤，無法解析',
        undefined,
        undefined,
        500
      );
    }
  } catch (error: any) {
    console.error('❌ [Feedback Essay] 處理錯誤:', error.message);
    return errorResponse(error.message || '處理過程發生錯誤', undefined, undefined, 500);
  }
}
