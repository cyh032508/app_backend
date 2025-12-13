import { NextRequest, NextResponse } from 'next/server';
import { validateJsonFields } from '@/lib/middleware/request-validator';
import { errorResponse, successResponse } from '@/lib/utils/response-helper';
import { generateText } from '@/lib/gemini-ocr/text-generation';
import {
  getGenerateSamplesPrompt,
  getRankSamplesPrompt,
  getInsertRankPrompt,
  getGenerateSamplesUserPrompt,
  getRankSamplesUserPrompt,
  getInsertRankUserPrompt,
} from '@/lib/prompts/rank-score-prompts';

/**
 * @swagger
 * /api/score_essay:
 *   post:
 *     summary: 使用 rank-then-score 方法對作文進行評分
 *     description: 生成 50 篇參考文章，進行排序，然後將實際作文插入排序中確定分數
 *     tags: [Grading]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *               - content
 *               - rubric
 *             properties:
 *               topic:
 *                 type: string
 *                 description: 作文題目
 *                 example: "我的夢想"
 *               content:
 *                 type: string
 *                 description: 作文內容
 *                 example: "我的夢想是成為一名醫生..."
 *               rubric:
 *                 type: string
 *                 description: 評分標準
 *                 example: "評分標準：內容 40%，結構 30%，語言 30%"
 *               sampleCount:
 *                 type: integer
 *                 description: 參考文章數量（可選，默認 50）
 *                 example: 50
 *     responses:
 *       200:
 *         description: 評分成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "操作成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: string
 *                       example: "18/25"
 *                     rank:
 *                       type: integer
 *                       example: 23
 *                     totalSamples:
 *                       type: integer
 *                       example: 50
 *                     percentile:
 *                       type: integer
 *                       example: 46
 *                     reasoning:
 *                       type: string
 *                       example: "簡短說明排名理由"
 *                     scoreDetails:
 *                       type: object
 *                       properties:
 *                         method:
 *                           type: string
 *                           example: "rank-then-score"
 *                         generatedSamples:
 *                           type: integer
 *                           example: 50
 *       400:
 *         description: 請求錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服務器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 驗證輸入
    const validation = validateJsonFields(data, ['topic', 'content', 'rubric']);
    if (!validation.isValid) {
      return validation.response;
    }

    const topic = data.topic.trim();
    const content = data.content.trim();
    const rubric = data.rubric.trim();
    const sampleCount = data.sampleCount || 50;

    if (!topic || !content || !rubric) {
      return errorResponse('topic、content 或 rubric 內容為空', undefined, undefined, 400);
    }

    if (sampleCount < 10 || sampleCount > 100) {
      return errorResponse('sampleCount 必須在 10-100 之間', undefined, undefined, 400);
    }

    console.log('🚀 [Rank-then-Score] 開始評分流程');
    console.log(`   - 題目: ${topic.substring(0, 30)}...`);
    console.log(`   - 內容長度: ${content.length} 字`);
    console.log(`   - 參考文章數量: ${sampleCount}`);

    // ========================================
    // Step 1: 生成參考文章
    // ========================================
    console.log('\n📝 [Step 1/3] 生成參考文章...');
    const generateSystemPrompt = getGenerateSamplesPrompt(sampleCount);
    const generateUserPrompt = getGenerateSamplesUserPrompt(topic, rubric);

    const generateResult = await generateText(generateSystemPrompt, generateUserPrompt, 0.8);

    if (!generateResult.success || !generateResult.text) {
      console.error('❌ [Step 1] 生成參考文章失敗:', generateResult.error);
      return errorResponse(
        generateResult.error || '無法生成參考文章',
        undefined,
        undefined,
        500
      );
    }

    let samples: Array<{ id: number; targetScore: number; content: string }> = [];
    try {
      // 提取 JSON 部分
      const jsonMatch = generateResult.text.match(/\{[\s\S]*\}/);
      let jsonString = jsonMatch ? jsonMatch[0] : generateResult.text;

      // 清理常見的 JSON 格式問題
      // 1. 移除可能的 markdown 代碼塊標記
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // 2. 嘗試修復末尾的逗號問題（trailing comma）
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

      // 嘗試解析 JSON
      const samplesData = JSON.parse(jsonString);

      if (!samplesData.samples || !Array.isArray(samplesData.samples)) {
        throw new Error('AI 返回的參考文章格式錯誤：缺少 samples 陣列');
      }

      if (samplesData.samples.length === 0) {
        throw new Error('AI 返回的參考文章數量為 0');
      }

      samples = samplesData.samples;
      console.log(`✅ [Step 1] 成功生成 ${samples.length} 篇參考文章`);
    } catch (parseError: any) {
      console.error('❌ [Step 1] JSON 解析錯誤:', parseError.message);
      console.log('❌ 錯誤位置:', parseError.message);
      console.log('📄 原始回應前 1000 字元:', generateResult.text.substring(0, 1000));
      console.log('📄 原始回應後 500 字元:', generateResult.text.substring(generateResult.text.length - 500));

      return errorResponse(
        `AI 返回的參考文章格式錯誤，無法解析。錯誤：${parseError.message}。請重試或減少 sampleCount 參數（建議使用 20-30）`,
        undefined,
        undefined,
        500
      );
    }

    // ========================================
    // Step 2: 對參考文章進行排序
    // ========================================
    console.log('\n📊 [Step 2/3] 對參考文章進行排序...');
    const rankSystemPrompt = getRankSamplesPrompt();
    const rankUserPrompt = getRankSamplesUserPrompt(topic, rubric, samples);

    const rankResult = await generateText(rankSystemPrompt, rankUserPrompt, 0.3);

    if (!rankResult.success || !rankResult.text) {
      console.error('❌ [Step 2] 排序參考文章失敗:', rankResult.error);
      return errorResponse(
        rankResult.error || '無法排序參考文章',
        undefined,
        undefined,
        500
      );
    }

    let rankedIds: number[] = [];
    try {
      const jsonMatch = rankResult.text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : rankResult.text;
      const rankData = JSON.parse(jsonString);

      if (!rankData.rankedIds || !Array.isArray(rankData.rankedIds)) {
        throw new Error('AI 返回的排序結果格式錯誤');
      }

      rankedIds = rankData.rankedIds;
      console.log(`✅ [Step 2] 排序完成，共 ${rankedIds.length} 篇文章`);
      console.log(`   - 最差文章 ID: ${rankedIds[0]}`);
      console.log(`   - 最好文章 ID: ${rankedIds[rankedIds.length - 1]}`);
    } catch (parseError: any) {
      console.error('❌ [Step 2] JSON 解析錯誤:', parseError.message);
      console.log('原始回應:', rankResult.text.substring(0, 500));
      return errorResponse(
        'AI 返回的排序結果格式錯誤，無法解析',
        undefined,
        undefined,
        500
      );
    }

    // 構建排序後的參考文章列表
    const rankedSamples = rankedIds.map((id, index) => {
      const sample = samples.find((s) => s.id === id);
      if (!sample) {
        throw new Error(`找不到 ID 為 ${id} 的參考文章`);
      }
      return {
        id: sample.id,
        content: sample.content,
        rank: index + 1, // 排名從 1 開始
      };
    });

    // ========================================
    // Step 3: 插入實際作文進行排序
    // ========================================
    console.log('\n🎯 [Step 3/3] 將實際作文插入排序...');
    const insertSystemPrompt = getInsertRankPrompt();
    const insertUserPrompt = getInsertRankUserPrompt(topic, rubric, content, rankedSamples);

    const insertResult = await generateText(insertSystemPrompt, insertUserPrompt, 0.3);

    if (!insertResult.success || !insertResult.text) {
      console.error('❌ [Step 3] 插入排序失敗:', insertResult.error);
      return errorResponse(
        insertResult.error || '無法確定作文排名',
        undefined,
        undefined,
        500
      );
    }

    let rank: number = 0;
    let reasoning: string = '';
    try {
      const jsonMatch = insertResult.text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : insertResult.text;
      const insertData = JSON.parse(jsonString);

      if (typeof insertData.rank !== 'number') {
        throw new Error('AI 返回的排名結果格式錯誤');
      }

      rank = insertData.rank;
      reasoning = insertData.reasoning || '';
      console.log(`✅ [Step 3] 插入排序完成`);
      console.log(`   - 排名: ${rank}/${sampleCount}`);
      console.log(`   - 理由: ${reasoning.substring(0, 50)}...`);
    } catch (parseError: any) {
      console.error('❌ [Step 3] JSON 解析錯誤:', parseError.message);
      console.log('原始回應:', insertResult.text.substring(0, 500));
      return errorResponse(
        'AI 返回的排名結果格式錯誤，無法解析',
        undefined,
        undefined,
        500
      );
    }

    // ========================================
    // Step 4: 計算最終分數
    // ========================================
    console.log('\n🎓 [Step 4/4] 計算最終分數...');

    // 確保排名在有效範圍內
    if (rank < 1 || rank > sampleCount) {
      console.error(`❌ 排名超出範圍: ${rank}`);
      rank = Math.max(1, Math.min(sampleCount, rank));
      console.log(`   - 已調整排名為: ${rank}`);
    }

    // 根據排名計算分數 (0-25)
    const scoreValue = Math.round((rank / sampleCount) * 25);
    const score = `${scoreValue}/25`;

    // 計算百分位
    const percentile = Math.round((rank / sampleCount) * 100);

    console.log(`✅ [Step 4] 計算完成`);
    console.log(`   - 最終分數: ${score}`);
    console.log(`   - 百分位: ${percentile}%`);

    console.log('\n🎉 [Rank-then-Score] 評分流程完成！\n');

    // 構建符合前端接口定義的響應格式
    const responseData = {
      score: score, // string: 總分 (e.g., "18/25")
      rank: rank, // number: 在 N 篇中的排名
      totalSamples: sampleCount, // number: 參考文章總數
      percentile: percentile, // number: 百分位
      reasoning: reasoning, // string: 排名理由
      scoreDetails: {
        method: 'rank-then-score', // string: 評分方法
        generatedSamples: samples.length, // number: 生成的樣本數
      },
    };

    return successResponse(responseData);
  } catch (error: any) {
    console.error('❌ [Rank-then-Score] 處理錯誤:', error.message);
    return errorResponse(error.message || '處理過程發生錯誤', undefined, undefined, 500);
  }
}
