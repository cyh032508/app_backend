# AI作文批改系統 API - Next.js 版本

这是从 Flask 迁移到 Next.js 的后端 API 服务。

## 🚀 快速开始

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 环境变量配置

复制 `.env.example` 为 `.env` 并填入相应的配置：

```bash
cp .env.example .env
```

主要配置项：
- `GEMINI_API_KEY`: Gemini API 密钥
- `GEMINI_API_URL`: Gemini API 端点
- `GCP_PROJECT_ID`: Google Cloud 项目 ID（用于 Vertex AI）
- `GCP_LOCATION`: Google Cloud 位置
- `GEMINI_MODEL`: Gemini 模型名称（默认 gemini-2.5-pro）
- `PYTHON_OCR_SERVICE_URL`: Python OCR 服务 URL（可选，用于 PyTorch 模型）

### 运行开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
npm start
```

## 📋 API 端点

### 健康检查
- `GET /api` - 返回 API 状态和可用端点列表

### OCR 识别
- `POST /api/gemini_ocr` - 使用 Gemini AI 进行 OCR 识别（推荐）
- `POST /api/upload_segment_ocr` - 使用 ResNet 模型进行 OCR（需要 Python 服务）
- `POST /api/upload_segment_ocr_EffecientNet` - 使用 EfficientNet 模型进行 OCR（需要 Python 服务）

### 文字处理
- `POST /api/refine_ocr_text` - 优化 OCR 识别结果

### 评分相关
- `POST /api/generate_rubric` - 根据题目生成评分标准
- `POST /api/grade_essay` - 根据评分标准对作文进行评分

## 🔧 技术栈

- **Next.js 14**: React 框架，提供 API Routes
- **TypeScript**: 类型安全
- **Vertex AI**: Google Cloud Vertex AI（用于 Gemini OCR 和文本生成）
- **Sharp**: 图片处理库

## 📝 迁移说明

### 已迁移的功能

✅ 所有 API 路由已迁移到 Next.js API Routes
✅ 工具函数（response-helper, file-validator）
✅ 中间件（request-validator）
✅ Gemini OCR Pipeline（使用 Vertex AI SDK）
✅ 图片处理（使用 Sharp 替代 OpenCV）

### 需要额外配置的功能

⚠️ **PyTorch OCR 模型**：由于 PyTorch 是 Python 库，无法直接在 Node.js 中使用。有两个选择：

1. **保留 Python 微服务**（推荐）：
   - 保持原有的 Python Flask 服务运行在单独的端口（如 5001）
   - 设置 `PYTHON_OCR_SERVICE_URL` 环境变量
   - Next.js API 会将请求转发到 Python 服务

2. **使用替代方案**：
   - 使用 `/api/gemini_ocr` 端点（推荐，准确度更高）
   - 或使用其他 Node.js OCR 库（如 Tesseract.js）

### 目录结构

```
Backend/
├── app/
│   └── api/              # Next.js API Routes
│       ├── route.ts      # 健康检查
│       ├── gemini_ocr/
│       ├── grade_essay/
│       ├── refine_ocr_text/
│       ├── generate_rubric/
│       └── ...
├── lib/
│   ├── utils/            # 工具函数
│   ├── middleware/        # 中间件
│   ├── prompts/          # Prompt 模板
│   └── gemini-ocr/       # Gemini OCR Pipeline
├── public/               # 静态文件
├── static/              # 上传和输出目录
└── checkpoints/         # 模型检查点（用于 Python 服务）
```

## 🔐 安全注意事项

1. **环境变量**：确保 `.env` 文件不被提交到版本控制
2. **CORS**：在生产环境中限制 `ALLOWED_ORIGINS`
3. **文件大小**：已设置 10MB 的文件大小限制
4. **API 密钥**：使用环境变量管理敏感信息

## 🐛 故障排除

### Vertex AI 初始化错误

如果遇到 Vertex AI 初始化错误，请确保：
1. 已安装 Google Cloud SDK
2. 已设置正确的 `GCP_PROJECT_ID` 和 `GCP_LOCATION`
3. 已配置 Google Cloud 认证（使用 `gcloud auth application-default login`）

### Python OCR 服务连接失败

如果使用 PyTorch OCR 模型：
1. 确保 Python 服务正在运行
2. 检查 `PYTHON_OCR_SERVICE_URL` 环境变量是否正确
3. 检查 Python 服务的 CORS 配置

## 📚 相关文档

- [Next.js 文档](https://nextjs.org/docs)
- [Vertex AI 文档](https://cloud.google.com/vertex-ai/docs)
- [Gemini API 文档](https://ai.google.dev/docs)

## 📄 许可证

与原项目保持一致。

