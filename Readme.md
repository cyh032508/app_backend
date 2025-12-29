# AI 作文批改系統 Backend

基於 Next.js 14 構建的 AI 作文批改系統後端 API，整合 Gemini AI 提供 OCR 識別、智能評分和評語生成功能。

## 技術棧

- **框架**: Next.js 14 (App Router)
- **語言**: TypeScript
- **AI 服務**: Google Vertex AI (Gemini 2.5 Flash Lite)
- **資料庫**: Supabase PostgreSQL (Prisma ORM)
- **儲存**: Vercel Blob Storage
- **認證**: JWT
- **文檔**: Swagger/OpenAPI

## 核心功能

- **OCR 識別**: 支援作文稿紙照片識別，採用原始圖片 + 二值化圖片交叉比對優化
- **智能評分**: 
  - Rank-then-Score: 生成參考文章進行相對排名評分
  - Direct Grading: 基於評分標準的直接評分
- **評語生成**: 五維度評語（立意取材、表達與文采、組織結構、格式及錯別字、綜合表現）
- **評分標準生成**: 根據題目自動生成詳細評分標準
- **用戶系統**: 註冊、登入、密碼重置、歷史記錄管理

## 快速開始

### 環境要求

- Node.js 18+
- pnpm / npm / yarn
- Google Cloud Project (Vertex AI)
- Supabase 專案
- Vercel 帳號 (Blob Storage)

### 安裝

```bash
# 安裝依賴
pnpm install

# 生成 Prisma Client
pnpm prisma:generate
```

### 環境變數配置

複製 `env.example` 並配置以下環境變數：

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

# 資料庫
DATABASE_URL=postgresql://user:password@host:6543/db?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/db

# 認證
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# 儲存
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx...
```

**認證方式** (三選一):
1. `GOOGLE_APPLICATION_CREDENTIALS_JSON`: 完整的服務帳號 JSON
2. `CLIENT_EMAIL` + `PRIVATE_KEY`: 拆分環境變數（推薦，避免 Vercel 大小限制）
3. `GOOGLE_APPLICATION_CREDENTIALS`: 本地檔案路徑

### 資料庫遷移

```bash
# 推送 schema 到資料庫
pnpm prisma:push

# 或使用遷移
pnpm prisma:migrate
```

### 開發

```bash
# 啟動開發伺服器
pnpm dev
```

訪問 `http://localhost:3000/api-docs` 查看 Swagger API 文檔。

## API 端點

### 認證
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/logout` - 用戶登出
- `POST /api/auth/reset-password` - 重置密碼

### OCR & 處理
- `POST /api/gemini_ocr` - OCR 識別（支援圖片上傳）
- `POST /api/upload_image` - 上傳圖片到 Blob Storage

### 評分 & 評語
- `POST /api/score_essay` - Rank-then-Score 評分
- `POST /api/grade_essay` - 直接評分
- `POST /api/feedback_essay` - 生成五維度評語
- `POST /api/generate_rubric` - 生成評分標準

### 歷史記錄
- `POST /api/history` - 保存批改歷史
- `GET /api/history` - 查詢歷史記錄
- `PATCH /api/history/[id]` - 更新歷史記錄

## 專案結構

```
.
├── app/
│   ├── api/              # API 路由
│   │   ├── auth/         # 認證相關
│   │   ├── gemini_ocr/   # OCR 識別
│   │   └── ...
│   └── api-docs/         # Swagger 文檔頁面
├── lib/
│   ├── gemini-ocr/       # OCR 核心邏輯
│   │   ├── ocr.ts        # OCR 識別
│   │   ├── text-generation.ts  # 文本生成
│   │   └── pipeline.ts   # 處理流程
│   ├── auth/             # 認證工具
│   ├── db/               # 資料庫配置
│   └── utils/            # 工具函數
├── prisma/
│   └── schema.prisma     # 資料庫 Schema
└── public/               # 靜態資源
```

## 開發命令

```bash
# 開發
pnpm dev

# 構建
pnpm build

# 啟動生產伺服器
pnpm start

# Prisma
pnpm prisma:generate      # 生成 Prisma Client
pnpm prisma:push          # 推送 schema
pnpm prisma:migrate       # 資料庫遷移
pnpm prisma:studio        # 打開 Prisma Studio

# 程式碼檢查
pnpm lint
```

## 部署

### Vercel (推薦)

1. 連接 GitHub 倉庫
2. 配置環境變數
3. 部署自動完成

### 環境變數配置

在 Vercel Dashboard 中設置所有必需的環境變數。注意：
- `PRIVATE_KEY` 需要保留換行符，使用 `\n` 轉義
- 或使用 `GOOGLE_APPLICATION_CREDENTIALS_JSON`（注意 Vercel 環境變數大小限制）

## 安全注意事項

- 所有敏感資訊通過環境變數管理
- `.env` 檔案已加入 `.gitignore`
- JWT Secret 最小長度 32 字元
- 日誌不輸出敏感資訊（Client Email、Private Key 等）
- API 錯誤響應不洩露內部實現細節

## 效能優化

- OCR 處理採用並行任務（原始圖片 + 二值化圖片）
- 使用 Supabase 連接池 (`DATABASE_URL`) 優化資料庫連接
- 圖片處理使用 Sharp 進行優化
- API 響應統一格式，便於前端處理

## 授權

Private - All Rights Reserved
