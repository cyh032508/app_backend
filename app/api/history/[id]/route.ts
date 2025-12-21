// app/api/history/[id]/route.ts
import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { authenticateToken } from '@/lib/middleware/auth';
import { prisma } from '@/lib/db/prisma'; // 假設你的 prisma instance 在這裡

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 驗證身份
    const authResult = authenticateToken(req);
    if (!authResult.isValid) {
      return authResult.response;
    }
    const userId = authResult.user!.userId;
    const essayId = params.id;

    // 2. 獲取前端傳來的資料
    const data = await req.json();
    const { grade_result } = data;

    if (!grade_result) {
      return errorResponse('缺少 grade_result 資料', undefined, undefined, 400);
    }

    // 3. 欄位對齊 (Mapping)
    // 前端送來的結構 vs 資料庫欄位
    // score: "23/25" -> total_score
    // rank: 23       -> rank_position
    // percentile: 92 -> percentile
    // feedbacks: {}  -> dimension_feedbacks
    // reasoning: ""  -> feedback_json 或是 detailed_feedback

    const updateData: any = {
      // 確保 total_score 是字串
      total_score: String(grade_result.score || grade_result.total_score || '0'),
      
      // 更新 JSON 結構 (保留原始資料以防萬一)
      feedback_json: {
        full_grade_result: grade_result,
        reasoning: grade_result.reasoning, // 將 reasoning 存入 JSON
      },
    };

    // 只有當這些欄位存在時才更新 (避免把舊資料蓋成 null)
    if (grade_result.rank !== undefined) {
      updateData.rank_position = Number(grade_result.rank);
    }
    
    if (grade_result.percentile !== undefined) {
      updateData.percentile = Number(grade_result.percentile);
    }

    if (grade_result.feedbacks) {
      updateData.dimension_feedbacks = grade_result.feedbacks;
    }
    
    // 標記評分方式 (如果你的 schema 有這個欄位)
    updateData.scoring_method = 'rank-then-score';

    // 4. 執行資料庫更新
    // 我們需要找到屬於這篇 essay 的 score 記錄
    // 注意：這裡假設一個 essay 只有一個 active score
    
    // 先確認這篇 essay 是否屬於該用戶
    const essay = await prisma.essays.findFirst({
      where: {
        id: essayId,
        user_id: userId,
      },
    });

    if (!essay) {
      return errorResponse('找不到該文章或無權限修改', undefined, undefined, 404);
    }

    // 更新 Score
    const updatedScore = await prisma.scores.updateMany({
      where: {
        essay_id: essayId,
        user_id: userId, // 雙重保險
      },
      data: updateData,
    });

    if (updatedScore.count === 0) {
      // 如果還沒有 Score，可能需要 Create (視你的業務邏輯而定，通常 PATCH 是更新)
      return errorResponse('找不到對應的評分記錄，請先建立記錄', undefined, undefined, 404);
    }

    return successResponse({ success: true, updated: true }, '評分結果更新成功');

  } catch (error: any) {
    console.error('Error in PATCH /api/history/[id]:', error);
    return errorResponse(error.message || '更新失敗', undefined, undefined, 500);
  }
}

// 為了避免 405，也可以順便把 GET (單篇查詢) 或 DELETE 放在這裡
export async function GET(
    req: NextRequest, 
    { params }: { params: { id: string } }
) {
    // ... 實作查詢單篇文章的邏輯 ...
    return errorResponse('尚未實作單篇查詢', undefined, undefined, 501);
}