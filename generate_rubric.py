"""
生成評分標準腳本

功能：
呼叫 /api/generate_rubric API 根據作文題目自動生成評分標準

使用方法：
python generate_rubric.py
"""

import requests
import json
from datetime import datetime

# ===== 設定區域 =====
API_BASE_URL = "https://app-backend-teal.vercel.app"

# 作文題目
TOPIC = """問題一：復活節島的原始文明為何消失殆盡
問題二：如何避免重蹈復活節的覆徹"""

# ==================


def generate_rubric(topic, api_url):
    """
    調用 API 生成評分標準

    Args:
        topic: 作文題目
        api_url: API 端點 URL

    Returns:
        API 返回的評分標準
    """
    try:
        print(f"調用 API: {api_url}")
        print(f"題目：\n{topic}\n")

        # 準備 JSON 資料
        payload = {
            "topic": topic
        }

        # 設定請求標頭
        headers = {
            "Content-Type": "application/json"
        }

        # 發送 POST 請求（設定較長的超時時間）
        print("正在生成評分標準，請稍候...")
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
        raise Exception(f"生成評分標準失敗：{e}")


def save_rubric_to_file(rubric_text, filename="rubric_output.txt"):
    """
    儲存評分標準到檔案

    Args:
        rubric_text: 評分標準文字
        filename: 輸出檔案名稱

    Returns:
        儲存的檔案路徑
    """
    timestamp = datetime.now().strftime('%Y/%m/%d %H:%M:%S')

    content = f"""{"=" * 80}
自動生成評分標準
{"=" * 80}
題目：
{TOPIC}

生成時間：{timestamp}
{"=" * 80}

{rubric_text}

{"=" * 80}
"""

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n評分標準已儲存至：{filename}")
    return filename


def main():
    """主程式"""
    print("\n" + "=" * 80)
    print("評分標準生成腳本")
    print("=" * 80)
    print(f"API 端點：{API_BASE_URL}/api/generate_rubric")
    print("=" * 80)
    print()

    try:
        # 調用 API 生成評分標準
        api_endpoint = f"{API_BASE_URL}/api/generate_rubric"
        result = generate_rubric(TOPIC, api_endpoint)

        # 取得評分標準文字
        rubric = result.get('rubric', '')

        if not rubric:
            print("警告：API 未返回評分標準內容")
            print("完整回應：")
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return

        # 顯示評分標準
        print("\n" + "=" * 80)
        print("生成的評分標準")
        print("=" * 80)
        print(rubric)
        print("=" * 80)

        # 儲存到檔案
        save_rubric_to_file(rubric)

        print("\n完成！")

    except Exception as e:
        print(f"\n執行錯誤：{e}")
        return


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n使用者中斷執行")
    except Exception as e:
        print(f"\n執行錯誤：{e}")
