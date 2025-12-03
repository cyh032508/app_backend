/**
 * 评分标准数据库操作
 */

import { prisma } from './prisma';
import { Rubrics } from '@prisma/client';

export interface CreateRubricData {
  name: string;
  title: string;
  description?: string;
  criteria_json: any;
}

export interface UpdateRubricData {
  name?: string;
  title?: string;
  description?: string;
  criteria_json?: any;
}

/**
 * 创建评分标准
 */
export async function createRubric(data: CreateRubricData): Promise<Rubrics> {
  return await prisma.rubrics.create({
    data,
  });
}

/**
 * 根据 ID 查找评分标准
 */
export async function findRubricById(id: string): Promise<Rubrics | null> {
  return await prisma.rubrics.findUnique({
    where: { id },
  });
}

/**
 * 查找所有评分标准
 */
export async function findAllRubrics(options?: {
  skip?: number;
  take?: number;
}): Promise<Rubrics[]> {
  return await prisma.rubrics.findMany({
    orderBy: {
      created_at: 'desc',
    },
    skip: options?.skip,
    take: options?.take,
  });
}

/**
 * 根据名称查找评分标准
 */
export async function findRubricByName(name: string): Promise<Rubrics | null> {
  return await prisma.rubrics.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });
}

/**
 * 更新评分标准
 */
export async function updateRubric(
  id: string,
  data: UpdateRubricData
): Promise<Rubrics> {
  return await prisma.rubrics.update({
    where: { id },
    data,
  });
}

/**
 * 删除评分标准
 */
export async function deleteRubric(id: string): Promise<Rubrics> {
  return await prisma.rubrics.delete({
    where: { id },
  });
}

