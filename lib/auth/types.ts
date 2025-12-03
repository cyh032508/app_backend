/**
 * 认证相关的类型定义
 */

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string; // 实际应用中应该是加密后的密码
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterRequest {
  email: string;
  username?: string; // 可选
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      username: string;
    };
    token: string;
    expiresIn: number;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  username: string; // 可能为空字符串（如果用户没有设置用户名）
  iat?: number;
  exp?: number;
}

