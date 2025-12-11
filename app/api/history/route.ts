import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { authenticateToken } from '@/lib/middleware/auth';
import { findEssaysByUserId, createEssay } from '@/lib/db/essay';
import { findScoresByUserId, findScoreByEssayAndUser, createScore } from '@/lib/db/score';
import { findRubricById, findRubricByName, createRubric } from '@/lib/db/rubric';
import { prisma } from '@/lib/db/prisma';

/**
 * @swagger
 * /api/history:
 *   post:
 *     summary: 保存批改历史记录
 *     description: 保存批改记录，包括作文信息、评分结果和评分标准。在批改 API 成功返回后调用。
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *               - content
 *               - rubric
 *               - grade_result
 *             properties:
 *               topic:
 *                 type: string
 *                 description: 作文题目
 *                 example: "我的夢想"
 *               content:
 *                 type: string
 *                 description: OCR 识别的文字内容
 *                 example: "每個人都有自己的夢想..."
 *               rubric:
 *                 type: string
 *                 description: 评分标准
 *                 example: "評分標準：內容 40%，結構 30%，語言 30%"
 *               grade_result:
 *                 type: object
 *                 description: 批改 API 的完整返回数据
 *                 properties:
 *                   score:
 *                     type: string
 *                   total_score:
 *                     type: string
 *                   feedback:
 *                     type: string
 *                   detailed_feedback:
 *                     type: string
 *                   strengths:
 *                     type: array
 *                     items:
 *                       type: string
 *                   improvements:
 *                     type: array
 *                     items:
 *                       type: string
 *                   areas_for_improvement:
 *                     type: array
 *                     items:
 *                       type: string
 *               image_uri:
 *                 type: string
 *                 description: 图片 URI（可选）
 *                 example: "file:///path/to/image.jpg"
 *     responses:
 *       200:
 *         description: 保存成功
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
 *                   example: "保存成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 记录 ID（essay ID）
 *                     essay_id:
 *                       type: string
 *                     score_id:
 *                       type: string
 *       400:
 *         description: 请求错误（缺少字段或格式错误）
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
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份（需要登录）
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const userPayload = authResult.user!;
    const userId = userPayload.userId;

    // 验证请求数据
    const data = await req.json();
    const validation = validateJsonFields(data, ['topic', 'content', 'rubric', 'grade_result']);
    if (!validation.isValid) {
      return validation.response;
    }

    const { topic, content, rubric, grade_result, image_uri } = data;

    // 验证 grade_result 是否为对象
    if (!grade_result || typeof grade_result !== 'object') {
      return errorResponse('grade_result 必须是一个对象', undefined, undefined, 400);
    }

    // 验证并清理输入数据
    const trimmedTopic = topic?.trim() || '';
    const trimmedContent = content?.trim() || '';
    const trimmedRubric = rubric?.trim() || '';

    // 1. 保存作文
    // 根据 schema，title, content, ocr_raw_text, image_path 都是可选的 String?
    // 如果为空字符串，转换为 null 或保留空字符串都可以，但为了数据一致性，空字符串转换为 null
    const essay = await createEssay({
      user_id: userId,
      title: trimmedTopic || null,
      content: trimmedContent || null,
      ocr_raw_text: trimmedContent || null, // 使用 content 作为 OCR 原始文本
      image_path: image_uri?.trim() || null, // 保存图片 URI（如果是本地 URI，后续可能需要上传到云存储）
    });

    // 2. 处理评分标准（Rubric）
    // 根据 schema，name 和 title 是必填的 String，criteria_json 是必填的 Json
    // 如果 rubric 为空，使用默认值
    if (!trimmedRubric) {
      return errorResponse('rubric 不能为空', undefined, undefined, 400);
    }

    // 生成唯一的 rubric name（使用前50个字符，如果太短则使用完整文本）
    const rubricName = trimmedRubric.length > 50 
      ? trimmedRubric.substring(0, 50) 
      : trimmedRubric;
    
    // 生成 title（使用前100个字符，如果太短则使用完整文本）
    const rubricTitle = trimmedRubric.length > 100 
      ? trimmedRubric.substring(0, 100) 
      : trimmedRubric || '自定义评分标准';

    let rubricRecord = await findRubricByName(rubricName);
    
    if (!rubricRecord) {
      // 创建新的评分标准
      // criteria_json 必须是有效的 JSON 对象，不能为 null
      rubricRecord = await createRubric({
        name: rubricName,
        title: rubricTitle,
        description: trimmedRubric, // description 是可选的 String?
        criteria_json: { raw_text: trimmedRubric }, // 必填的 Json 类型
      });
    }

    // 3. 保存评分结果
    // 根据 schema，total_score 是必填的 String
    // feedback_json, grammar_analysis, vocabulary_usage, structure_issues 都是可选的 Json?
    const totalScore = grade_result.total_score || grade_result.score || 'N/A';
    
    // 构建 feedback_json，包含所有 grade_result 中的字段
    // 始终保存完整的 grade_result，确保数据完整性
    const feedbackJson: any = {
      full_grade_result: grade_result, // 始终保存完整的 grade_result
    };
    
    // 添加其他字段（如果存在）
    if (grade_result.feedback) feedbackJson.feedback = grade_result.feedback;
    if (grade_result.detailed_feedback) feedbackJson.detailed_feedback = grade_result.detailed_feedback;
    if (grade_result.strengths) feedbackJson.strengths = grade_result.strengths;
    if (grade_result.improvements) feedbackJson.improvements = grade_result.improvements;
    if (grade_result.areas_for_improvement) feedbackJson.areas_for_improvement = grade_result.areas_for_improvement;

    // 准备 createScore 的数据
    const scoreData: any = {
      essay_id: essay.id,
      user_id: userId,
      rubric_id: rubricRecord.id,
      total_score: String(totalScore), // 必填字段
      feedback_json: feedbackJson, // 始终保存 feedback_json（至少包含 full_grade_result）
    };

    // 只有当这些字段存在时才添加
    if (grade_result.grammar_analysis) {
      scoreData.grammar_analysis = grade_result.grammar_analysis;
    }
    if (grade_result.vocabulary_usage) {
      scoreData.vocabulary_usage = grade_result.vocabulary_usage;
    }
    if (grade_result.structure_issues) {
      scoreData.structure_issues = grade_result.structure_issues;
    }

    const score = await createScore(scoreData);

    // 返回成功响应
    return successResponse(
      {
        id: essay.id, // 返回 essay ID 作为记录 ID
        essay_id: essay.id,
        score_id: score.id,
      },
      '保存成功'
    );
  } catch (error: any) {
    console.error('Error in POST /api/history:', error);
    return errorResponse(error.message || '保存失败', undefined, undefined, 500);
  }
}

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

