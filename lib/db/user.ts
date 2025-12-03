/**
 * 用户数据库操作
 */

import { prisma } from './prisma';
import { User } from '@prisma/client';
import { hashPassword } from '@/lib/auth/utils';

/**
 * 创建用户
 */
export async function createUser(
  email: string,
  username: string | null,
  password: string
): Promise<User> {
  const hashedPassword = hashPassword(password);

  return await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      username: username?.trim() || null,
      hashed_password: hashedPassword,
    },
  });
}

/**
 * 根据邮箱查找用户
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: {
      email: email.toLowerCase().trim(),
    },
  });
}

/**
 * 根据用户名查找用户
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  return await prisma.user.findFirst({
    where: {
      username: {
        equals: username.trim(),
        mode: 'insensitive',
      },
    },
  });
}

/**
 * 根据 ID 查找用户
 */
export async function findUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: {
      id,
    },
  });
}

/**
 * 检查邮箱是否已存在
 */
export async function emailExists(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  return user !== null;
}

/**
 * 检查用户名是否已存在
 */
export async function usernameExists(username: string): Promise<boolean> {
  const user = await findUserByUsername(username);
  return user !== null;
}

/**
 * 更新用户信息
 */
export async function updateUser(
  id: string,
  data: {
    email?: string;
    username?: string | null;
    hashed_password?: string;
  }
): Promise<User> {
  const updateData: any = { ...data };
  
  if (data.email) {
    updateData.email = data.email.toLowerCase().trim();
  }
  
  if (data.username !== undefined) {
    updateData.username = data.username?.trim() || null;
  }

  return await prisma.user.update({
    where: { id },
    data: updateData,
  });
}

/**
 * 删除用户（软删除，实际应用中可能需要）
 */
export async function deleteUser(id: string): Promise<User> {
  return await prisma.user.delete({
    where: { id },
  });
}

