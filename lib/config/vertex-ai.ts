/**
 * Vertex AI 配置模块
 * 统一管理 Vertex AI 相关的环境变量
 */

// Vertex AI 配置
export const VERTEX_AI_CONFIG = {
  projectId: process.env.GCP_PROJECT_ID || 'tw-rd-pd-tim-chen',
  location: process.env.GCP_LOCATION || 'us-central1',
  model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
} as const;

// 验证配置是否完整
export function validateVertexAIConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!process.env.GCP_PROJECT_ID) {
    missing.push('GCP_PROJECT_ID');
  }
  
  if (!process.env.GCP_LOCATION) {
    missing.push('GCP_LOCATION');
  }
  
  if (!process.env.GEMINI_MODEL) {
    missing.push('GEMINI_MODEL');
  }
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}

// 在开发环境中打印配置（不包含敏感信息）
if (process.env.NODE_ENV === 'development') {
  const validation = validateVertexAIConfig();
  if (!validation.isValid) {
    console.warn('⚠️  Vertex AI 配置不完整，缺少以下环境变量:');
    validation.missing.forEach((key) => {
      console.warn(`   - ${key}`);
    });
    console.warn('   请在 .env 文件中设置这些变量');
  } else {
    console.log('✅ Vertex AI 配置已加载:');
    console.log(`   - Project ID: ${VERTEX_AI_CONFIG.projectId}`);
    console.log(`   - Location: ${VERTEX_AI_CONFIG.location}`);
    console.log(`   - Model: ${VERTEX_AI_CONFIG.model}`);
  }
}

