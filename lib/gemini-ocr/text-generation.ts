/**
 * Gemini 文本生成工具
 * 用于生成文本内容（如评分标准）
 */

import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { VERTEX_AI_CONFIG } from '@/lib/config/vertex-ai';

// 初始化 Vertex AI
const PROJECT_ID = VERTEX_AI_CONFIG.projectId;
const LOCATION = VERTEX_AI_CONFIG.location;
const MODEL_NAME = VERTEX_AI_CONFIG.model;

let vertexAI: VertexAI | null = null;
let model: any = null;

function initializeVertexAI() {
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION,
    });
    model = vertexAI.preview.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7, // 对于文本生成，使用稍高的温度
        topP: 0.9,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
  }
  return model;
}

export interface TextGenerationResult {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * 使用 Gemini 生成文本
 * @param systemPrompt 系统提示词
 * @param userPrompt 用户提示词
 * @param temperature 温度参数（可选，默认 0.7）
 * @returns 生成的文本结果
 */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
): Promise<TextGenerationResult> {
  try {
    const model = initializeVertexAI();

    // 组合系统提示词和用户提示词
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // 发送请求
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature,
        topP: 0.9,
      },
    });

    // 获取生成结果
    const response = result.response;
    const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!generatedText) {
      return {
        success: false,
        error: '無法取得生成的文本',
      };
    }

    return {
      success: true,
      text: generatedText,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

