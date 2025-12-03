/**
 * 认证工具函数
 */

import crypto from 'crypto';
import { TokenPayload } from './types';

// JWT Secret（应该从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 7天

/**
 * 生成密码哈希（使用 SHA-256，实际应用中应使用 bcrypt）
 * 注意：这只是临时实现，实际应用中应使用 bcrypt 或 argon2
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hash: string): boolean {
  const passwordHash = hashPassword(password);
  return passwordHash === hash;
}

/**
 * 生成 JWT Token
 * 注意：这里使用简单的实现，实际应用中应使用 jsonwebtoken 库
 */
export function generateToken(payload: TokenPayload): string {
  // 临时实现：使用 base64 编码
  // 实际应用中应使用 jsonwebtoken 库
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 7 * 24 * 60 * 60; // 7天（秒）

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');

  // 简单的签名（实际应用中应使用 HMAC）
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    // 解码 payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as TokenPayload;

    // 检查是否过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证密码强度
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少需要 8 个字符' };
  }

  if (password.length > 128) {
    return { valid: false, message: '密码长度不能超过 128 个字符' };
  }

  // 检查是否包含至少一个数字和一个字母
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  if (!hasNumber || !hasLetter) {
    return {
      valid: false,
      message: '密码必须包含至少一个数字和一个字母',
    };
  }

  return { valid: true };
}

/**
 * 验证用户名
 */
export function isValidUsername(username: string): { valid: boolean; message?: string } {
  if (username.length < 3) {
    return { valid: false, message: '用户名长度至少需要 3 个字符' };
  }

  if (username.length > 20) {
    return { valid: false, message: '用户名长度不能超过 20 个字符' };
  }

  // 只允许字母、数字、下划线和连字符
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      message: '用户名只能包含字母、数字、下划线和连字符',
    };
  }

  return { valid: true };
}

