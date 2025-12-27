# AI 作文批改系統 Backend

基于 Next.js 14 构建的 AI 作文批改系统后端 API，集成 Gemini AI 提供 OCR 识别、智能评分和评语生成功能。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **AI 服务**: Google Vertex AI (Gemini 2.5 Flash Lite)
- **数据库**: Supabase PostgreSQL (Prisma ORM)
- **存储**: Vercel Blob Storage
- **认证**: JWT
- **文档**: Swagger/OpenAPI

## 核心功能

- **OCR 识别**: 支持作文稿纸照片识别，采用原始图片 + 二值化图片交叉比对优化
- **智能评分**: 
  - Rank-then-Score: 生成参考文章进行相对排名评分
  - Direct Grading: 基于评分标准的直接评分
- **评语生成**: 五维度评语（立意取材、表达与文采、组织结构、格式及错别字、综合表现）
- **评分标准生成**: 根据题目自动生成详细评分标准
- **用户系统**: 注册、登录、密码重置、历史记录管理

## 快速开始

### 环境要求

- Node.js 18+
- pnpm / npm / yarn
- Google Cloud Project (Vertex AI)
- Supabase 项目
- Vercel 账号 (Blob Storage)

### 安装

```bash
# 安装依赖
pnpm install

# 生成 Prisma Client
pnpm prisma:generate
```

### 环境变量配置

复制 `env.example` 并配置以下环境变量：

```bash
cp env.example .env
```

**必需配置**:

```env
# Vertex AI
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash-lite
CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...

# 数据库
DATABASE_URL=postgresql://user:password@host:6543/db?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/db

# 认证
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# 存储
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx...
```

**认证方式** (三选一):
1. `GOOGLE_APPLICATION_CREDENTIALS_JSON`: 完整的服务账号 JSON
2. `CLIENT_EMAIL` + `PRIVATE_KEY`: 拆分环境变量（推荐，避免 Vercel 大小限制）
3. `GOOGLE_APPLICATION_CREDENTIALS`: 本地文件路径

### 数据库迁移

```bash
# 推送 schema 到数据库
pnpm prisma:push

# 或使用迁移
pnpm prisma:migrate
```

### 开发

```bash
# 启动开发服务器
pnpm dev
```

访问 `http://localhost:3000/api-docs` 查看 Swagger API 文档。

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/reset-password` - 重置密码

### OCR & 处理
- `POST /api/gemini_ocr` - OCR 识别（支持图片上传）
- `POST /api/upload_image` - 上传图片到 Blob Storage

### 评分 & 评语
- `POST /api/score_essay` - Rank-then-Score 评分
- `POST /api/grade_essay` - 直接评分
- `POST /api/feedback_essay` - 生成五维度评语
- `POST /api/generate_rubric` - 生成评分标准

### 历史记录
- `POST /api/history` - 保存批改历史
- `GET /api/history` - 查询历史记录
- `PATCH /api/history/[id]` - 更新历史记录

## 项目结构

```
.
├── app/
│   ├── api/              # API 路由
│   │   ├── auth/         # 认证相关
│   │   ├── gemini_ocr/   # OCR 识别
│   │   └── ...
│   └── api-docs/         # Swagger 文档页面
├── lib/
│   ├── gemini-ocr/       # OCR 核心逻辑
│   │   ├── ocr.ts        # OCR 识别
│   │   ├── text-generation.ts  # 文本生成
│   │   └── pipeline.ts   # 处理流程
│   ├── auth/             # 认证工具
│   ├── db/               # 数据库配置
│   └── utils/            # 工具函数
├── prisma/
│   └── schema.prisma     # 数据库 Schema
└── public/               # 静态资源
```

## 开发命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 启动生产服务器
pnpm start

# Prisma
pnpm prisma:generate      # 生成 Prisma Client
pnpm prisma:push          # 推送 schema
pnpm prisma:migrate       # 数据库迁移
pnpm prisma:studio        # 打开 Prisma Studio

# 代码检查
pnpm lint
```

## 部署

### Vercel (推荐)

1. 连接 GitHub 仓库
2. 配置环境变量
3. 部署自动完成

### 环境变量配置

在 Vercel Dashboard 中设置所有必需的环境变量。注意：
- `PRIVATE_KEY` 需要保留换行符，使用 `\n` 转义
- 或使用 `GOOGLE_APPLICATION_CREDENTIALS_JSON`（注意 Vercel 环境变量大小限制）

## 安全注意事项

- ✅ 所有敏感信息通过环境变量管理
- ✅ `.env` 文件已加入 `.gitignore`
- ✅ JWT Secret 最小长度 32 字符
- ✅ 日志不输出敏感信息（Client Email、Private Key 等）
- ✅ API 错误响应不泄露内部实现细节

## 性能优化

- OCR 处理采用并行任务（原始图片 + 二值化图片）
- 使用 Supabase 连接池 (`DATABASE_URL`) 优化数据库连接
- 图片处理使用 Sharp 进行优化
- API 响应统一格式，便于前端处理

## 许可证

Private - All Rights Reserved
