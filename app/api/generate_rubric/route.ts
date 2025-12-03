import { NextRequest, NextResponse } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { generateText } from '@/lib/gemini-ocr/text-generation';
import { getGradingExpertSystemPrompt } from '@/lib/prompts/system-prompts';

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

    // 使用 Gemini 生成评分标准
    const systemPrompt = getGradingExpertSystemPrompt();
    const userPrompt = `請為以下題目制定詳細的評分標準：\n\n題目: ${topic}`;

    // 呼叫 Gemini 模型
    const result = await generateText(systemPrompt, userPrompt, 0.7);

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

