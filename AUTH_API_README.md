# 用户认证 API 文档

## 📋 API 端点

### 1. 用户注册
**POST** `/api/auth/register`

创建新用户账户。

#### 请求体
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "password123"
}
```

#### 验证规则
- **邮箱**: 必须是有效的邮箱格式
- **用户名**: 
  - 长度: 3-20 个字符
  - 只能包含字母、数字、下划线(_)和连字符(-)
- **密码**: 
  - 长度: 至少 8 个字符，最多 128 个字符
  - 必须包含至少一个数字和一个字母

#### 成功响应 (201)
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "user_1234567890_abc123",
      "email": "user@example.com",
      "username": "john_doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  }
}
```

#### 错误响应
- **400**: 请求错误（验证失败、邮箱或用户名已存在）
- **500**: 服务器错误

---

### 2. 用户登录
**POST** `/api/auth/login`

使用邮箱和密码登录，获取 JWT 认证令牌。

#### 请求体
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "user_1234567890_abc123",
      "email": "user@example.com",
      "username": "john_doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  }
}
```

#### 错误响应
- **400**: 请求错误（邮箱格式错误、缺少字段）
- **401**: 认证失败（邮箱或密码错误）
- **500**: 服务器错误

---

## 🔐 JWT Token 使用

### Token 格式
```
Bearer <token>
```

### 在请求中使用 Token
在需要认证的 API 请求中，在 `Authorization` header 中包含 token：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token 有效期
- 默认有效期: 7 天
- 可通过环境变量 `JWT_EXPIRES_IN` 配置

---

## 🛠️ 认证中间件

使用 `authenticateToken()` 函数来验证需要认证的 API：

```typescript
import { authenticateToken } from '@/lib/middleware/auth';

export async function POST(req: NextRequest) {
  const auth = authenticateToken(req);
  if (!auth.isValid) {
    return auth.response;
  }
  
  // auth.user 包含用户信息
  const userId = auth.user?.userId;
  // ...
}
```

---

## 📝 环境变量配置

在 `.env` 文件中设置：

```env
# JWT 认证配置
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

**重要**: 
- `JWT_SECRET` 应该是一个强随机字符串
- 生产环境中必须更改默认值
- 建议使用至少 32 个字符的随机字符串

---

## 🔄 当前实现说明

### 临时存储
- 当前使用内存存储（`lib/auth/storage.ts`）
- **数据在服务器重启后会丢失**
- 实际应用中应替换为数据库操作

### 密码加密
- 当前使用 SHA-256 哈希（临时实现）
- **实际应用中应使用 bcrypt 或 argon2**

### JWT Token
- 当前使用简单的 HMAC-SHA256 实现
- **实际应用中建议使用 `jsonwebtoken` 库**

---

## 🚀 后续改进建议

1. **数据库集成**
   - 替换 `lib/auth/storage.ts` 为数据库操作
   - 使用 Prisma、TypeORM 或其他 ORM

2. **密码加密**
   - 安装 `bcrypt` 或 `argon2`
   - 更新 `lib/auth/utils.ts` 中的密码处理

3. **JWT 库**
   - 安装 `jsonwebtoken`
   - 更新 `lib/auth/utils.ts` 中的 token 生成和验证

4. **刷新 Token**
   - 实现 refresh token 机制
   - 添加 `/api/auth/refresh` 端点

5. **用户管理**
   - 添加 `/api/auth/me` 获取当前用户信息
   - 添加 `/api/auth/logout` 登出端点
   - 添加密码重置功能

---

## 📚 相关文件

- `lib/auth/types.ts` - 类型定义
- `lib/auth/utils.ts` - 工具函数（密码、token）
- `lib/auth/storage.ts` - 用户存储（临时实现）
- `lib/middleware/auth.ts` - 认证中间件
- `app/api/auth/register/route.ts` - 注册 API
- `app/api/auth/login/route.ts` - 登录 API

