# Prisma + Supabase 数据库配置

## 📋 概述

项目已集成 Prisma ORM 来操作 Supabase PostgreSQL 数据库。

## 🔧 环境变量配置

在 `.env` 文件中设置以下环境变量：

```env
# Supabase 数据库配置
DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/database
```

**说明**：
- `DATABASE_URL`: 应用运行时使用，通过连接池（Port 6543）
- `DIRECT_URL`: Prisma Migrate/Push 时使用，直连数据库（Port 5432）

## 📦 安装和初始化

### 1. 安装依赖（已完成）
```bash
npm install @prisma/client prisma
```

### 2. 生成 Prisma Client
```bash
npm run prisma:generate
```

### 3. 推送 Schema 到数据库（首次设置）
```bash
npm run prisma:push
```

或者使用迁移：
```bash
npm run prisma:migrate
```

### 4. 打开 Prisma Studio（可视化数据库）
```bash
npm run prisma:studio
```

## 📁 文件结构

```
prisma/
└── schema.prisma          # Prisma Schema 定义

lib/db/
├── prisma.ts              # Prisma Client 单例
├── user.ts                # 用户数据库操作
├── essay.ts               # 作文数据库操作
├── score.ts               # 评分数据库操作
└── rubric.ts              # 评分标准数据库操作
```

## 🗄️ 数据模型

### User（用户）
- `id`: UUID (主键)
- `email`: 邮箱（唯一）
- `hashed_password`: 加密后的密码
- `username`: 用户名（可选）
- `created_at`: 创建时间
- `updated_at`: 更新时间

### Essays（作文）
- `id`: UUID (主键)
- `user_id`: 用户 ID
- `title`: 标题（可选）
- `content`: 内容（可选）
- `ocr_raw_text`: OCR 原始文本（可选）
- `image_path`: 图片路径（可选）
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `deleted_at`: 删除时间（软删除）

### Scores（评分）
- `id`: UUID (主键)
- `essay_id`: 作文 ID
- `user_id`: 用户 ID
- `rubric_id`: 评分标准 ID
- `total_score`: 总分
- `feedback_json`: 反馈 JSON（可选）
- `grammar_analysis`: 语法分析 JSON（可选）
- `vocabulary_usage`: 词汇使用 JSON（可选）
- `structure_issues`: 结构问题 JSON（可选）
- `created_at`: 创建时间

### Rubrics（评分标准）
- `id`: UUID (主键)
- `name`: 名称
- `title`: 标题
- `description`: 描述（可选）
- `criteria_json`: 评分标准 JSON
- `created_at`: 创建时间
- `updated_at`: 更新时间

## 💻 使用示例

### 用户操作

```typescript
import {
  createUser,
  findUserByEmail,
  findUserById,
  emailExists,
} from '@/lib/db/user';

// 创建用户
const user = await createUser('user@example.com', 'john_doe', 'password123');

// 查找用户
const user = await findUserByEmail('user@example.com');
const user = await findUserById('user-id');

// 检查邮箱是否存在
const exists = await emailExists('user@example.com');
```

### 作文操作

```typescript
import {
  createEssay,
  findEssayById,
  findEssaysByUserId,
  updateEssay,
  deleteEssay,
} from '@/lib/db/essay';

// 创建作文
const essay = await createEssay({
  user_id: 'user-id',
  title: '我的梦想',
  content: '作文内容...',
  ocr_raw_text: 'OCR 识别的文本',
});

// 查找用户的作文
const essays = await findEssaysByUserId('user-id', {
  skip: 0,
  take: 10,
});

// 更新作文
const updated = await updateEssay('essay-id', {
  title: '新标题',
  content: '新内容',
});

// 软删除作文
await deleteEssay('essay-id');
```

### 评分操作

```typescript
import {
  createScore,
  findScoreById,
  findScoresByEssayId,
  findScoresByUserId,
} from '@/lib/db/score';

// 创建评分
const score = await createScore({
  essay_id: 'essay-id',
  user_id: 'user-id',
  rubric_id: 'rubric-id',
  total_score: '85/100',
  feedback_json: { /* ... */ },
  grammar_analysis: { /* ... */ },
});

// 查找作文的所有评分
const scores = await findScoresByEssayId('essay-id');

// 查找用户的所有评分
const scores = await findScoresByUserId('user-id');
```

### 评分标准操作

```typescript
import {
  createRubric,
  findRubricById,
  findAllRubrics,
  updateRubric,
} from '@/lib/db/rubric';

// 创建评分标准
const rubric = await createRubric({
  name: '高中作文评分标准',
  title: '高中作文评分标准',
  description: '适用于高中作文',
  criteria_json: { /* ... */ },
});

// 查找所有评分标准
const rubrics = await findAllRubrics();

// 更新评分标准
const updated = await updateRubric('rubric-id', {
  title: '新标题',
});
```

## 🔄 迁移说明

### 已迁移的功能

✅ **用户认证系统**
- `lib/auth/storage.ts` 已从内存存储迁移到 Prisma
- `app/api/auth/register` 和 `app/api/auth/login` 已更新为使用数据库

### 待迁移的功能

- 其他功能可以继续使用临时存储或逐步迁移

## 🛠️ 常用命令

```bash
# 生成 Prisma Client（修改 schema 后必须运行）
npm run prisma:generate

# 推送 Schema 到数据库（开发环境）
npm run prisma:push

# 创建迁移（生产环境推荐）
npm run prisma:migrate

# 打开 Prisma Studio（可视化数据库）
npm run prisma:studio

# 查看数据库状态
npx prisma db pull

# 重置数据库（⚠️ 危险操作）
npx prisma migrate reset
```

## 📝 注意事项

1. **Schema 变更后**：
   - 运行 `npm run prisma:generate` 重新生成 Client
   - 运行 `npm run prisma:push` 或 `npm run prisma:migrate` 同步到数据库

2. **生产环境**：
   - 使用 `prisma migrate` 而不是 `prisma push`
   - 确保 `DATABASE_URL` 和 `DIRECT_URL` 都正确配置

3. **连接池**：
   - `DATABASE_URL` 使用连接池（Port 6543），适合应用运行时
   - `DIRECT_URL` 直连数据库（Port 5432），用于迁移操作

4. **类型安全**：
   - Prisma 会自动生成 TypeScript 类型
   - 导入类型：`import { User, Essays, Scores, Rubrics } from '@prisma/client'`

## 🔗 相关资源

- [Prisma 文档](https://www.prisma.io/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Prisma + Supabase 指南](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-supabase)

