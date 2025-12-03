/**
 * 作文数据库操作
 */

import { prisma } from './prisma';
import { Essays } from '@prisma/client';

export interface CreateEssayData {
  user_id: string;
  title?: string;
  content?: string;
  ocr_raw_text?: string;
  image_path?: string;
}

export interface UpdateEssayData {
  title?: string;
  content?: string;
  ocr_raw_text?: string;
  image_path?: string;
}

/**
 * 创建作文
 */
export async function createEssay(data: CreateEssayData): Promise<Essays> {
  return await prisma.essays.create({
    data,
  });
}

/**
 * 根据 ID 查找作文
 */
export async function findEssayById(id: string): Promise<Essays | null> {
  return await prisma.essays.findUnique({
    where: { id },
  });
}

/**
 * 根据用户 ID 查找所有作文
 */
export async function findEssaysByUserId(
  userId: string,
  options?: {
    skip?: number;
    take?: number;
    includeDeleted?: boolean;
  }
): Promise<Essays[]> {
  const where: any = {
    user_id: userId,
  };

  if (!options?.includeDeleted) {
    where.deleted_at = null;
  }

  return await prisma.essays.findMany({
    where,
    orderBy: {
      created_at: 'desc',
    },
    skip: options?.skip,
    take: options?.take,
  });
}

/**
 * 更新作文
 */
export async function updateEssay(
  id: string,
  data: UpdateEssayData
): Promise<Essays> {
  return await prisma.essays.update({
    where: { id },
    data,
  });
}

/**
 * 软删除作文
 */
export async function deleteEssay(id: string): Promise<Essays> {
  return await prisma.essays.update({
    where: { id },
    data: {
      deleted_at: new Date(),
    },
  });
}

/**
 * 永久删除作文
 */
export async function hardDeleteEssay(id: string): Promise<Essays> {
  return await prisma.essays.delete({
    where: { id },
  });
}

