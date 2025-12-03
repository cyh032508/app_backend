import { NextRequest, NextResponse } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { isValidEmail, verifyPassword, generateToken } from '@/lib/auth/utils';
import { findUserByEmail } from '@/lib/auth/storage';
import { LoginRequest } from '@/lib/auth/types';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用邮箱和密码登录，返回 JWT 认证令牌
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
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 用户密码
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: 登录成功
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
 *                   example: "登录成功"
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
 *                     token:
 *                       type: string
 *                       description: JWT 认证令牌
 *                     expiresIn:
 *                       type: number
 *                       description: 令牌过期时间（秒）
 *       400:
 *         description: 请求错误（邮箱格式错误、缺少字段等）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 认证失败（邮箱或密码错误）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 验证必需字段
    const validation = validateJsonFields(data, ['email', 'password']);
    if (!validation.isValid) {
      return validation.response;
    }

    const { email, password } = data as LoginRequest;

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return errorResponse('邮箱格式不正确', undefined, undefined, 400);
    }

    // 查找用户
    const user = await findUserByEmail(email);
    if (!user) {
      // 不透露用户是否存在，统一返回认证失败
      return errorResponse('邮箱或密码错误', undefined, undefined, 401);
    }

    // 验证密码
    if (!verifyPassword(password, user.passwordHash)) {
      return errorResponse('邮箱或密码错误', undefined, undefined, 401);
    }

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
      '登录成功'
    );
  } catch (error: any) {
    console.error('Error in login:', error);
    return errorResponse(error.message || '登录失败', undefined, undefined, 500);
  }
}

