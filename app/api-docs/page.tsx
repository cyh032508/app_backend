'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// 動態導入 Swagger UI（只在客戶端加載）
const SwaggerUI = dynamic(
  () => import('swagger-ui-react'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入 Swagger UI 中...</p>
        </div>
      </div>
    ),
  }
);

// CSS 將在組件加載時自動導入

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 從 API 端點獲取 Swagger 規範
    fetch('/api/swagger')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setSpec(data))
      .catch((err) => {
        console.error('Failed to load Swagger spec:', err);
        setError(err.message || '載入 API 文檔失敗');
      });
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">錯誤: {error}</p>
          <p className="mt-2 text-gray-600">請確保 API 服務器正在運行</p>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入 API 文檔中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swagger-ui-wrapper">
      <SwaggerUI spec={spec} />
    </div>
  );
}

