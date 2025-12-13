/**
 * Vercel Blob Storage 配置和工具函数
 * 用于上传图片到 Vercel Blob Storage
 */

import { put } from '@vercel/blob';

/**
 * 获取 BLOB_READ_WRITE_TOKEN 环境变量
 * @returns BLOB_READ_WRITE_TOKEN 值
 */
function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      '❌ 缺少必需的环境变量: BLOB_READ_WRITE_TOKEN\n' +
      '   请在 .env 文件中设置 BLOB_READ_WRITE_TOKEN\n' +
      '   获取方式: Vercel Dashboard → Settings → Environment Variables'
    );
  }
  return token;
}

/**
 * 上传图片到 Vercel Blob Storage
 * @param fileBuffer 图片文件的 Buffer
 * @param fileName 文件名（包含扩展名）
 * @param userId 用户 ID（可选，用于组织文件）
 * @returns 公开访问的 URL
 */
export async function uploadImageToBlob(
  fileBuffer: Buffer,
  fileName: string,
  userId?: string
): Promise<string> {
  // 获取并验证环境变量
  const token = getBlobToken();

  // 生成唯一文件名（使用时间戳 + 随机字符串）
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const fileExt = fileName.substring(fileName.lastIndexOf('.'));
  const uniqueFileName = userId
    ? `${userId}/${timestamp}-${randomStr}${fileExt}`
    : `${timestamp}-${randomStr}${fileExt}`;

  console.log(`📤 [Vercel Blob] 上传文件`);
  console.log(`   - 文件名: ${uniqueFileName}`);
  console.log(`   - 文件大小: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

  try {
    // 上传文件到 Vercel Blob
    // 显式传递 token 以确保使用正确的环境变量
    const blob = await put(uniqueFileName, fileBuffer, {
      access: 'public', // 公开访问
      contentType: 'image/jpeg', // 默认 JPEG，实际会根据文件扩展名自动识别
      addRandomSuffix: false, // 我们已经自己生成了唯一文件名
      token: token, // 显式传递 BLOB_READ_WRITE_TOKEN
    });

    const publicUrl = blob.url;
    console.log(`✅ [Vercel Blob] 上传成功，公开 URL: ${publicUrl}`);

    return publicUrl;
  } catch (error: any) {
    console.error('❌ [Vercel Blob] 上传失败:', error);
    throw new Error(`上传图片失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 删除 Blob 中的图片
 * @param url 图片的完整 URL
 */
export async function deleteImageFromBlob(url: string): Promise<void> {
  // 获取并验证环境变量
  const token = getBlobToken();

  // Vercel Blob 的删除需要使用 del() 方法
  // 注意：需要从 URL 中提取 blob 的路径或使用完整 URL
  try {
    const { del } = await import('@vercel/blob');
    await del(url, {
      token: token, // 显式传递 BLOB_READ_WRITE_TOKEN
    });
    console.log(`✅ [Vercel Blob] 删除成功: ${url}`);
  } catch (error: any) {
    console.error('❌ [Vercel Blob] 删除失败:', error);
    throw new Error(`删除图片失败: ${error.message || '未知错误'}`);
  }
}

