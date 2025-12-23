/**
 * OCR 測試腳本 (TypeScript 版本)
 *
 * 功能：
 * 1. 讀取 testindata 資料夾內的所有子資料夾
 * 2. 對每個子資料夾，辨識第一個圖片檔案
 * 3. 將辨識結果存成 txt 檔案到 ocr_results 資料夾
 *
 * 使用方法：
 * npx tsx test-ocr.ts
 * 或指定 API URL：
 * npx tsx test-ocr.ts http://localhost:3000
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';

// 設定
const TESTDATA_DIR = './testindata';
const RESULTS_DIR = './ocr_results';
const API_BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_ENDPOINT = `${API_BASE_URL}/api/gemini_ocr`;

// 支援的圖片格式
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp'];

interface OCRResult {
  success?: boolean;
  message?: string;
  result_text?: string;
  text?: string;
  ocr_text?: string;
  data?: {
    original_ocr?: {
      success: boolean;
      text: string;
      text_length: number;
      ocr_time: number;
      finish_reason: string;
    };
    binary_ocr?: {
      success: boolean;
      text: string;
      text_length: number;
      ocr_time: number;
      finish_reason: string;
    };
    optimized?: {
      success: boolean;
      text: string;
      text_length: number;
      compare_time: number;
      finish_reason: string;
    };
    total_time?: number;
    load_time?: number;
    binarize_time?: number;
  };
}

interface Stats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  startTime: number;
}

/**
 * 確保目錄存在
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`✓ 創建資料夾：${dirPath}`);
  }
}

/**
 * 獲取資料夾內的第一個圖片檔案
 */
async function getFirstImageFile(dirPath: string): Promise<string | null> {
  const files = await fs.readdir(dirPath);

  // 過濾出圖片檔案並排序
  const imageFiles = files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    })
    .sort(); // 字母順序排序

  if (imageFiles.length === 0) {
    return null;
  }

  return path.join(dirPath, imageFiles[0]);
}

/**
 * 調用 OCR API 進行辨識
 */
async function performOCR(imagePath: string): Promise<OCRResult> {
  // 使用動態 import 來載入 FormData (Node.js 18+)
  const FormData = (await import('formdata-node')).FormData;
  const { fileFromPath } = await import('formdata-node/file-from-path');

  const formData = new FormData();
  const file = await fileFromPath(imagePath);
  formData.append('image', file);

  console.log(`  → 調用 API: ${API_ENDPOINT}`);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    body: formData as any,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 錯誤 (${response.status}): ${errorText}`);
  }

  const result: OCRResult = await response.json();
  return result;
}

/**
 * 儲存辨識結果到 txt 檔案
 */
async function saveResult(
  folderName: string,
  imageName: string,
  ocrResult: OCRResult
): Promise<string> {
  const txtFileName = `${folderName}_${path.parse(imageName).name}.txt`;
  const txtFilePath = path.join(RESULTS_DIR, txtFileName);

  // 準備輸出內容
  let content = '';
  content += '='.repeat(80) + '\n';
  content += `OCR 辨識結果\n`;
  content += '='.repeat(80) + '\n';
  content += `資料夾：${folderName}\n`;
  content += `檔案：${imageName}\n`;
  content += `時間：${new Date().toLocaleString('zh-TW')}\n`;
  content += '='.repeat(80) + '\n\n';

  // 辨識文字
  const resultText = ocrResult.result_text || ocrResult.text || ocrResult.ocr_text || '';
  content += '【辨識文字】\n';
  content += resultText + '\n\n';

  // 詳細資訊（如果有）
  if (ocrResult.data) {
    content += '='.repeat(80) + '\n';
    content += '【詳細資訊】\n';
    content += '='.repeat(80) + '\n';

    if (ocrResult.data.original_ocr) {
      content += `\n原始 OCR 耗時: ${ocrResult.data.original_ocr.ocr_time?.toFixed(2)}s\n`;
      content += `文字長度: ${ocrResult.data.original_ocr.text_length} 字\n`;
    }

    if (ocrResult.data.binary_ocr) {
      content += `\n二值化 OCR 耗時: ${ocrResult.data.binary_ocr.ocr_time?.toFixed(2)}s\n`;
      content += `文字長度: ${ocrResult.data.binary_ocr.text_length} 字\n`;
    }

    if (ocrResult.data.optimized) {
      content += `\n交叉比對耗時: ${ocrResult.data.optimized.compare_time?.toFixed(2)}s\n`;
      content += `優化後長度: ${ocrResult.data.optimized.text_length} 字\n`;
    }

    if (ocrResult.data.total_time) {
      content += `\n總處理時間: ${ocrResult.data.total_time?.toFixed(2)}s\n`;
    }
  }

  // 儲存檔案
  await fs.writeFile(txtFilePath, content, 'utf8');
  console.log(`  ✓ 儲存結果：${txtFilePath}`);

  return txtFilePath;
}

/**
 * 主函數
 */
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('OCR 批次測試腳本');
  console.log('='.repeat(80));
  console.log(`測試資料夾：${TESTDATA_DIR}`);
  console.log(`結果資料夾：${RESULTS_DIR}`);
  console.log(`API 端點：${API_ENDPOINT}`);
  console.log('='.repeat(80) + '\n');

  // 確保結果資料夾存在
  await ensureDir(RESULTS_DIR);

  // 讀取所有子資料夾
  const entries = await fs.readdir(TESTDATA_DIR, { withFileTypes: true });
  const folders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => {
      // 數字排序
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

  console.log(`找到 ${folders.length} 個資料夾\n`);

  // 統計資料
  const stats: Stats = {
    total: folders.length,
    success: 0,
    failed: 0,
    skipped: 0,
    startTime: Date.now(),
  };

  // 處理每個資料夾
  for (let i = 0; i < folders.length; i++) {
    const folderName = folders[i];
    const folderPath = path.join(TESTDATA_DIR, folderName);

    console.log(`[${i + 1}/${folders.length}] 處理資料夾：${folderName}`);

    try {
      // 取得第一個圖片檔案
      const firstImagePath = await getFirstImageFile(folderPath);

      if (!firstImagePath) {
        console.log(`  ⚠ 找不到圖片檔案，跳過\n`);
        stats.skipped++;
        continue;
      }

      const imageName = path.basename(firstImagePath);
      console.log(`  → 圖片檔案：${imageName}`);

      // 執行 OCR
      console.log(`  → 開始辨識...`);
      const ocrResult = await performOCR(firstImagePath);

      // 儲存結果
      await saveResult(folderName, imageName, ocrResult);

      stats.success++;
      console.log(`  ✓ 完成\n`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ 錯誤：${errorMessage}\n`);
      stats.failed++;
    }
  }

  // 顯示統計結果
  const elapsedTime = ((Date.now() - stats.startTime) / 1000).toFixed(2);

  console.log('='.repeat(80));
  console.log('測試完成');
  console.log('='.repeat(80));
  console.log(`總資料夾數：${stats.total}`);
  console.log(`成功辨識：${stats.success}`);
  console.log(`失敗：${stats.failed}`);
  console.log(`跳過：${stats.skipped}`);
  console.log(`總耗時：${elapsedTime}s`);
  console.log('='.repeat(80) + '\n');

  if (stats.success > 0) {
    console.log(`✓ 所有結果已儲存至：${RESULTS_DIR}\n`);
  }
}

// 執行主函數
main().catch(error => {
  console.error('\n✗ 執行錯誤：', error);
  process.exit(1);
});
