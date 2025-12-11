/**
 * Pipeline 處理模組
 * 提供單張圖片處理的主要邏輯
 */

import { loadOriginalImage, binarizeImage } from './image-processing';
import { performOCR, crossCompareTexts, OCRResult } from './ocr';

export interface ProcessImageResult {
  success: boolean;
  image?: string;
  original_ocr: OCRResult;
  binary_ocr: OCRResult;
  cross_compare: OCRResult;
  load_time: number;
  binarize_time: number;
  total_time: number;
  error?: string;
}

/**
 * 處理單張圖片：原始圖片 OCR + 二值化圖片 OCR + 交叉比對優化
 */
export async function processImage(
  imageBuffer: Buffer,
  imageName: string = 'image'
): Promise<ProcessImageResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`處理圖片: ${imageName}`);
  console.log(`${'='.repeat(60)}`);

  const totalStartTime = Date.now();

  // 定義原始圖片處理流程
  const processOriginalTask = async () => {
    let loadTime = 0;
    let originalData: Buffer | null = null;
    let ocrResult: OCRResult = { success: false, error: '未執行' };

    try {
      console.log('📸 [流程 A] 開始讀取原始圖片...');
      const loadStart = Date.now();
      originalData = await loadOriginalImage(imageBuffer);
      loadTime = (Date.now() - loadStart) / 1000;
      console.log(`✅ [流程 A] 原始圖片讀取完成 (耗時: ${loadTime.toFixed(2)} 秒)`);

      console.log('🤖 [流程 A] 開始原始圖片 OCR 辨識...');
      ocrResult = await performOCR(originalData, '原始圖片');

      if (ocrResult.success) {
        console.log(`✅ [流程 A] 原始圖片 OCR 完成 (耗時: ${ocrResult.ocr_time?.toFixed(2)} 秒)`);
      } else {
        console.error(`❌ [流程 A] 原始圖片 OCR 失敗: ${ocrResult.error}`);
      }
    } catch (error: any) {
      console.error(`❌ [流程 A] 處理失敗: ${error.message}`);
      ocrResult = { success: false, error: `處理失敗: ${error.message}` };
    }

    return { loadTime, ocrResult };
  };

  // 定義二值化圖片處理流程
  const processBinaryTask = async () => {
    let binarizeTime = 0;
    let binaryData: Buffer | null = null;
    let ocrResult: OCRResult = { success: false, error: '未執行' };

    try {
      console.log('📸 [流程 B] 開始二值化處理...');
      const binarizeStart = Date.now();
      binaryData = await binarizeImage(imageBuffer);
      binarizeTime = (Date.now() - binarizeStart) / 1000;
      console.log(`✅ [流程 B] 二值化完成 (耗時: ${binarizeTime.toFixed(2)} 秒)`);

      console.log('🤖 [流程 B] 開始二值化圖片 OCR 辨識...');
      ocrResult = await performOCR(binaryData, '二值化圖片');

      if (ocrResult.success) {
        console.log(`✅ [流程 B] 二值化圖片 OCR 完成 (耗時: ${ocrResult.ocr_time?.toFixed(2)} 秒)`);
      } else {
        console.error(`❌ [流程 B] 二值化圖片 OCR 失敗: ${ocrResult.error}`);
      }
    } catch (error: any) {
      console.error(`❌ [流程 B] 處理失敗: ${error.message}`);
      ocrResult = { success: false, error: `處理失敗: ${error.message}` };
    }

    return { binarizeTime, ocrResult };
  };

  // 平行執行兩個流程
  console.log('🚀 啟動平行處理流程...');
  const [originalResult, binaryResult] = await Promise.all([
    processOriginalTask(),
    processBinaryTask()
  ]);

  const { loadTime, ocrResult: originalOCRResult } = originalResult;
  const { binarizeTime, ocrResult: binaryOCRResult } = binaryResult;

  // 步驟 5: 交叉比對優化
  console.log('\n🔍 步驟 5: 交叉比對兩份結果...');
  let crossCompareResult: OCRResult = { success: false };

  // 只有當兩次 OCR 都成功時才進行交叉比對
  if (originalOCRResult.success && binaryOCRResult.success) {
    crossCompareResult = await crossCompareTexts(
      originalOCRResult.text || '',
      binaryOCRResult.text || '',
      '交叉比對'
    );

    if (crossCompareResult.success) {
      console.log(
        `✅ 交叉比對完成 (耗時: ${crossCompareResult.compare_time?.toFixed(2)} 秒)`
      );
      console.log(`📊 優化結果長度: ${crossCompareResult.text_length} 字元`);
      if (crossCompareResult.finish_reason_str) {
        console.log(`📋 結束原因: ${crossCompareResult.finish_reason_str}`);
      }
    } else {
      console.error(
        `❌ 交叉比對失敗: ${crossCompareResult.error || 'unknown error'}`
      );
    }
  } else if (originalOCRResult.success || binaryOCRResult.success) {
    console.log('⚠️  跳過交叉比對（只有一次 OCR 成功）');
  } else {
    console.log('⚠️  跳過交叉比對（兩次 OCR 均失敗）');
  }

  const totalTime = (Date.now() - totalStartTime) / 1000;

  console.log(`\n⏱️  總耗時: ${totalTime.toFixed(2)} 秒`);
  console.log(`   - 讀取原始圖片: ${loadTime.toFixed(2)} 秒`);
  console.log(`   - 二值化: ${binarizeTime.toFixed(2)} 秒`);
  console.log(
    `   - 原始圖片 OCR: ${originalOCRResult.ocr_time?.toFixed(2) || 0} 秒`
  );
  console.log(
    `   - 二值化圖片 OCR: ${binaryOCRResult.ocr_time?.toFixed(2) || 0} 秒`
  );
  console.log(
    `   - 交叉比對: ${crossCompareResult.compare_time?.toFixed(2) || 0} 秒`
  );

  // 判斷整體成功與否（至少一次成功即視為成功）
  const overallSuccess =
    originalOCRResult.success || binaryOCRResult.success;

  return {
    success: overallSuccess,
    image: imageName,
    original_ocr: originalOCRResult,
    binary_ocr: binaryOCRResult,
    cross_compare: crossCompareResult,
    load_time: loadTime,
    binarize_time: binarizeTime,
    total_time: totalTime,
  };
}

