/**
 * Next.js Instrumentation Hook
 * 在應用啟動時執行全局初始化邏輯
 *
 * 文檔: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { ensureGuestUser } from './lib/db/init-guest-user';

export async function register() {
  // 只在 Node.js 運行時執行（伺服器端）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] 應用啟動初始化...');

    try {
      // 確保訪客用戶存在
      await ensureGuestUser();
      console.log('[Instrumentation] ✓ 初始化完成');
    } catch (error: any) {
      console.error('[Instrumentation] ✗ 初始化失敗:', error.message);
      // 不阻止應用啟動，僅記錄錯誤
    }
  }
}
