/**
 * Prisma Client 单例
 * 确保在整个应用中只有一个 Prisma Client 实例
 * 连接到 Supabase PostgreSQL 数据库
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 验证数据库连接配置
if (!process.env.DATABASE_URL) {
  throw new Error(
    '❌ 缺少必需的环境变量: DATABASE_URL\n' +
    '   请在 .env 文件中设置 DATABASE_URL（Supabase 连接池 URL）'
  );
}

if (!process.env.DIRECT_URL) {
  console.warn(
    '⚠️  警告: 缺少 DIRECT_URL 环境变量\n' +
    '   Prisma Migrate/Push 操作可能需要 DIRECT_URL\n' +
    '   请在 .env 文件中设置 DIRECT_URL（Supabase 直连 URL）'
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 测试数据库连接（仅在开发环境）
if (process.env.NODE_ENV === 'development') {
  prisma.$connect()
    .then(() => {
      console.log('✅ Prisma 已连接到 Supabase 数据库');
    })
    .catch((error) => {
      console.error('❌ Prisma 连接 Supabase 失败:', error.message);
      console.error('   请检查 DATABASE_URL 环境变量是否正确');
    });
}

// 优雅关闭
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

