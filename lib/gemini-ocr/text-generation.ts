/**
 * Gemini 文本生成工具
 * 用于生成文本内容（如评分标准）
 */

// 抑制 deprecation warnings（在導入 VertexAI 之前）
import '@/lib/utils/suppress-warnings';

import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { VERTEX_AI_CONFIG } from '@/lib/config/vertex-ai';

// 初始化 Vertex AI
const PROJECT_ID = process.env.PROJECT_ID || VERTEX_AI_CONFIG.projectId;
const LOCATION = VERTEX_AI_CONFIG.location;
const MODEL_NAME = VERTEX_AI_CONFIG.model;

let vertexAI: VertexAI | null = null;
let model: any = null;

function initializeVertexAI() {
  if (!vertexAI) {
    // 在 Vercel/serverless 環境中，使用服務帳號憑證
    // 構建 VertexAI 配置（使用環境變數或配置）
    const vertexAIConfig: any = {
      project: PROJECT_ID,
      location: LOCATION,
    };

    // 調試：檢查環境變數
    console.log('🔍 [Text Generation - Vertex AI 認證] 檢查環境變數...');
    console.log('  - GOOGLE_APPLICATION_CREDENTIALS_JSON:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? `已設置 (長度: ${process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length})` : '❌ 未設置');
    console.log('  - CLIENT_EMAIL:', process.env.CLIENT_EMAIL ? '已設置' : '❌ 未設置');
    console.log('  - PRIVATE_KEY:', process.env.PRIVATE_KEY ? '已設置' : '❌ 未設置');
    console.log('  - PROJECT_ID:', PROJECT_ID);

    // 方式 1: 完整的 JSON 字串（推薦，但 Vercel 環境變數有大小限制）
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

        // 驗證必要的欄位
        if (!credentials.type || !credentials.project_id || !credentials.private_key || !credentials.client_email) {
          console.error('❌ 服務帳號憑證缺少必要欄位');
          throw new Error('服務帳號憑證缺少必要欄位');
        }

        // 這是修復 500 錯誤的關鍵：確保正確處理 private_key 的換行符號
        const privateKey = credentials.private_key.replace(/\\n/g, '\n');

        // 使用 googleAuthOptions 來設置認證（這是正確的方式）
        vertexAIConfig.googleAuthOptions = {
          credentials: {
            client_email: credentials.client_email,
            private_key: privateKey, // 使用處理過的 key
          },
        };

        console.log('✅ 使用 GOOGLE_APPLICATION_CREDENTIALS_JSON 進行 Vertex AI 認證');
        console.log(`   - Project ID: ${credentials.project_id}`);
        // 安全：不輸出 Client Email（敏感信息）
        console.log(`   - Private Key 長度: ${privateKey.length}`);
      } catch (error: any) {
        console.error('❌ 無法解析 GOOGLE_APPLICATION_CREDENTIALS_JSON:', error.message);
        throw new Error(`服務帳號憑證格式錯誤: ${error.message}`);
      }
    }
    // 方式 2: 拆分環境變數（適合 Vercel，避免環境變數大小限制）
    else if (process.env.CLIENT_EMAIL && process.env.PRIVATE_KEY) {
      try {
        // 這是修復 500 錯誤的關鍵：確保正確處理 private_key 的換行符號
        const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');

        if (!privateKey) {
          throw new Error('PRIVATE_KEY 環境變數為空');
        }

        vertexAIConfig.googleAuthOptions = {
          credentials: {
            client_email: process.env.CLIENT_EMAIL,
            private_key: privateKey, // 使用處理過的 key
          },
        };

        console.log('✅ 使用拆分環境變數 (CLIENT_EMAIL + PRIVATE_KEY) 進行 Vertex AI 認證');
        // 安全：不輸出 Client Email（敏感信息）
        console.log(`   - Private Key 長度: ${privateKey.length}`);
      } catch (error: any) {
        console.error('❌ 無法設置拆分環境變數認證:', error.message);
        throw new Error(`拆分環境變數認證錯誤: ${error.message}`);
      }
    }
    // 方式 3: 使用憑證文件路徑（本地開發環境）
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('✅ 使用 GOOGLE_APPLICATION_CREDENTIALS 文件進行認證');
    }
    // 方式 4: 嘗試使用默認認證（本地開發環境的 gcloud auth）
    else {
      console.warn('⚠️ 未找到認證憑證，嘗試使用默認認證（僅適用於本地開發環境）');
      console.warn('⚠️ 在 Vercel 環境中，必須設置以下之一：');
      console.warn('   1. GOOGLE_APPLICATION_CREDENTIALS_JSON (完整 JSON)');
      console.warn('   2. CLIENT_EMAIL + PRIVATE_KEY (拆分環境變數)');
    }

    // 調試：輸出配置（不包含敏感信息）
    console.log('🔧 [Text Generation - Vertex AI] 初始化配置:');
    console.log(`   - Project: ${vertexAIConfig.project}`);
    console.log(`   - Location: ${vertexAIConfig.location}`);
    console.log(`   - Has googleAuthOptions: ${!!vertexAIConfig.googleAuthOptions}`);

    try {
      vertexAI = new VertexAI(vertexAIConfig);
      console.log('✅ VertexAI 初始化成功 (Text Generation)');
    } catch (error: any) {
      console.error('❌ VertexAI 初始化失敗 (Text Generation):', error.message);
      throw error;
    }
    model = vertexAI.preview.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        maxOutputTokens: 65535, // Gemini 2.5 Pro 最大輸出限制
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
 * @param maxOutputTokens 最大輸出 tokens（可選，默認 65535 = Gemini 2.5 Pro 最大值）
 * @returns 生成的文本结果
 */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7,
  maxOutputTokens: number = 65535
): Promise<TextGenerationResult> {
  try {
    const model = initializeVertexAI();

    // 组合系统提示词和用户提示词
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    console.log(`🔧 [Text Generation] 配置：temperature=${temperature}, maxOutputTokens=${maxOutputTokens}`);

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
        maxOutputTokens: Math.min(maxOutputTokens, 65535), // Gemini 2.5 Pro 最大值
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

/**
 * 根據題目生成評分標準
 * @param topic 作文題目
 * @returns 生成的評分標準
 */
export async function generateRubric(topic: string): Promise<TextGenerationResult> {
  try {
    // 動態導入以避免循環依賴
    const { getGradingExpertSystemPrompt } = await import('@/lib/prompts/system-prompts');

    const systemPrompt = getGradingExpertSystemPrompt();
    const userPrompt = `請為以下題目制定詳細的評分標準：\n\n題目: ${topic}`;

    return await generateText(systemPrompt, userPrompt, 0.7);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

