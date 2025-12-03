/**
 * 统一的 API 响应格式工具
 * 用于移动应用后端
 */

import { NextResponse } from 'next/server';

export interface SuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
  error_code?: string;
  details?: any;
}

export function successResponse<T = any>(
  data: T | null = null,
  message: string = '操作成功',
  statusCode: number = 200
): NextResponse<SuccessResponse<T | null>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode }
  );
}

export function errorResponse(
  error: string,
  errorCode?: string,
  details?: any,
  statusCode: number = 400
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      error_code: errorCode,
      details,
    },
    { status: statusCode }
  );
}

// 常用错误代码
export class ErrorCodes {
  // 请求错误 (400)
  static readonly MISSING_FILE = 'MISSING_FILE';
  static readonly INVALID_FILE = 'INVALID_FILE';
  static readonly FILE_TOO_LARGE = 'FILE_TOO_LARGE';
  static readonly INVALID_FORMAT = 'INVALID_FORMAT';
  static readonly MISSING_FIELD = 'MISSING_FIELD';
  static readonly INVALID_INPUT = 'INVALID_INPUT';

  // 服务器错误 (500)
  static readonly PROCESSING_ERROR = 'PROCESSING_ERROR';
  static readonly OCR_FAILED = 'OCR_FAILED';
  static readonly API_ERROR = 'API_ERROR';
  static readonly CONFIGURATION_ERROR = 'CONFIGURATION_ERROR';

  // 服务不可用 (503)
  static readonly SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE';
  static readonly TIMEOUT = 'TIMEOUT';
}

