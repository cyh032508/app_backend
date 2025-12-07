import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { authenticateToken } from '@/lib/middleware/auth';
import { findEssaysByUserId } from '@/lib/db/essay';
import { findScoresByUserId, findScoreByEssayAndUser } from '@/lib/db/score';
import { findRubricById } from '@/lib/db/rubric';
import { prisma } from '@/lib/db/prisma';

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: 查询批改历史记录
 *     description: 获取当前用户的所有批改记录，包括作文信息和评分信息。支持分页查询。
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码（从 1 开始）
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页数量（最大 100）
 *     responses:
 *       200:
 *         description: 查询成功
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
 *                   example: "查询成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     records:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           essay:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                               content:
 *                                 type: string
 *                               ocr_raw_text:
 *                                 type: string
 *                               image_path:
 *                                 type: string
 *                               created_at:
 *                                 type: string
 *                                 format: date-time
 *                           score:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               total_score:
 *                                 type: string
 *                               feedback_json:
 *                                 type: object
 *                               grammar_analysis:
 *                                 type: object
 *                               vocabulary_usage:
 *                                 type: object
 *                               structure_issues:
 *                                 type: object
 *                               created_at:
 *                                 type: string
 *                                 format: date-time
 *                           rubric:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: 认证失败（token 无效或缺失）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份（需要登录）
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const userPayload = authResult.user!;
    const userId = userPayload.userId;

    // 获取查询参数
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // 计算分页
    const skip = (page - 1) * limit;

    // 查询用户的作文（不包含已删除的）
    const essays = await findEssaysByUserId(userId, {
      skip,
      take: limit,
      includeDeleted: false,
    });

    // 查询总数
    const totalEssays = await prisma.essays.count({
      where: {
        user_id: userId,
        deleted_at: null,
      },
    });

    // 为每篇作文查询对应的评分和评分标准
    const records = await Promise.all(
      essays.map(async (essay) => {
        // 查询该作文的评分（取最新的）
        const score = await findScoreByEssayAndUser(essay.id, userId);

        // 如果存在评分，查询评分标准
        let rubric = null;
        if (score && score.rubric_id) {
          rubric = await findRubricById(score.rubric_id);
        }

        return {
          essay: {
            id: essay.id,
            title: essay.title,
            content: essay.content,
            ocr_raw_text: essay.ocr_raw_text,
            image_path: essay.image_path,
            created_at: essay.created_at.toISOString(),
          },
          score: score
            ? {
                id: score.id,
                total_score: score.total_score,
                feedback_json: score.feedback_json,
                grammar_analysis: score.grammar_analysis,
                vocabulary_usage: score.vocabulary_usage,
                structure_issues: score.structure_issues,
                created_at: score.created_at.toISOString(),
              }
            : null,
          rubric: rubric
            ? {
                id: rubric.id,
                name: rubric.name,
                title: rubric.title,
                description: rubric.description,
              }
            : null,
        };
      })
    );

    // 计算总页数
    const totalPages = Math.ceil(totalEssays / limit);

    // 返回成功响应
    return successResponse({
      records,
      pagination: {
        page,
        limit,
        total: totalEssays,
        totalPages,
      },
    }, '查询成功');
  } catch (error: any) {
    console.error('Error in history:', error);
    return errorResponse(error.message || '查询失败', undefined, undefined, 500);
  }
}

