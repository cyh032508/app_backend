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
): NextResponse {
  try {
    const responseBody: SuccessResponse<T | null> = {
      success: true as const,
      message,
      data,
    };
    
    // 測試序列化
    try {
      JSON.stringify(responseBody);
    } catch (serializeError: any) {
      console.error('❌ [successResponse] 序列化失敗:', serializeError.message);
      throw new Error(`無法序列化回應資料: ${serializeError.message}`);
    }
    
    const response = NextResponse.json(
      responseBody,
      { 
        status: statusCode,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
    
    return response;
  } catch (error: any) {
    console.error('❌ [successResponse] 創建回應失敗:', error.message);
    // 如果創建回應失敗，返回錯誤回應
    return errorResponse(
      `創建回應失敗: ${error.message}`,
      'RESPONSE_ERROR',
      undefined,
      500
    );
  }
}

export function errorResponse(
  error: string,
  errorCode?: string,
  details?: any,
  statusCode: number = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      error_code: errorCode,
      details,
    },
    { 
      status: statusCode,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
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

