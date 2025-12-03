/**
 * 认证中间件
 * 用于验证 JWT Token
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/utils';
import { TokenPayload } from '@/lib/auth/types';
import { errorResponse, ErrorCodes } from '@/lib/utils/response-helper';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

/**
 * 验证 JWT Token 中间件
 */
export function authenticateToken(req: NextRequest): {
  isValid: boolean;
  response?: any;
  user?: TokenPayload;
} {
  // 从 Authorization header 获取 token
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return {
      isValid: false,
      response: errorResponse(
        '缺少认证令牌',
        ErrorCodes.MISSING_FIELD,
        { field: 'Authorization' },
        401
      ),
    };
  }

  // 检查 Bearer token 格式
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      isValid: false,
      response: errorResponse(
        '认证令牌格式错误，应为 "Bearer <token>"',
        ErrorCodes.INVALID_INPUT,
        undefined,
        401
      ),
    };
  }

  const token = parts[1];

  // 验证 token
  const payload = verifyToken(token);
  if (!payload) {
    return {
      isValid: false,
      response: errorResponse(
        '认证令牌无效或已过期',
        ErrorCodes.INVALID_INPUT,
        undefined,
        401
      ),
    };
  }

  return {
    isValid: true,
    user: payload,
  };
}

/**
 * 从请求中提取用户信息（用于需要认证的 API）
 */
export function getAuthenticatedUser(req: NextRequest): TokenPayload | null {
  const authResult = authenticateToken(req);
  return authResult.isValid ? authResult.user || null : null;
}

