/**
 * 初始化訪客用戶腳本
 *
 * 運行方式：
 * npx tsx scripts/init-guest-user.ts
 *
 * 或者添加到 package.json:
 * "scripts": {
 *   "init:guest": "tsx scripts/init-guest-user.ts"
 * }
 */

import { prisma } from '../lib/db/prisma';
import { GUEST_USER_ID } from '../lib/middleware/auth';
import { hashPassword } from '../lib/auth/utils';

async function initGuestUser() {
  try {
    console.log('正在檢查訪客用戶...');

    // 檢查訪客用戶是否已存在
    const existingGuest = await prisma.user.findUnique({
      where: { id: GUEST_USER_ID },
    });

    if (existingGuest) {
      console.log('✓ 訪客用戶已存在');
      console.log(`  ID: ${existingGuest.id}`);
      console.log(`  Email: ${existingGuest.email}`);
      console.log(`  Username: ${existingGuest.username || '(未設置)'}`);
      return;
    }

    console.log('訪客用戶不存在，正在創建...');

    // 創建訪客用戶
    // 使用固定的密碼hash（訪客用戶不應該被用來登入）
    const guestUser = await prisma.user.create({
      data: {
        id: GUEST_USER_ID,
        email: 'guest@system.local',
        hashed_password: await hashPassword('GUEST_USER_NO_LOGIN_ALLOWED'),
        username: '訪客',
      },
    });

    console.log('✓ 訪客用戶創建成功！');
    console.log(`  ID: ${guestUser.id}`);
    console.log(`  Email: ${guestUser.email}`);
    console.log(`  Username: ${guestUser.username}`);
  } catch (error: any) {
    console.error('✗ 初始化訪客用戶失敗:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 運行腳本
initGuestUser()
  .then(() => {
    console.log('\n初始化完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n初始化失敗:', error);
    process.exit(1);
  });
