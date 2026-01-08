import { NextRequest } from 'next/server';
import { authenticateToken } from '@/lib/middleware/auth';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { findUserById, updateUser, deleteUser } from '@/lib/db/user';
import { hashPassword, isValidEmail, isValidPassword, isValidUsername } from '@/lib/auth/utils';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { emailExists, usernameExists } from '@/lib/db/user';

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: 獲取用戶資料
 *     description: 獲取當前登入用戶的個人資料
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取成功
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
 *                   example: "操作成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                       nullable: true
 *                     avatar_url:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: 認證失敗
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 用戶不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function GET(req: NextRequest) {
  try {
    // 驗證用戶身份
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const userPayload = authResult.user!;
    const userId = userPayload.userId;

    // 查找用戶
    const user = await findUserById(userId);
    if (!user) {
      return errorResponse('用戶不存在', undefined, undefined, 404);
    }

    // 返回用戶資料（不包含密碼）
    return successResponse({
      id: user.id,
      email: user.email,
      username: user.username || null,
      avatar_url: user.avatar_url || null,
    });
  } catch (error: any) {
    console.error('Error in GET /api/user/profile:', error);
    return errorResponse(error.message || '獲取用戶資料失敗', undefined, undefined, 500);
  }
}

/**
 * @swagger
 * /api/user/profile:
 *   patch:
 *     summary: 更新用戶資料
 *     description: 更新當前登入用戶的個人資料（用戶名、郵箱、密碼）
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 nullable: true
 *                 description: 用戶名（3-20個字符）
 *                 example: "john_doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 郵箱
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 新密碼（至少8個字符，必須包含數字和字母）
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                   example: "操作成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                       nullable: true
 *                     avatar_url:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: 請求錯誤（驗證失敗、郵箱或用戶名已存在等）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 認證失敗
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function PATCH(req: NextRequest) {
  try {
    // 驗證用戶身份
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const userPayload = authResult.user!;
    const userId = userPayload.userId;

    // 獲取當前用戶
    const currentUser = await findUserById(userId);
    if (!currentUser) {
      return errorResponse('用戶不存在', undefined, undefined, 404);
    }

    // 解析請求數據
    const data = await req.json();

    // 構建更新數據
    const updateData: {
      email?: string;
      username?: string | null;
      hashed_password?: string;
    } = {};

    // 更新郵箱
    if (data.email !== undefined) {
      if (!isValidEmail(data.email)) {
        return errorResponse('郵箱格式不正確', undefined, undefined, 400);
      }

      // 檢查新郵箱是否已被其他用戶使用
      if (data.email.toLowerCase().trim() !== currentUser.email) {
        if (await emailExists(data.email)) {
          return errorResponse('該郵箱已被使用', undefined, undefined, 400);
        }
        updateData.email = data.email;
      }
    }

    // 更新用戶名
    if (data.username !== undefined) {
      if (data.username === null || data.username === '') {
        updateData.username = null;
      } else {
        const usernameValidation = isValidUsername(data.username);
        if (!usernameValidation.valid) {
          return errorResponse(
            usernameValidation.message || '用戶名格式不正確',
            undefined,
            undefined,
            400
          );
        }

        // 檢查新用戶名是否已被其他用戶使用
        if (data.username.trim() !== (currentUser.username || '')) {
          if (await usernameExists(data.username)) {
            return errorResponse('該用戶名已被使用', undefined, undefined, 400);
          }
        }
        updateData.username = data.username;
      }
    }

    // 更新密碼
    if (data.password !== undefined) {
      const passwordValidation = isValidPassword(data.password);
      if (!passwordValidation.valid) {
        return errorResponse(
          passwordValidation.message || '密碼不符合要求',
          undefined,
          undefined,
          400
        );
      }
      updateData.hashed_password = hashPassword(data.password);
    }

    // 如果沒有要更新的字段
    if (Object.keys(updateData).length === 0) {
      return errorResponse('沒有提供要更新的字段', undefined, undefined, 400);
    }

    // 執行更新
    const updatedUser = await updateUser(userId, updateData);

    // 返回更新後的用戶資料（不包含密碼）
    return successResponse({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username || null,
      avatar_url: updatedUser.avatar_url || null,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/user/profile:', error);
    return errorResponse(error.message || '更新用戶資料失敗', undefined, undefined, 500);
  }
}

/**
 * @swagger
 * /api/user/profile:
 *   delete:
 *     summary: 刪除帳號
 *     description: 刪除當前登入用戶的帳號及其所有相關數據（作文、成績等）
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 刪除成功
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
 *                   example: "操作成功"
 *                 data:
 *                   type: null
 *       401:
 *         description: 認證失敗
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 用戶不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function DELETE(req: NextRequest) {
  try {
    // 驗證用戶身份
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const userPayload = authResult.user!;
    const userId = userPayload.userId;

    // 檢查用戶是否存在
    const user = await findUserById(userId);
    if (!user) {
      return errorResponse('用戶不存在', undefined, undefined, 404);
    }

    // 刪除用戶（會自動級聯刪除相關的 essays 和 scores）
    await deleteUser(userId);

    console.log(`✅ [Delete Account] 用戶 ${userId} 的帳號已刪除`);

    // 返回成功響應（data 為 null，符合前端 ApiResponse<void> 類型）
    return successResponse(null, '帳號已成功刪除');
  } catch (error: any) {
    console.error('Error in DELETE /api/user/profile:', error);
    return errorResponse(error.message || '刪除帳號失敗', undefined, undefined, 500);
  }
}
