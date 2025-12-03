/**
 * Swagger 配置
 */

// @ts-ignore - swagger-jsdoc 类型定义问题
import swaggerJsdoc from 'swagger-jsdoc';

const options: any = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI作文批改系統 API',
      version: '2.0.0',
      description: 'AI作文批改系統的 RESTful API 文檔',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: '開發服務器',
      },
      {
        url: 'https://your-production-domain.com',
        description: '生產服務器',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: '健康檢查相關 API',
      },
      {
        name: 'OCR',
        description: 'OCR 識別相關 API',
      },
      {
        name: 'Text Processing',
        description: '文字處理相關 API',
      },
      {
        name: 'Grading',
        description: '評分相關 API',
      },
    ],
    components: {
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: '操作成功',
            },
            data: {
              type: 'object',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: '錯誤訊息',
            },
            error_code: {
              type: 'string',
              example: 'ERROR_CODE',
            },
            details: {
              type: 'object',
            },
          },
        },
        OCRResult: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'OCR 辨識完成',
            },
            result_text: {
              type: 'string',
              example: '識別的文字內容',
            },
            text: {
              type: 'string',
              example: '識別的文字內容',
            },
            ocr_text: {
              type: 'string',
              example: '識別的文字內容',
            },
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                original_ocr: {
                  type: 'object',
                },
                binary_ocr: {
                  type: 'object',
                },
                optimized: {
                  type: 'object',
                },
                total_time: {
                  type: 'number',
                  example: 31.0,
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    './app/api/**/route.ts', // 掃描所有 API 路由文件
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

