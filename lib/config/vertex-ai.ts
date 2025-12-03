/**
 * Vertex AI 配置模块
 * 统一管理 Vertex AI 相关的环境变量
 * 
 * 安全说明：
 * - 所有配置必须从环境变量读取，不允许硬编码默认值
 * - 缺少必要的环境变量时，会在初始化时抛出错误
 */

// 验证并获取环境变量（安全方式）
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `❌ 缺少必需的环境变量: ${key}\n` +
      `   请在 .env 文件中设置 ${key}\n` +
      `   参考 env.example 文件`
    );
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// Vertex AI 配置（强制要求必要的环境变量）
export const VERTEX_AI_CONFIG = {
  // 必需的环境变量（缺少会抛出错误）
  projectId: getRequiredEnv('GCP_PROJECT_ID'),
  location: getRequiredEnv('GCP_LOCATION'),
  
  // 可选的环境变量（有默认值）
  model: getOptionalEnv('GEMINI_MODEL', 'gemini-2.5-pro'),
} as const;

// 验证配置是否完整（用于运行时检查）
export function validateVertexAIConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!process.env.GCP_PROJECT_ID) {
    missing.push('GCP_PROJECT_ID');
  }
  
  if (!process.env.GCP_LOCATION) {
    missing.push('GCP_LOCATION');
  }
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}

// 在开发环境中打印配置状态（不包含敏感信息）
if (process.env.NODE_ENV === 'development') {
  try {
    console.log('✅ Vertex AI 配置已加载:');
    console.log(`   - Project ID: ${VERTEX_AI_CONFIG.projectId}`);
    console.log(`   - Location: ${VERTEX_AI_CONFIG.location}`);
    console.log(`   - Model: ${VERTEX_AI_CONFIG.model}`);
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }
}

