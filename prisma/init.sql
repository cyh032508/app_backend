-- Supabase 数据库初始化 SQL 脚本
-- 在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 创建 USER 表
CREATE TABLE IF NOT EXISTS "USER" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 ESSAYS 表
CREATE TABLE IF NOT EXISTS "ESSAYS" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  ocr_raw_text TEXT,
  image_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建 SCORES 表
CREATE TABLE IF NOT EXISTS "SCORES" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rubric_id TEXT NOT NULL,
  total_score TEXT NOT NULL,
  feedback_json JSONB,
  grammar_analysis JSONB,
  vocabulary_usage JSONB,
  structure_issues JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 RUBRICS 表
CREATE TABLE IF NOT EXISTS "RUBRICS" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  criteria_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_essays_user_id ON "ESSAYS"(user_id);
CREATE INDEX IF NOT EXISTS idx_essays_created_at ON "ESSAYS"(created_at);
CREATE INDEX IF NOT EXISTS idx_scores_essay_id ON "SCORES"(essay_id);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON "SCORES"(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON "SCORES"(created_at);

-- 添加注释
COMMENT ON TABLE "USER" IS '用户表';
COMMENT ON TABLE "ESSAYS" IS '作文表';
COMMENT ON TABLE "SCORES" IS '评分表';
COMMENT ON TABLE "RUBRICS" IS '评分标准表';

