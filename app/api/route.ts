import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'AI作文批改系統 API 運行正常',
    version: '2.0.0',
    endpoints: [
      'POST /api/upload_segment_ocr - OCR識別 (ResNet模型)',
      'POST /api/upload_segment_ocr_EffecientNet - OCR識別 (EfficientNet模型)',
      'POST /api/refine_ocr_text - 文字優化',
      'POST /api/gemini_ocr - OCR識別 (Gemini AI - 推薦)',
      'POST /api/grade_essay - 作文評分',
      'POST /api/generate_rubric - 生成評分標準',
    ],
  });
}

