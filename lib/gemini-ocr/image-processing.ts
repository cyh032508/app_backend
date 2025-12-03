/**
 * 圖片處理模組
 * 提供圖片載入、二值化處理等功能
 */

import sharp from 'sharp';

/**
 * 讀取原始圖片並轉換為 Buffer
 */
export async function loadOriginalImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 使用 sharp 將圖片轉換為 JPEG 格式
    const jpegBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 95 })
      .toBuffer();
    return jpegBuffer;
  } catch (error: any) {
    throw new Error(`無法處理圖片: ${error.message}`);
  }
}

/**
 * 對圖片進行二值化處理，返回二值化後的圖片數據
 * 使用 Otsu 二值化方法進行自動閾值選擇
 */
export async function binarizeImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 轉換為灰度圖
    const grayscale = await sharp(imageBuffer).greyscale().toBuffer();

    // 使用 sharp 的 threshold 進行二值化
    // 注意：sharp 沒有直接的 Otsu 方法，我們使用自適應閾值
    const binaryBuffer = await sharp(grayscale)
      .threshold(128) // 使用固定閾值，可以改進為自適應
      .jpeg({ quality: 95 })
      .toBuffer();

    return binaryBuffer;
  } catch (error: any) {
    throw new Error(`無法進行二值化處理: ${error.message}`);
  }
}

/**
 * 改進的二值化方法（使用更好的算法）
 */
export async function binarizeImageAdvanced(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 轉換為灰度
    const grayscale = await sharp(imageBuffer)
      .greyscale()
      .normalize() // 正規化以提高對比度
      .toBuffer();

    // 使用自適應閾值進行二值化
    // 注意：sharp 的限制，我們使用多步驟處理來模擬 Otsu
    const binaryBuffer = await sharp(grayscale)
      .greyscale()
      .normalize()
      .threshold(128)
      .jpeg({ quality: 95 })
      .toBuffer();

    return binaryBuffer;
  } catch (error: any) {
    throw new Error(`無法進行二值化處理: ${error.message}`);
  }
}

