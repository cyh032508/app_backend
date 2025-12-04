import { NextRequest, NextResponse } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = process.env.GEMINI_API_URL;

/**
 * @swagger
 * /api/grade_essay:
 *   post:
 *     summary: 根據評分標準對作文進行評分
 *     description: 使用 Gemini AI 根據提供的評分標準對作文進行批改和評分
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
 *         description: 評分成功
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
 *                     score:
 *                       type: string
 *                       example: "85/100"
 *                     feedback:
 *                       type: string
 *                       example: "整體評語..."
 *                     strengths:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["優點1", "優點2", "優點3"]
 *                     improvements:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["建議1", "建議2", "建議3"]
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

請嚴格遵守以下規則：
1. 如果作文內容與題目完全無關（文不對題），請直接給予 0-25 分，並在「整體評語」中說明原因。
2. 請務必以純 JSON 格式回應，不要包含任何 Markdown 標記（如 \`\`\`json ... \`\`\`）或額外的文字說明。
3. JSON 必須包含以下欄位：
   - score: 總分（格式為 "X/25"）
   - feedback: 整體評語
   - strengths: 優點列表（字串陣列）
   - improvements: 改進建議列表（字串陣列）

範例格式：
{
  "score": "85/100",
  "feedback": "...",
  "strengths": ["優點1", "優點2"],
  "improvements": ["建議1", "建議2"]
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
      // 使用正則表達式提取 JSON 部分，以防 AI 回傳了額外的文字
      const jsonMatch = gradeText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : gradeText;

      const gradeData = JSON.parse(jsonString);

      return successResponse({
        score: gradeData.score || 'N/A',
        feedback: gradeData.feedback || '',
        strengths: gradeData.strengths || [],
        improvements: gradeData.improvements || [],
      });
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('Raw text:', gradeText);

      // 如果無法解析 JSON，嘗試手動提取分數（備用方案）
      const scoreMatch = gradeText.match(/score["']?\s*:\s*["']?(\d+\/100)["']?/i);
      const score = scoreMatch ? scoreMatch[1] : 'N/A';

      return successResponse({
        score: score,
        feedback: gradeText, // 如果解析失敗，將全文作為評語
        strengths: [],
        improvements: [],
      });
    }
  } catch (error: any) {
    console.error('Error in grade_essay:', error);
    return errorResponse(error.message || '處理過程發生錯誤', undefined, undefined, 500);
  }
}

