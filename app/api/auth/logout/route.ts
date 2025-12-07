import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { authenticateToken } from '@/lib/middleware/auth';

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 登出当前用户。由于使用 JWT 无状态认证，客户端需要删除本地存储的 token。服务器端会验证 token 有效性后返回成功响应。
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
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
 *                   example: "登出成功，请删除本地存储的 token"
 *       401:
 *         description: 认证失败（token 无效或缺失）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: NextRequest) {
  try {
    // 验证 token（可选，但可以确认用户确实登录了）
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      // 即使 token 无效，也返回成功，因为客户端可能已经删除了 token
      // 这样可以避免客户端在已经登出后再次调用登出 API 时出现错误
      return successResponse(null, '登出成功，请删除本地存储的 token');
    }

    // Token 有效，返回成功响应
    // 注意：由于 JWT 是无状态的，服务器端无法真正"撤销" token
    // 客户端需要删除本地存储的 token
    return successResponse(null, '登出成功，请删除本地存储的 token');
  } catch (error: any) {
    console.error('Error in logout:', error);
    // 即使出错，也返回成功，避免客户端重复调用
    return successResponse(null, '登出成功，请删除本地存储的 token');
  }
}

