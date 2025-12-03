# Swagger API 文档

本项目已集成 Swagger API 文档，方便开发和测试 API。

## 📖 访问文档

启动开发服务器后，访问以下地址查看 API 文档：

```
http://localhost:3000/api-docs
```

## 🔧 功能特性

- ✅ 自动生成 API 文档（基于 JSDoc 注释）
- ✅ 交互式 API 测试界面
- ✅ 完整的请求/响应示例
- ✅ 支持文件上传测试
- ✅ 支持 JSON 请求测试

## 📝 API 端点文档

所有 API 端点都已添加 Swagger 注释，包括：

### Health
- `GET /api` - 健康检查端点

### OCR
- `POST /api/gemini_ocr` - 使用 Gemini AI 进行 OCR 识别（推荐）
- `POST /api/upload_segment_ocr` - 使用 ResNet 模型进行 OCR
- `POST /api/upload_segment_ocr_EffecientNet` - 使用 EfficientNet 模型进行 OCR

### Text Processing
- `POST /api/refine_ocr_text` - 优化 OCR 识别结果

### Grading
- `POST /api/generate_rubric` - 根据题目生成评分标准
- `POST /api/grade_essay` - 根据评分标准对作文进行评分

## 🛠️ 使用方法

### 1. 查看文档

访问 `http://localhost:3000/api-docs` 查看完整的 API 文档。

### 2. 测试 API

在 Swagger UI 中：
1. 展开你想测试的 API 端点
2. 点击 "Try it out" 按钮
3. 填写请求参数
4. 点击 "Execute" 执行请求
5. 查看响应结果

### 3. 文件上传测试

对于需要上传文件的 API（如 `/api/gemini_ocr`）：
1. 在 Swagger UI 中找到对应的端点
2. 点击 "Try it out"
3. 在 `image` 字段中点击 "Choose File" 选择图片
4. 点击 "Execute" 执行

## 📋 Swagger JSON

你也可以直接获取 Swagger JSON 规范：

```
GET /api/swagger
```

这个端点返回完整的 OpenAPI 3.0 规范 JSON，可以用于：
- 导入到其他 API 测试工具（如 Postman）
- 生成客户端 SDK
- 集成到 CI/CD 流程

## 🔄 更新文档

当你添加新的 API 端点或修改现有端点时：

1. 在对应的 `route.ts` 文件中添加 JSDoc 注释
2. 使用 `@swagger` 标签开始注释
3. 按照 OpenAPI 3.0 规范编写注释
4. 重启开发服务器，文档会自动更新

### 示例注释格式

```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     summary: API 描述
 *     tags: [TagName]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功响应
 */
export async function POST(req: NextRequest) {
  // ...
}
```

## 📚 相关资源

- [OpenAPI 3.0 规范](https://swagger.io/specification/)
- [Swagger JSDoc 文档](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI 文档](https://swagger.io/tools/swagger-ui/)

