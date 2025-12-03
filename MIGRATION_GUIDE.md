# 迁移指南：Flask 到 Next.js

本指南说明如何从 Flask 后端迁移到 Next.js 后端。

## 📋 迁移概览

### ✅ 已迁移的功能

1. **所有 API 路由**
   - `/api` - 健康检查
   - `/api/gemini_ocr` - Gemini OCR 识别
   - `/api/grade_essay` - 作文评分
   - `/api/refine_ocr_text` - 文字优化
   - `/api/generate_rubric` - 生成评分标准
   - `/api/upload_segment_ocr` - ResNet OCR（需要 Python 服务）
   - `/api/upload_segment_ocr_EffecientNet` - EfficientNet OCR（需要 Python 服务）

2. **工具函数**
   - `response-helper.ts` - 统一响应格式
   - `file-validator.ts` - 文件验证

3. **中间件**
   - `request-validator.ts` - 请求验证

4. **Gemini OCR Pipeline**
   - 图片处理（使用 Sharp）
   - OCR 识别（使用 Vertex AI）
   - 交叉比对优化

### ⚠️ 需要额外配置

**PyTorch OCR 模型**：由于 PyTorch 是 Python 库，无法直接在 Node.js 中使用。

**解决方案**：

1. **保留 Python 微服务**（推荐）：
   ```bash
   # 在另一个终端运行 Python 服务
   cd Backend
   python app.py  # 运行在端口 5001
   ```

   然后在 `.env` 文件中设置：
   ```
   PYTHON_OCR_SERVICE_URL=http://localhost:5001
   ```

2. **使用 Gemini OCR**（推荐，准确度更高）：
   - 直接使用 `/api/gemini_ocr` 端点
   - 不需要 Python 服务

## 🚀 启动步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `env.example` 为 `.env`：

```bash
cp env.example .env
```

编辑 `.env` 文件，填入必要的配置：
- `GEMINI_API_KEY`
- `GEMINI_API_URL`
- `GCP_PROJECT_ID`
- `GCP_LOCATION`
- `GEMINI_MODEL`

### 3. 配置 Google Cloud 认证

如果使用 Vertex AI（Gemini OCR），需要配置 Google Cloud 认证：

```bash
# 安装 Google Cloud SDK（如果还没有）
# macOS
brew install google-cloud-sdk

# 登录并设置默认项目
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

### 4. 运行开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 5. （可选）运行 Python OCR 服务

如果需要使用 PyTorch OCR 模型：

```bash
# 在另一个终端
cd Backend
python app.py
```

确保 `.env` 中设置了 `PYTHON_OCR_SERVICE_URL=http://localhost:5001`

## 🔄 API 兼容性

所有 API 端点保持与 Flask 版本相同的接口，前端代码无需修改。

### 请求格式

**文件上传**：
```javascript
const formData = new FormData();
formData.append('image', file);

fetch('/api/gemini_ocr', {
  method: 'POST',
  body: formData
});
```

**JSON 请求**：
```javascript
fetch('/api/grade_essay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: '题目',
    content: '作文内容',
    rubric: '评分标准'
  })
});
```

### 响应格式

所有响应保持统一格式：

**成功响应**：
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**错误响应**：
```json
{
  "success": false,
  "error": "错误信息",
  "error_code": "ERROR_CODE",
  "details": { ... }
}
```

## 📁 目录结构对比

### Flask 版本
```
Backend/
├── app.py
├── routes/
│   ├── gemini_ocr.py
│   ├── grade_essay.py
│   └── ...
├── utils/
│   ├── response_helper.py
│   └── file_validator.py
└── gemini_ocr_pipeline/
    ├── pipeline.py
    ├── ocr.py
    └── ...
```

### Next.js 版本
```
Backend/
├── app/
│   └── api/              # Next.js API Routes
│       ├── route.ts
│       ├── gemini_ocr/
│       ├── grade_essay/
│       └── ...
├── lib/
│   ├── utils/            # 工具函数
│   ├── middleware/       # 中间件
│   ├── prompts/          # Prompt 模板
│   └── gemini-ocr/       # Gemini OCR Pipeline
├── package.json
└── next.config.js
```

## 🔧 技术栈变化

| 功能 | Flask 版本 | Next.js 版本 |
|------|-----------|-------------|
| Web 框架 | Flask | Next.js |
| 语言 | Python | TypeScript/JavaScript |
| 图片处理 | OpenCV | Sharp |
| AI SDK | Vertex AI (Python) | Vertex AI (Node.js) |
| OCR 模型 | PyTorch | Vertex AI Gemini |

## 🐛 常见问题

### 1. Vertex AI 初始化错误

**错误**：`Error: Could not load the default credentials`

**解决**：
```bash
gcloud auth application-default login
```

### 2. Python OCR 服务连接失败

**错误**：`无法连接到 Python OCR 服务`

**解决**：
1. 确保 Python 服务正在运行
2. 检查 `PYTHON_OCR_SERVICE_URL` 环境变量
3. 检查 Python 服务的 CORS 配置

### 3. 图片处理错误

**错误**：`无法處理圖片`

**解决**：
- 确保安装了 `sharp`：`npm install sharp`
- 检查图片格式是否支持

## 📚 更多信息

- [Next.js 文档](https://nextjs.org/docs)
- [Vertex AI Node.js SDK](https://cloud.google.com/vertex-ai/docs/start/client-libraries)
- [Sharp 文档](https://sharp.pixelplumbing.com/)

