/**
 * 用户存储（使用 Prisma + Supabase）
 * 已迁移到数据库操作
 */

import {
  createUser as dbCreateUser,
  findUserByEmail as dbFindUserByEmail,
  findUserByUsername as dbFindUserByUsername,
  findUserById as dbFindUserById,
  emailExists as dbEmailExists,
  usernameExists as dbUsernameExists,
} from '@/lib/db/user';
import { User as PrismaUser } from '@prisma/client';
import { User } from './types';

/**
 * 将 Prisma User 转换为应用 User 类型
 */
function prismaUserToAppUser(prismaUser: PrismaUser): User {
  return {
    id: prismaUser.id,
    email: prismaUser.email,
    username: prismaUser.username || '', // Prisma 中 username 可为 null，转换为空字符串
    passwordHash: prismaUser.hashed_password,
    createdAt: prismaUser.created_at,
    updatedAt: prismaUser.updated_at,
  };
}

/**
 * 创建用户
 */
export async function createUser(
  email: string,
  username: string,
  password: string
): Promise<User> {
  const prismaUser = await dbCreateUser(email, username, password);
  return prismaUserToAppUser(prismaUser);
}

/**
 * 根据邮箱查找用户
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const prismaUser = await dbFindUserByEmail(email);
  return prismaUser ? prismaUserToAppUser(prismaUser) : null;
}

/**
 * 根据用户名查找用户
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const prismaUser = await dbFindUserByUsername(username);
  return prismaUser ? prismaUserToAppUser(prismaUser) : null;
}

/**
 * 根据 ID 查找用户
 */
export async function findUserById(id: string): Promise<User | null> {
  const prismaUser = await dbFindUserById(id);
  return prismaUser ? prismaUserToAppUser(prismaUser) : null;
}

/**
 * 检查邮箱是否已存在
 */
export async function emailExists(email: string): Promise<boolean> {
  return await dbEmailExists(email);
}

/**
 * 检查用户名是否已存在
 */
export async function usernameExists(username: string): Promise<boolean> {
  return await dbUsernameExists(username);
}

