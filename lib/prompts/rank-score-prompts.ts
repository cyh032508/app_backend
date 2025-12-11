/**
 * Rank-then-Score 評分系統提示詞
 * 用於作文評分的 rank-then-score 方法
 */

/**
 * 生成參考文章樣本的系統提示詞
 * @param count 要生成的文章數量（默認 50）
 * @returns 系統提示詞字串
 */
export function getGenerateSamplesPrompt(count: number = 50): string {
  return `你是一位資深的國文教師。請根據提供的題目和評分標準，生成 ${count} 篇完整的作文範例。

要求：
1. 文章質量應該常態分布於 0-25 分的範圍
2. 包含各種水平的文章：
   - 優秀 (20-25 分)：立意深刻、文采飛揚、結構嚴謹
   - 良好 (15-19 分)：內容充實、表達流暢、結構清晰
   - 中等 (10-14 分)：內容尚可、表達平實、結構基本完整
   - 及格 (6-9 分)：內容簡單、表達欠佳、結構鬆散
   - 不及格 (0-5 分)：文不對題、錯誤百出、結構混亂
3. 每篇文章長度需為 0 - 550字以內
4. 文章內容必須與題目相關
5. 確保分數分布符合常態分布（中間多、兩端少）

請以純 JSON 格式回應，不要包含任何 Markdown 標記：
{
  "samples": [
    {"id": 1, "targetScore": 0, "content": "文章內容..."},
    {"id": 2, "targetScore": 1, "content": "文章內容..."},
    ...
    {"id": ${count}, "targetScore": 25, "content": "文章內容..."}
  ]
}`;
}

/**
 * 排序參考文章的系統提示詞
 * @returns 系統提示詞字串
 */
export function getRankSamplesPrompt(): string {
  return `你是一位資深的國文評分專家。請根據提供的評分標準，對這些作文按質量進行排序。

要求：
1. 嚴格按照評分標準進行評估
2. 考慮以下方面：
   - 立意取材：主題是否明確、取材是否恰當
   - 表達與文采：文字表達是否流暢、修辭運用是否得當
   - 組織結構：結構是否完整、邏輯是否連貫
   - 格式規範：是否有錯別字、標點符號使用是否正確
3. 從質量最差排到最好（1 號位置 = 最差，最後位置 = 最好）
4. 只需返回排序後的 ID 列表

請以純 JSON 格式回應，不要包含任何 Markdown 標記：
{
  "rankedIds": [1, 15, 32, ...]
}

註：rankedIds 陣列中的第一個 ID 代表質量最差的文章，最後一個 ID 代表質量最好的文章。`;
}

/**
 * 插入排序的系統提示詞
 * @returns 系統提示詞字串
 */
export function getInsertRankPrompt(): string {
  return `你是一位資深的國文評分專家。現在有一篇實際的學生作文需要評分。

已有 50 篇已排序的參考文章（從最差到最好）。請將這篇實際作文插入到這個排序中，確定它應該排在第幾名。

要求：
1. 根據評分標準進行比較
2. 綜合考慮以下維度：
   - 立意取材：主題立意、取材選擇、內容深度
   - 表達與文采：文字表達、修辭運用、文筆優美度
   - 組織結構：文章結構、段落安排、邏輯連貫性
   - 格式及錯別字：格式規範、錯別字、標點符號使用
3. 確定這篇作文的質量水平
4. 給出它在 50 篇中的排名位置（1 = 最差，50 = 最好）
5. 簡要說明排名理由

請以純 JSON 格式回應，不要包含任何 Markdown 標記：
{
  "rank": 23,
  "reasoning": "簡短說明排名理由（1-2 句話）"
}

註：rank 值為 1 代表比所有參考文章都差，rank 值為 50 代表比所有參考文章都好。`;
}

/**
 * 生成參考文章的用戶提示詞
 * @param topic 作文題目
 * @param rubric 評分標準
 * @returns 用戶提示詞字串
 */
export function getGenerateSamplesUserPrompt(topic: string, rubric: string): string {
  return `請生成參考文章範例。

作文題目：${topic}

評分標準：
${rubric}`;
}

/**
 * 排序參考文章的用戶提示詞
 * @param topic 作文題目
 * @param rubric 評分標準
 * @param samples 參考文章陣列
 * @returns 用戶提示詞字串
 */
export function getRankSamplesUserPrompt(
  topic: string,
  rubric: string,
  samples: Array<{ id: number; targetScore: number; content: string }>
): string {
  const samplesText = samples
    .map((s) => `[ID: ${s.id}] (目標分數: ${s.targetScore})\n${s.content}`)
    .join('\n\n---\n\n');

  return `請對以下作文進行排序。

作文題目：${topic}

評分標準：
${rubric}

參考文章（共 ${samples.length} 篇）：

${samplesText}`;
}

/**
 * 插入排序的用戶提示詞
 * @param topic 作文題目
 * @param rubric 評分標準
 * @param content 實際作文內容
 * @param rankedSamples 已排序的參考文章
 * @returns 用戶提示詞字串
 */
export function getInsertRankUserPrompt(
  topic: string,
  rubric: string,
  content: string,
  rankedSamples: Array<{ id: number; content: string; rank: number }>
): string {
  const samplesText = rankedSamples
    .map((s) => `[排名: ${s.rank}] [ID: ${s.id}]\n${s.content}`)
    .join('\n\n---\n\n');

  return `請將以下實際作文插入到已排序的參考文章中。

作文題目：${topic}

評分標準：
${rubric}

實際作文內容：
${content}

---

已排序的參考文章（共 ${rankedSamples.length} 篇，從最差到最好）：

${samplesText}`;
}
