/**
 * 请求验证中间件
 * 用于移动应用 API 的请求验证
 */

import { NextRequest } from 'next/server';
import { validateImageFile, getFileInfo } from '@/lib/utils/file-validator';
import { errorResponse, ErrorCodes } from '@/lib/utils/response-helper';

/**
 * 验证图片上传请求
 */
export async function validateImageUpload(req: NextRequest) {
  const formData = await req.formData();
  const imageFile = formData.get('image') as File | null;

  if (!imageFile) {
    return {
      isValid: false,
      response: errorResponse(
        '请上传图片文件',
        ErrorCodes.MISSING_FILE,
        undefined,
        400
      ),
    };
  }

  // 直接使用 File 对象进行验证
  const validation = await validateImageFile(imageFile);
  if (!validation.isValid) {
    const fileInfo = await getFileInfo(imageFile);
    return {
      isValid: false,
      response: errorResponse(
        validation.errorMessage || '文件验证失败',
        ErrorCodes.INVALID_FILE,
        { file_info: fileInfo },
        400
      ),
    };
  }

  return {
    isValid: true,
    file: imageFile,
    fileInfo: await getFileInfo(imageFile),
  };
}

/**
 * 验证 JSON 请求的必需字段
 */
export function validateJsonFields(
  data: any,
  requiredFields: string[]
): { isValid: boolean; response?: any } {
  if (!data) {
    return {
      isValid: false,
      response: errorResponse(
        '请求体必须为 JSON 格式',
        ErrorCodes.INVALID_INPUT,
        undefined,
        400
      ),
    };
  }

  const missingFields = requiredFields.filter(
    (field) => !data[field] || (typeof data[field] === 'string' && !data[field].trim())
  );

  if (missingFields.length > 0) {
    return {
      isValid: false,
      response: errorResponse(
        `缺少必需字段: ${missingFields.join(', ')}`,
        ErrorCodes.MISSING_FIELD,
        { missing_fields: missingFields },
        400
      ),
    };
  }

  return { isValid: true };
}

