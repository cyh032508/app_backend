import { NextRequest } from 'next/server';
import { authenticateToken } from '@/lib/middleware/auth';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { validateImageUpload } from '@/lib/middleware/request-validator';
import { uploadImageToBlob } from '@/lib/storage/vercel-blob';
import { findUserById, updateUser } from '@/lib/db/user';

/**
 * @swagger
 * /api/user/avatar:
 *   post:
 *     summary: 上傳用戶頭像
 *     description: 上傳用戶頭像圖片到 Vercel Blob Storage 並更新用戶資料
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: 頭像圖片文件
 *     responses:
 *       200:
 *         description: 上傳成功
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
 *                     avatar_url:
 *                       type: string
 *                       description: 頭像的公開訪問 URL
 *                       example: "https://xxx.public.blob.vercel-storage.com/user-id/avatar-1234567890.jpg"
 *       400:
 *         description: 請求錯誤（缺少圖片或格式錯誤）
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
 *       500:
 *         description: 服務器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📤 [Upload Avatar API] 開始處理頭像上傳請求');

    // 驗證用戶身份
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const userPayload = authResult.user!;
    const userId = userPayload.userId;

    console.log(`👤 [Upload Avatar API] 用戶 ID: ${userId}`);

    // 驗證圖片上傳（使用 avatar 字段名）
    const formData = await req.formData();
    const imageFile = formData.get('avatar') as File | null;

    if (!imageFile) {
      return errorResponse(
        '請上傳頭像圖片文件',
        'MISSING_FILE',
        undefined,
        400
      );
    }

    // 驗證圖片文件
    const { validateImageFile, getFileInfo } = await import('@/lib/utils/file-validator');
    const validation = await validateImageFile(imageFile);
    if (!validation.isValid) {
      const fileInfo = await getFileInfo(imageFile);
      return errorResponse(
        validation.errorMessage || '文件驗證失敗',
        'INVALID_FILE',
        { file_info: fileInfo },
        400
      );
    }

    const fileInfo = await getFileInfo(imageFile);

    console.log(`📸 [Upload Avatar API] 圖片信息:`, {
      filename: fileInfo.filename,
      size: `${fileInfo.size_mb} MB`,
      dimensions: `${fileInfo.width}x${fileInfo.height}`,
      format: fileInfo.format,
    });

    // 讀取圖片為 Buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // 上傳到 Vercel Blob Storage（使用 avatar 前綴）
    const avatarFileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileInfo.format || 'jpg'}`;
    const publicUrl = await uploadImageToBlob(
      imageBuffer,
      avatarFileName,
      userId
    );

    // 更新用戶資料中的 avatar_url
    await updateUser(userId, {
      avatar_url: publicUrl,
    });

    console.log(`✅ [Upload Avatar API] 頭像上傳成功: ${publicUrl}`);

    // 返回成功響應
    return successResponse({
      avatar_url: publicUrl,
    });
  } catch (error: any) {
    console.error('❌ [Upload Avatar API] 處理過程出錯:', error);

    // 如果是環境變數缺失錯誤，返回更友好的錯誤信息
    if (error.message?.includes('缺少必需的環境變數')) {
      return errorResponse(
        '服務器配置錯誤，請聯繫管理員',
        undefined,
        undefined,
        500
      );
    }

    return errorResponse(
      error.message || '上傳頭像失敗',
      undefined,
      undefined,
      500
    );
  }
}
