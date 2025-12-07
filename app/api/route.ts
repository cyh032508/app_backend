import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api:
 *   get:
 *     summary: 健康檢查端點
 *     description: 返回 API 狀態和所有可用端點列表
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API 運行正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: AI作文批改系統 API 運行正常
 *                 version:
 *                   type: string
 *                   example: 2.0.0
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'AI作文批改系統 API 運行正常',
    version: '2.0.0',
    endpoints: [
      'POST /api/auth/register - 用戶註冊',
      'POST /api/auth/login - 用戶登入',
      'POST /api/auth/logout - 用戶登出',
      'POST /api/refine_ocr_text - 文字優化',
      'POST /api/gemini_ocr - OCR識別 (Gemini AI)',
      'POST /api/grade_essay - 作文評分',
      'POST /api/generate_rubric - 生成評分標準',
    ],
  });
}

