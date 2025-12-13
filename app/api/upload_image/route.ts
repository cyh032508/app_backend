import { NextRequest } from 'next/server';
import { validateImageUpload } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { authenticateToken } from '@/lib/middleware/auth';
import { uploadImageToBlob } from '@/lib/storage/vercel-blob';

/**
 * @swagger
 * /api/upload_image:
 *   post:
 *     summary: 上传图片到 Vercel Blob Storage
 *     description: 接收前端上传的图片，上传到 Vercel Blob Storage，返回公开访问的 URL
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 需要上传的图片文件
 *     responses:
 *       200:
 *         description: 上传成功
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
 *                   example: "上传成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: 图片的公开访问 URL
 *                       example: "https://xxx.public.blob.vercel-storage.com/user-id/1234567890-abc123.jpg"
 *       400:
 *         description: 请求错误（缺少图片或格式错误）
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
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📤 [Upload Image API] 开始处理图片上传请求');

    // 验证用户身份（需要登录）
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const userPayload = authResult.user!;
    const userId = userPayload.userId;

    console.log(`👤 [Upload Image API] 用户 ID: ${userId}`);

    // 验证图片上传
    const validation = await validateImageUpload(req);
    if (!validation.isValid) {
      return validation.response;
    }

    const imageFile = validation.file!;
    const fileInfo = validation.fileInfo!;

    console.log(`📸 [Upload Image API] 图片信息:`, {
      filename: fileInfo.filename,
      size: `${fileInfo.size_mb} MB`,
      dimensions: `${fileInfo.width}x${fileInfo.height}`,
      format: fileInfo.format,
    });

    // 读取图片为 Buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // 上传到 Vercel Blob Storage
    const publicUrl = await uploadImageToBlob(
      imageBuffer,
      imageFile.name || 'essay.jpg',
      userId
    );

    // 返回成功响应
    return successResponse(
      {
        url: publicUrl,
      },
      '上传成功'
    );
  } catch (error: any) {
    console.error('❌ [Upload Image API] 处理过程出错:', error);

    // 如果是环境变量缺失错误，返回更友好的错误信息
    if (error.message?.includes('缺少必需的环境变量')) {
      return errorResponse(
        '服务器配置错误，请联系管理员',
        undefined,
        undefined,
        500
      );
    }

    return errorResponse(
      error.message || '上传图片失败',
      undefined,
      undefined,
      500
    );
  }
}

