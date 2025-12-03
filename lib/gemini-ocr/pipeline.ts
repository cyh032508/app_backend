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

  // 步驟 1: 讀取原始圖片
  console.log('📸 步驟 1: 讀取原始圖片...');
  let loadTime = 0;
  let originalData: Buffer;
  try {
    const loadStart = Date.now();
    originalData = await loadOriginalImage(imageBuffer);
    loadTime = (Date.now() - loadStart) / 1000;
    console.log(`✅ 原始圖片讀取完成 (耗時: ${loadTime.toFixed(2)} 秒)`);
  } catch (error: any) {
    console.error(`❌ 讀取原始圖片失敗: ${error.message}`);
    return {
      success: false,
      error: `讀取原始圖片失敗: ${error.message}`,
      image: imageName,
      original_ocr: { success: false, error: error.message },
      binary_ocr: { success: false, error: '未執行' },
      cross_compare: { success: false, error: '未執行' },
      load_time: 0,
      binarize_time: 0,
      total_time: 0,
    };
  }

  // 步驟 2: 二值化處理
  console.log('📸 步驟 2: 二值化處理...');
  let binarizeTime = 0;
  let binaryData: Buffer;
  try {
    const binarizeStart = Date.now();
    binaryData = await binarizeImage(imageBuffer);
    binarizeTime = (Date.now() - binarizeStart) / 1000;
    console.log(`✅ 二值化完成 (耗時: ${binarizeTime.toFixed(2)} 秒)`);
  } catch (error: any) {
    console.error(`❌ 二值化失敗: ${error.message}`);
    return {
      success: false,
      error: `二值化失敗: ${error.message}`,
      image: imageName,
      original_ocr: { success: false, error: '未執行' },
      binary_ocr: { success: false, error: error.message },
      cross_compare: { success: false, error: '未執行' },
      load_time: loadTime,
      binarize_time: 0,
      total_time: 0,
    };
  }

  // 步驟 3: 第一次 OCR - 原始圖片
  console.log('\n🤖 步驟 3: 第一次 OCR 辨識（原始圖片）...');
  const originalOCRResult = await performOCR(originalData, '原始圖片');

  if (originalOCRResult.success) {
    console.log(
      `✅ 原始圖片 OCR 完成 (耗時: ${originalOCRResult.ocr_time?.toFixed(2)} 秒)`
    );
    console.log(`📊 輸出長度: ${originalOCRResult.text_length} 字元`);
    if (originalOCRResult.finish_reason_str) {
      console.log(`📋 結束原因: ${originalOCRResult.finish_reason_str}`);
    }
  } else {
    console.error(
      `❌ 原始圖片 OCR 失敗: ${originalOCRResult.error || 'unknown error'}`
    );
  }

  // 步驟 4: 第二次 OCR - 二值化圖片
  console.log('\n🤖 步驟 4: 第二次 OCR 辨識（二值化圖片）...');
  const binaryOCRResult = await performOCR(binaryData, '二值化圖片');

  if (binaryOCRResult.success) {
    console.log(
      `✅ 二值化圖片 OCR 完成 (耗時: ${binaryOCRResult.ocr_time?.toFixed(2)} 秒)`
    );
    console.log(`📊 輸出長度: ${binaryOCRResult.text_length} 字元`);
    if (binaryOCRResult.finish_reason_str) {
      console.log(`📋 結束原因: ${binaryOCRResult.finish_reason_str}`);
    }
  } else {
    console.error(
      `❌ 二值化圖片 OCR 失敗: ${binaryOCRResult.error || 'unknown error'}`
    );
  }

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

