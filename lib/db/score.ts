/**
 * 评分数据库操作
 */

import { prisma } from './prisma';
import { Scores } from '@prisma/client';

export interface CreateScoreData {
  essay_id: string;
  user_id: string;
  rubric_id: string;
  total_score: string;
  feedback_json?: any;

  // 新增字段 - rank-then-score 相關
  scoring_method?: string;    // "rank-then-score" 或 "traditional"
  rank_position?: number;     // 排名位置 (1-50)
  percentile?: number;        // 百分位 (0-100)

  // 新增字段 - 五維度評語
  dimension_feedbacks?: any;  // 存儲五個維度的評語

  // 保留字段（未來使用）
  grammar_analysis?: any;
  vocabulary_usage?: any;
  structure_issues?: any;
}

/**
 * 创建评分
 */
export async function createScore(data: CreateScoreData): Promise<Scores> {
  return await prisma.scores.create({
    data,
  });
}

/**
 * 根据 ID 查找评分
 */
export async function findScoreById(id: string): Promise<Scores | null> {
  return await prisma.scores.findUnique({
    where: { id },
  });
}

/**
 * 根据作文 ID 查找评分
 */
export async function findScoresByEssayId(essayId: string): Promise<Scores[]> {
  return await prisma.scores.findMany({
    where: { essay_id: essayId },
    orderBy: {
      created_at: 'desc',
    },
  });
}

/**
 * 根据用户 ID 查找所有评分
 */
export async function findScoresByUserId(
  userId: string,
  options?: {
    skip?: number;
    take?: number;
  }
): Promise<Scores[]> {
  return await prisma.scores.findMany({
    where: { user_id: userId },
    orderBy: {
      created_at: 'desc',
    },
    skip: options?.skip,
    take: options?.take,
  });
}

/**
 * 根据作文 ID 和用户 ID 查找评分
 */
export async function findScoreByEssayAndUser(
  essayId: string,
  userId: string
): Promise<Scores | null> {
  return await prisma.scores.findFirst({
    where: {
      essay_id: essayId,
      user_id: userId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });
}

