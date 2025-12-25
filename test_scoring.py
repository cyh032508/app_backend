"""
作文評分測試腳本

功能：
1. 讀取 ocr_results_new 資料夾內所有 *_optimized.txt 檔案
2. 提取【稿紙正文】下的內容
3. 使用 rubric_output.txt 作為評分標準
4. 呼叫 /api/score_essay API 進行評分
5. 將結果儲存到 CSV 檔案，方便後續分析

使用方法：
python test_scoring.py
"""

import os
import re
import requests
import json
import csv
from datetime import datetime
from pathlib import Path

# ===== 設定區域 =====
API_BASE_URL = "https://app-backend-teal.vercel.app"
OCR_RESULTS_DIR = "ocr_results_new"
RUBRIC_FILE = "rubric_output.txt"
OUTPUT_CSV = "scoring_results_25.csv"

# 評分設定
TOPIC = """問題一：復活節島的原始文明為何消失殆盡
問題二：如何避免重蹈復活節的覆徹"""

SAMPLE_COUNT = 25  # rank-then-score 方法的參考樣本數
# ==================


def read_rubric(rubric_file):
    """
    讀取評分標準檔案

    Args:
        rubric_file: 評分標準檔案路徑

    Returns:
        評分標準文字（移除 JSON 格式標記）
    """
    try:
        with open(rubric_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 移除 ```json 和 ``` 標記
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'\s*```\s*$', '', content)

        return content.strip()

    except Exception as e:
        raise Exception(f"讀取評分標準失敗：{e}")


def extract_essay_content(file_path):
    """
    從 optimized.txt 檔案中提取【稿紙正文】下的內容

    Args:
        file_path: optimized.txt 檔案路徑

    Returns:
        作文內容文字
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 尋找【稿紙正文】標記
        match = re.search(r'【稿紙正文】\s*\n(.*)', content, re.DOTALL)

        if not match:
            # 如果找不到標記，嘗試其他可能的格式
            print(f"  ⚠ 警告：找不到【稿紙正文】標記，使用整份內容")
            return content.strip()

        essay_content = match.group(1).strip()
        return essay_content

    except Exception as e:
        raise Exception(f"讀取作文內容失敗：{e}")


def score_essay(content, rubric, topic, sample_count, api_url):
    """
    調用 API 進行作文評分

    Args:
        content: 作文內容
        rubric: 評分標準
        topic: 作文題目
        sample_count: 參考樣本數
        api_url: API 端點 URL

    Returns:
        評分結果（dict）
    """
    try:
        # 準備 JSON 資料
        payload = {
            "topic": topic,
            "content": content,
            "rubric": rubric,
            "sampleCount": sample_count
        }

        # 設定請求標頭
        headers = {
            "Content-Type": "application/json"
        }

        # 發送 POST 請求（設定較長的超時時間，因為評分需要時間）
        response = requests.post(
            api_url,
            json=payload,
            headers=headers,
            timeout=300
        )

        # 檢查回應狀態
        if response.status_code != 200:
            raise Exception(f"API 錯誤 ({response.status_code}): {response.text}")

        # 解析 JSON 回應
        result = response.json()

        if not result.get('success'):
            raise Exception(f"API 返回失敗：{result.get('message', '未知錯誤')}")

        return result.get('data', {})

    except Exception as e:
        raise Exception(f"評分失敗：{e}")


def get_optimized_files(directory):
    """
    取得所有 *_optimized.txt 檔案，並按編號排序

    Args:
        directory: 目標資料夾

    Returns:
        排序後的檔案路徑列表
    """
    files = []
    for filename in os.listdir(directory):
        if filename.endswith('_optimized.txt'):
            files.append(os.path.join(directory, filename))

    # 排序（按檔名中的數字）
    def sort_key(path):
        filename = os.path.basename(path)
        # 提取檔名開頭的數字
        match = re.match(r'^(\d+)', filename)
        if match:
            return int(match.group(1))
        return 0

    files.sort(key=sort_key)
    return files


def save_results_to_csv(results, output_file):
    """
    將評分結果儲存到 CSV 檔案

    Args:
        results: 評分結果列表
        output_file: 輸出 CSV 檔案路徑
    """
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = [
            '檔案名稱',
            '分數',
            '排名',
            '總樣本數',
            '百分位',
            '評分說明',
            '作文內容長度',
            '處理時間'
        ]

        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for result in results:
            writer.writerow(result)

    print(f"\n✓ 評分結果已儲存至：{output_file}")


def main():
    """主程式"""
    print("\n" + "=" * 80)
    print("作文評分測試腳本")
    print("=" * 80)

    api_endpoint = f"{API_BASE_URL}/api/score_essay"
    print(f"OCR 結果資料夾：{OCR_RESULTS_DIR}")
    print(f"評分標準檔案：{RUBRIC_FILE}")
    print(f"API 端點：{api_endpoint}")
    print(f"參考樣本數：{SAMPLE_COUNT}")
    print("=" * 80)
    print()

    # 檢查評分標準檔案
    if not os.path.exists(RUBRIC_FILE):
        print(f"✗ 錯誤：找不到評分標準檔案 {RUBRIC_FILE}")
        print("請先執行 generate_rubric.py 生成評分標準")
        return

    # 讀取評分標準
    try:
        print("讀取評分標準...")
        rubric = read_rubric(RUBRIC_FILE)
        print(f"✓ 評分標準載入成功（長度：{len(rubric)} 字元）\n")
    except Exception as e:
        print(f"✗ {e}")
        return

    # 檢查 OCR 結果資料夾
    if not os.path.exists(OCR_RESULTS_DIR):
        print(f"✗ 錯誤：找不到資料夾 {OCR_RESULTS_DIR}")
        return

    # 取得所有 optimized.txt 檔案
    files = get_optimized_files(OCR_RESULTS_DIR)
    print(f"找到 {len(files)} 個待評分檔案\n")

    if len(files) == 0:
        print("✗ 沒有找到任何 *_optimized.txt 檔案")
        return

    # 統計資料
    results = []
    stats = {
        'total': len(files),
        'success': 0,
        'failed': 0,
        'start_time': datetime.now()
    }

    # 處理每個檔案
    for i, file_path in enumerate(files, 1):
        filename = os.path.basename(file_path)
        print(f"[{i}/{len(files)}] 處理：{filename}")

        start_time = datetime.now()

        try:
            # 提取作文內容
            print("  → 提取作文內容...")
            essay_content = extract_essay_content(file_path)
            content_length = len(essay_content)
            print(f"  → 內容長度：{content_length} 字元")

            # 呼叫評分 API
            print("  → 呼叫評分 API...")
            score_result = score_essay(
                content=essay_content,
                rubric=rubric,
                topic=TOPIC,
                sample_count=SAMPLE_COUNT,
                api_url=api_endpoint
            )

            # 計算處理時間
            elapsed_time = (datetime.now() - start_time).total_seconds()

            # 提取關鍵資訊
            score = score_result.get('score', 'N/A')
            rank = score_result.get('rank', 'N/A')
            total_samples = score_result.get('totalSamples', SAMPLE_COUNT)
            percentile = score_result.get('percentile', 'N/A')
            reasoning = score_result.get('reasoning', '')

            print(f"  ✓ 評分完成：{score} (排名 {rank}/{total_samples}, 百分位 {percentile}%)")
            print(f"  → 耗時：{elapsed_time:.2f}s")
            print(f"  → 說明：{reasoning[:100]}..." if len(reasoning) > 100 else f"  → 說明：{reasoning}")
            print()

            # 儲存結果
            results.append({
                '檔案名稱': filename,
                '分數': score,
                '排名': rank,
                '總樣本數': total_samples,
                '百分位': percentile,
                '評分說明': reasoning,
                '作文內容長度': content_length,
                '處理時間': f"{elapsed_time:.2f}s"
            })

            stats['success'] += 1

        except Exception as e:
            print(f"  ✗ 錯誤：{e}\n")
            stats['failed'] += 1

            # 儲存失敗記錄
            results.append({
                '檔案名稱': filename,
                '分數': 'ERROR',
                '排名': 'N/A',
                '總樣本數': 'N/A',
                '百分位': 'N/A',
                '評分說明': str(e),
                '作文內容長度': 'N/A',
                '處理時間': 'N/A'
            })

    # 顯示統計結果
    total_elapsed = (datetime.now() - stats['start_time']).total_seconds()

    print("=" * 80)
    print("評分完成")
    print("=" * 80)
    print(f"總檔案數：{stats['total']}")
    print(f"成功評分：{stats['success']}")
    print(f"失敗：{stats['failed']}")
    print(f"總耗時：{total_elapsed:.2f}s")

    if stats['success'] > 0:
        avg_time = total_elapsed / stats['success']
        print(f"平均評分時間：{avg_time:.2f}s")

    print("=" * 80)

    # 儲存結果到 CSV
    if len(results) > 0:
        save_results_to_csv(results, OUTPUT_CSV)

        # 顯示分數統計
        print("\n" + "=" * 80)
        print("分數統計")
        print("=" * 80)

        scores = []
        for result in results:
            if result['分數'] != 'ERROR' and result['分數'] != 'N/A':
                # 提取數字部分（例如 "18/25" -> 18）
                match = re.match(r'^(\d+(?:\.\d+)?)', str(result['分數']))
                if match:
                    scores.append(float(match.group(1)))

        if scores:
            print(f"有效評分數：{len(scores)}")
            print(f"最高分：{max(scores):.1f}")
            print(f"最低分：{min(scores):.1f}")
            print(f"平均分：{sum(scores)/len(scores):.2f}")
            print(f"中位數：{sorted(scores)[len(scores)//2]:.1f}")

        print("=" * 80)
        print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n✗ 使用者中斷執行")
    except Exception as e:
        print(f"\n✗ 執行錯誤：{e}")
