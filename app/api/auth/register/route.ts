import { NextRequest, NextResponse } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  generateToken,
} from '@/lib/auth/utils';
import {
  createUser,
  emailExists,
  usernameExists,
} from '@/lib/auth/storage';
import { RegisterRequest, AuthResponse } from '@/lib/auth/types';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 创建新用户账户
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 用户邮箱
 *                 example: "user@example.com"
 *               username:
 *                 type: string
 *                 nullable: true
 *                 description: 用户名（可选，3-20个字符，只能包含字母、数字、下划线和连字符）
 *                 example: "john_doe"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 密码（至少8个字符，必须包含数字和字母）
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "注册成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         username:
 *                           type: string
 *                           nullable: true
 *                     token:
 *                       type: string
 *                       description: JWT 认证令牌
 *                     expiresIn:
 *                       type: number
 *                       description: 令牌过期时间（秒）
 *       400:
 *         description: 请求错误（验证失败、邮箱或用户名已存在等）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 验证必需字段（username 是可选的）
    const validation = validateJsonFields(data, ['email', 'password']);
    if (!validation.isValid) {
      return validation.response;
    }

    const { email, username, password } = data as RegisterRequest;

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return errorResponse('邮箱格式不正确', undefined, undefined, 400);
    }

    // 验证用户名（如果提供）
    if (username) {
      const usernameValidation = isValidUsername(username);
      if (!usernameValidation.valid) {
        return errorResponse(usernameValidation.message || '用户名格式不正确', undefined, undefined, 400);
      }
    }

    // 验证密码强度
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return errorResponse(passwordValidation.message || '密码不符合要求', undefined, undefined, 400);
    }

    // 检查邮箱是否已存在
    if (await emailExists(email)) {
      return errorResponse('该邮箱已被注册', undefined, undefined, 400);
    }

    // 检查用户名是否已存在（如果提供）
    if (username && (await usernameExists(username))) {
      return errorResponse('该用户名已被使用', undefined, undefined, 400);
    }

    // 创建用户
    const user = await createUser(email, username || '', password);

    // 生成 JWT Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // 返回成功响应
    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username || null, // 如果为空字符串，返回 null
        },
        token,
        expiresIn: 7 * 24 * 60 * 60, // 7天（秒）
      },
      '注册成功',
      201
    );
  } catch (error: any) {
    console.error('Error in register:', error);
    return errorResponse(error.message || '注册失败', undefined, undefined, 500);
  }
}

