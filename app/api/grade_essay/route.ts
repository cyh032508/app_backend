import { NextRequest, NextResponse } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = process.env.GEMINI_API_URL;

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 验证输入
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

    if (!API_KEY || !API_URL) {
      return errorResponse('API_KEY 或 API_URL 尚未設定或讀取失敗', undefined, undefined, 500);
    }

    // 评分的 prompt
    const prompt = `請根據以下評分標準，對這篇作文進行批改和評分。

作文題目：${topic}

評分標準：
${rubric}

作文內容：
${content}

請提供：
1. 總分（以 X/100 的格式呈現）
2. 整體評語
3. 優點（列出 2-3 個具體優點）
4. 改進建議（列出 2-3 個具體建議）

請以 JSON 格式回應，格式如下：
{
  "score": "85/100",
  "feedback": "整體評語...",
  "strengths": ["優點1", "優點2", "優點3"],
  "improvements": ["建議1", "建議2", "建議3"]
}
`;

    // 呼叫 Gemini API
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      return errorResponse(
        `上游服務回傳錯誤: ${response.status}`,
        undefined,
        { status_code: response.status, upstream: errorText },
        response.status
      );
    }

    const result = await response.json();

    // 根據官方格式，取 candidates 裡第一筆的 content 物件內的 parts 第一筆的 text
    let gradeText: string | null = null;
    const candidates = result.candidates;
    if (candidates && candidates.length > 0) {
      const contentObj = candidates[0].content;
      if (contentObj) {
        const parts = contentObj.parts;
        if (parts && parts.length > 0) {
          gradeText = parts[0].text;
        }
      }
    }

    if (!gradeText) {
      return errorResponse('無法取得評分結果', undefined, undefined, 500);
    }

    // 嘗試解析 JSON 格式的回應
    try {
      // 移除可能的 markdown 代碼塊標記
      const cleanedText = gradeText.replace(/```json\s*|\s*```/g, '').trim();
      const gradeData = JSON.parse(cleanedText);

      return successResponse({
        score: gradeData.score || 'N/A',
        feedback: gradeData.feedback || '',
        strengths: gradeData.strengths || [],
        improvements: gradeData.improvements || [],
      });
    } catch (parseError) {
      // 如果無法解析 JSON，返回純文字結果
      return successResponse({
        score: 'N/A',
        feedback: gradeText,
        strengths: [],
        improvements: [],
      });
    }
  } catch (error: any) {
    console.error('Error in grade_essay:', error);
    return errorResponse(error.message || '處理過程發生錯誤', undefined, undefined, 500);
  }
}

