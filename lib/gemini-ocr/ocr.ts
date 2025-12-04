/**
 * OCR 核心模組
 * 提供 OCR 辨識的核心功能
 */

import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { OCR_PROMPT, CROSS_COMPARE_PROMPT } from '@/lib/prompts/ocr-prompts';
import { VERTEX_AI_CONFIG } from '@/lib/config/vertex-ai';

// 初始化 Vertex AI
const PROJECT_ID = VERTEX_AI_CONFIG.projectId;
const LOCATION = VERTEX_AI_CONFIG.location;
const MODEL_NAME = VERTEX_AI_CONFIG.model;

let vertexAI: VertexAI | null = null;
let model: any = null;

function initializeVertexAI() {
  if (!vertexAI) {
    // 在 Vercel/serverless 環境中，使用服務帳號憑證
    // 構建 VertexAI 配置（使用環境變數或配置）
    const vertexAIConfig: any = {
      project: process.env.PROJECT_ID || PROJECT_ID,
      location: LOCATION,
    };

    // 調試：檢查環境變數
    console.log('🔍 [Vertex AI 認證] 檢查環境變數...');
    console.log('  - GOOGLE_APPLICATION_CREDENTIALS_JSON:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? `已設置 (長度: ${process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length})` : '❌ 未設置');
    console.log('  - CLIENT_EMAIL:', process.env.CLIENT_EMAIL ? '已設置' : '❌ 未設置');
    console.log('  - PRIVATE_KEY:', process.env.PRIVATE_KEY ? '已設置' : '❌ 未設置');
    console.log('  - GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? '已設置' : '未設置');
    console.log('  - GCP_PROJECT_ID:', PROJECT_ID);
    console.log('  - GCP_LOCATION:', LOCATION);

    // 方式 1: 完整的 JSON 字串（推薦，但 Vercel 環境變數有大小限制）
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        
        // 驗證必要的欄位
        if (!credentials.type || !credentials.project_id || !credentials.private_key || !credentials.client_email) {
          console.error('❌ 服務帳號憑證缺少必要欄位');
          console.error('  需要: type, project_id, private_key, client_email');
          throw new Error('服務帳號憑證缺少必要欄位');
        }
        
        // 這是修復 500 錯誤的關鍵：確保正確處理 private_key 的換行符號
        if (!credentials.private_key) {
          throw new Error('服務帳號憑證中缺少 private_key');
        }
        
        const privateKey = credentials.private_key.replace(/\\n/g, '\n');
        
        // 使用 googleAuthOptions 來設置認證（這是正確的方式）
        vertexAIConfig.googleAuthOptions = {
          credentials: {
            client_email: credentials.client_email,
            private_key: privateKey, // 使用處理過的 key
          },
        };
        
        // 調試：驗證 private_key 格式
        if (!privateKey.includes('BEGIN PRIVATE KEY')) {
          console.warn('⚠️ Private key 格式可能不正確，應該包含 "BEGIN PRIVATE KEY"');
        }
        
        console.log('✅ 使用 GOOGLE_APPLICATION_CREDENTIALS_JSON 進行 Vertex AI 認證');
        console.log(`   - Project ID: ${credentials.project_id}`);
        console.log(`   - Client Email: ${credentials.client_email}`);
        console.log(`   - Private Key 長度: ${privateKey.length}`);
      } catch (error: any) {
        console.error('❌ 無法解析 GOOGLE_APPLICATION_CREDENTIALS_JSON:', error.message);
        console.error('   錯誤詳情:', error);
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
        console.log(`   - Client Email: ${process.env.CLIENT_EMAIL}`);
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
    console.log('🔧 [Vertex AI] 初始化配置:');
    console.log(`   - Project: ${vertexAIConfig.project}`);
    console.log(`   - Location: ${vertexAIConfig.location}`);
    console.log(`   - Has googleAuthOptions: ${!!vertexAIConfig.googleAuthOptions}`);
    console.log(`   - Has credentials: ${!!vertexAIConfig.credentials}`);
    
    try {
      vertexAI = new VertexAI(vertexAIConfig);
      console.log('✅ VertexAI 初始化成功');
    } catch (error: any) {
      console.error('❌ VertexAI 初始化失敗:', error.message);
      console.error('   錯誤詳情:', error);
      throw error;
    }
    model = vertexAI.preview.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.0,
        topP: 0.1,
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

export interface OCRResult {
  success: boolean;
  text?: string;
  text_length?: number;
  ocr_time?: number;
  compare_time?: number; // 用于交叉比对的时间
  finish_reason?: string;
  finish_reason_str?: string;
  error?: string;
}

/**
 * 執行 OCR 辨識，返回結果字典
 */
export async function performOCR(
  imageBuffer: Buffer,
  imageType: string
): Promise<OCRResult> {
  const ocrStart = Date.now();
  try {
    const model = initializeVertexAI();

    // 將圖片轉換為 base64
    const base64Image = imageBuffer.toString('base64');

    // 發送請求
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              text: OCR_PROMPT,
            },
          ],
        },
      ],
    });

    const ocrTime = (Date.now() - ocrStart) / 1000;

    // 獲取辨識結果
    const response = result.response;
    const ocrText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 檢查 finish_reason
    let finishReason: string | undefined;
    let finishReasonStr: string | undefined;

    const candidate = response.candidates?.[0];
    if (candidate) {
      finishReason = candidate.finishReason;
      const finishReasonMap: Record<string, string> = {
        STOP: 'STOP (正常完成)',
        MAX_TOKENS: 'MAX_TOKENS',
        SAFETY: 'SAFETY',
        RECITATION: 'RECITATION',
      };
      finishReasonStr = finishReasonMap[finishReason || ''] || finishReason;

      if (finishReason === 'MAX_TOKENS') {
        console.warn(`⚠️  警告：${imageType} 辨識可能因達到最大 token 限制而被截斷`);
      }
    }

    return {
      success: true,
      text: ocrText,
      text_length: ocrText.length,
      ocr_time: ocrTime,
      finish_reason: finishReason,
      finish_reason_str: finishReasonStr,
    };
  } catch (error: any) {
    const ocrTime = (Date.now() - ocrStart) / 1000;
    return {
      success: false,
      error: error.message || String(error),
      ocr_time: ocrTime,
    };
  }
}

/**
 * 交叉比對兩份 OCR 辨識結果，產出優化後的最終結果
 */
export async function crossCompareTexts(
  textA: string,
  textB: string,
  sourceDescription: string = '交叉比對'
): Promise<OCRResult> {
  const compareStart = Date.now();

  // 如果其中一個文本為空，直接返回另一個
  if (!textA && !textB) {
    return {
      success: false,
      error: '兩份 OCR 結果均為空',
      compare_time: 0,
    };
  }

  if (!textA) {
    const compareTime = (Date.now() - compareStart) / 1000;
    return {
      success: true,
      text: textB,
      text_length: textB.length,
      compare_time: compareTime,
      finish_reason: 'SKIPPED_A_EMPTY',
      finish_reason_str: '版本 A 為空，直接使用版本 B',
    };
  }

  if (!textB) {
    const compareTime = (Date.now() - compareStart) / 1000;
    return {
      success: true,
      text: textA,
      text_length: textA.length,
      compare_time: compareTime,
      finish_reason: 'SKIPPED_B_EMPTY',
      finish_reason_str: '版本 B 為空，直接使用版本 A',
    };
  }

  try {
    const model = initializeVertexAI();

    // 構建比對 prompt
    const comparisonPrompt = `${CROSS_COMPARE_PROMPT}

---

## 待比對的兩份 OCR 結果：

### 版本 A（原始圖片辨識結果）：
${textA}

### 版本 B（二值化圖片辨識結果）：
${textB}

---

請開始進行交叉比對，輸出優化後的最終結果：
`;

    // 發送請求
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: comparisonPrompt,
            },
          ],
        },
      ],
    });

    const compareTime = (Date.now() - compareStart) / 1000;

    // 獲取優化結果
    const response = result.response;
    const optimizedText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 檢查 finish_reason
    let finishReason: string | undefined;
    let finishReasonStr: string | undefined;

    const candidate = response.candidates?.[0];
    if (candidate) {
      finishReason = candidate.finishReason;
      const finishReasonMap: Record<string, string> = {
        STOP: 'STOP (正常完成)',
        MAX_TOKENS: 'MAX_TOKENS',
        SAFETY: 'SAFETY',
        RECITATION: 'RECITATION',
      };
      finishReasonStr = finishReasonMap[finishReason || ''] || finishReason;

      if (finishReason === 'MAX_TOKENS') {
        console.warn(`⚠️  警告：${sourceDescription} 可能因達到最大 token 限制而被截斷`);
      }
    }

    return {
      success: true,
      text: optimizedText,
      text_length: optimizedText.length,
      compare_time: compareTime,
      finish_reason: finishReason,
      finish_reason_str: finishReasonStr,
    };
  } catch (error: any) {
    const compareTime = (Date.now() - compareStart) / 1000;
    return {
      success: false,
      error: error.message || String(error),
      compare_time: compareTime,
    };
  }
}

