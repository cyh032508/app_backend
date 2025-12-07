import { NextRequest } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { isValidPassword, verifyPassword, hashPassword } from '@/lib/auth/utils';
import { authenticateToken } from '@/lib/middleware/auth';
import { findUserById, updateUser } from '@/lib/db/user';

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: 重置密码
 *     description: 用户登录后重置密码，需要提供旧密码进行验证
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *                 description: 当前密码
 *                 example: "oldPassword123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: 新密码（至少8个字符，必须包含数字和字母）
 *                 example: "newPassword456"
 *     responses:
 *       200:
 *         description: 密码重置成功
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
 *                   example: "密码重置成功"
 *       400:
 *         description: 请求错误（验证失败、旧密码错误等）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 认证失败（token 无效或缺失）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份（需要登录）
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const userPayload = authResult.user!;

    // 验证请求数据
    const data = await req.json();
    const validation = validateJsonFields(data, ['oldPassword', 'newPassword']);
    if (!validation.isValid) {
      return validation.response;
    }

    const { oldPassword, newPassword } = data;

    // 验证新密码强度
    const passwordValidation = isValidPassword(newPassword);
    if (!passwordValidation.valid) {
      return errorResponse(
        passwordValidation.message || '新密码不符合要求',
        undefined,
        undefined,
        400
      );
    }

    // 检查新旧密码是否相同
    if (oldPassword === newPassword) {
      return errorResponse('新密码不能与旧密码相同', undefined, undefined, 400);
    }

    // 查找用户
    const user = await findUserById(userPayload.userId);
    if (!user) {
      return errorResponse('用户不存在', undefined, undefined, 404);
    }

    // 验证旧密码
    if (!verifyPassword(oldPassword, user.hashed_password)) {
      return errorResponse('旧密码错误', undefined, undefined, 400);
    }

    // 更新密码
    const newHashedPassword = hashPassword(newPassword);
    await updateUser(user.id, {
      hashed_password: newHashedPassword,
    });

    // 返回成功响应
    return successResponse(null, '密码重置成功');
  } catch (error: any) {
    console.error('Error in reset-password:', error);
    return errorResponse(error.message || '密码重置失败', undefined, undefined, 500);
  }
}

