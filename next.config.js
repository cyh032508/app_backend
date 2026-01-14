/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 啟用 instrumentation hook
  experimental: {
    instrumentationHook: true,
  },

  images: {
    domains: [],
  },
  
  // Webpack 配置：確保 Node.js 模組只在伺服器端使用
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 在客戶端構建時，將 Node.js 模組設為空對象
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        'node:crypto': false,
      };
    }
    return config;
  },

  // CORS 配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGINS || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;