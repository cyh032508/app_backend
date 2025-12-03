import { NextResponse } from 'next/server';
import { swaggerSpec } from '@/lib/swagger/config';

/**
 * @swagger
 * /api/swagger:
 *   get:
 *     summary: 獲取 Swagger API 文檔
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Swagger JSON 文檔
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  return NextResponse.json(swaggerSpec);
}

