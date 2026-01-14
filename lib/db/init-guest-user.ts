/**
 * 訪客用戶初始化模塊
 * 確保系統中存在訪客用戶，用於支持訪客模式
 */

import { prisma } from './prisma';
import { GUEST_USER_ID } from '../middleware/auth';
import { hashPassword } from '../auth/utils';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * 確保訪客用戶存在
 * 使用單例模式，確保只初始化一次
 */
export async function ensureGuestUser(): Promise<void> {
  // 如果已經初始化過，直接返回
  if (isInitialized) {
    return;
  }

  // 如果正在初始化中，等待初始化完成
  if (initPromise) {
    return initPromise;
  }

  // 開始初始化
  initPromise = (async () => {
    try {
      console.log('[Init] 檢查訪客用戶...');

      // 檢查訪客用戶是否已存在
      const existingGuest = await prisma.user.findUnique({
        where: { id: GUEST_USER_ID },
      });

      if (existingGuest) {
        console.log('[Init] ✓ 訪客用戶已存在');
        isInitialized = true;
        return;
      }

      console.log('[Init] 訪客用戶不存在，正在創建...');

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

      console.log('[Init] ✓ 訪客用戶創建成功');
      console.log(`[Init]   ID: ${guestUser.id}`);
      console.log(`[Init]   Username: ${guestUser.username}`);
      isInitialized = true;
    } catch (error: any) {
      console.error('[Init] ✗ 訪客用戶初始化失敗:', error.message);
      // 如果是唯一性約束錯誤（email 已存在），忽略錯誤
      if (error.code === 'P2002') {
        console.log('[Init] 訪客用戶已存在（併發創建）');
        isInitialized = true;
        return;
      }
      // 其他錯誤拋出
      throw error;
    } finally {
      // 清理 promise 引用
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * 重置初始化狀態（僅用於測試）
 */
export function resetGuestUserInitialization(): void {
  isInitialized = false;
  initPromise = null;
}
