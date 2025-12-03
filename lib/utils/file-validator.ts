/**
 * 文件验证工具
 * 用于移动应用上传的文件验证
 */

import sharp from 'sharp';

// 允许的文件类型
export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff'];
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/bmp',
  'image/tiff',
];

// 文件大小限制（10MB）
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 图片尺寸限制
export const MAX_IMAGE_WIDTH = 4000;
export const MAX_IMAGE_HEIGHT = 4000;

export interface FileInfo {
  filename: string;
  size: number;
  size_mb: number;
  width?: number;
  height?: number;
  format?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * 验证上传的图片文件（Next.js File 对象）
 */
export async function validateImageFile(
  file: File | { originalFilename?: string; size?: number; buffer?: ArrayBuffer }
): Promise<ValidationResult> {
  // 检查文件是否存在
  let filename: string;
  let fileSize: number;
  let fileBuffer: ArrayBuffer;

  if (file instanceof File) {
    filename = file.name;
    fileSize = file.size;
    fileBuffer = await file.arrayBuffer();
  } else {
    if (!file || !file.originalFilename) {
      return {
        isValid: false,
        errorMessage: '未上传文件或文件名为空',
      };
    }
    filename = file.originalFilename;
    fileSize = file.size || 0;
    fileBuffer = file.buffer || new ArrayBuffer(0);
  }

  // 检查文件扩展名
  const fileExt = filename
    .toLowerCase()
    .substring(filename.lastIndexOf('.'));

  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    return {
      isValid: false,
      errorMessage: `不支持的文件格式。支持的格式: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // 检查文件大小
  if (fileSize > MAX_FILE_SIZE) {
    return {
      isValid: false,
      errorMessage: `文件过大。最大允许大小: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (fileSize === 0) {
    return {
      isValid: false,
      errorMessage: '文件为空',
    };
  }

  // 验证是否为有效图片
  try {
    const buffer = Buffer.from(fileBuffer);
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        errorMessage: '无法读取图片尺寸',
      };
    }

    if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
      return {
        isValid: false,
        errorMessage: `图片尺寸过大。最大允许尺寸: ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}`,
      };
    }
  } catch (error: any) {
    return {
      isValid: false,
      errorMessage: `无效的图片文件: ${error.message}`,
    };
  }

  return { isValid: true };
}

/**
 * 获取文件信息
 */
export async function getFileInfo(
  file: File | { originalFilename?: string; size?: number; buffer?: ArrayBuffer }
): Promise<FileInfo> {
  if (!file) {
    return {
      filename: '',
      size: 0,
      size_mb: 0,
    };
  }

  let filename: string;
  let fileSize: number;
  let fileBuffer: ArrayBuffer;

  if (file instanceof File) {
    filename = file.name;
    fileSize = file.size;
    fileBuffer = await file.arrayBuffer();
  } else {
    filename = file.originalFilename || '';
    fileSize = file.size || 0;
    fileBuffer = file.buffer || new ArrayBuffer(0);
  }

  try {
    const buffer = Buffer.from(fileBuffer);
    const metadata = await sharp(buffer).metadata();

    return {
      filename,
      size: fileSize,
      size_mb: Math.round((fileSize / 1024 / 1024) * 100) / 100,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch {
    return {
      filename,
      size: fileSize,
      size_mb: Math.round((fileSize / 1024 / 1024) * 100) / 100,
    };
  }
}

