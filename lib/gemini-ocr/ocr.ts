/**
 * OCR 核心模組
 * 提供 OCR 辨識的核心功能
 */

import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { OCR_PROMPT, CROSS_COMPARE_PROMPT } from '@/lib/prompts/ocr-prompts';

// 初始化 Vertex AI
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tw-rd-pd-tim-chen';
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

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

