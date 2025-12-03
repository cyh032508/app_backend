# Supabase 数据库设置指南

## 📋 前置要求

1. 确保 Supabase 项目已创建
2. 获取数据库连接信息

## 🔧 获取 Supabase 连接信息

### 1. 在 Supabase Dashboard 中：

1. 进入你的项目
2. 点击 **Settings** → **Database**
3. 找到 **Connection string** 部分

### 2. 获取连接字符串：

**Connection Pooling (推荐用于应用)**：
- 端口：`6543`
- 格式：`postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`

**Direct Connection (用于迁移)**：
- 端口：`5432`
- 格式：`postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`

## 📝 配置环境变量

在 `.env` 文件中设置：

```env
# Supabase 数据库配置
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

**重要**：
- 将 `[project-ref]` 替换为你的项目引用 ID
- 将 `[password]` 替换为你的数据库密码
- 将 `[region]` 替换为你的区域（如 `us-east-1`）

## 🚀 创建数据表

### 方法 1: 使用 SQL 脚本（最简单，推荐）

1. 打开 Supabase Dashboard
2. 进入 **SQL Editor**
3. 复制 `prisma/init.sql` 文件的内容
4. 粘贴到 SQL Editor 中
5. 点击 **Run** 执行

这会创建所有必需的数据表。

### 方法 2: 使用 Prisma Push

确保 `.env` 文件中的 `DATABASE_URL` 和 `DIRECT_URL` 已正确配置后：

```bash
npm run prisma:push
```

### 方法 3: 使用 Prisma Migrate

```bash
npm run prisma:migrate
```

## ✅ 验证数据表

### 在 Supabase Dashboard

1. 进入 **Table Editor**
2. 应该能看到所有创建的表：
   - USER
   - ESSAYS
   - SCORES
   - RUBRICS

### 使用 Prisma Studio

```bash
npm run prisma:studio
```

## 🔍 故障排除

### 问题 1: 连接失败

**错误**: `Can't reach database server`

**解决方案**:
1. 检查 `DATABASE_URL` 和 `DIRECT_URL` 是否正确
2. 确认 Supabase 项目状态正常
3. 检查网络连接
4. 确认数据库密码正确

### 问题 2: 权限错误

**错误**: `permission denied`

**解决方案**:
1. 确认使用的是正确的数据库用户（通常是 `postgres`）
2. 检查 Supabase 项目的数据库设置
3. 确认连接字符串中的密码正确

## 📚 下一步

数据表创建成功后：

1. **重新生成 Prisma Client**：
   ```bash
   npm run prisma:generate
   ```

2. **测试连接**：
   ```bash
   npm run prisma:studio
   ```

3. **测试注册 API**：
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test1234"}'
   ```
