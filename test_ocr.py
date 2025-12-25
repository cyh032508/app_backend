"""
OCR 測試腳本 (Python 版本)

功能：
1. 讀取 testindata 資料夾內的所有子資料夾
2. 對每個子資料夾，辨識第一個圖片檔案
3. 將辨識結果存成 txt 檔案到 ocr_results 資料夾

使用方法：
python test_ocr.py
或指定 API URL：
python test_ocr.py https://your-app.vercel.app
"""

import os
import sys
import requests
import json
import io
from pathlib import Path
from datetime import datetime
from PIL import Image

# ===== 設定區域 =====
# 請修改這裡的 URL 為你的 Vercel 部署網址
API_BASE_URL = "https://app-backend-teal.vercel.app"  # <-- 改成你的 Vercel URL

# 測試資料和結果資料夾
TESTDATA_DIR = "testindata"
RESULTS_DIR = "ocr_results_new"

# 圖片設定
IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp']
MAX_IMAGE_DIMENSION = 4000  # API 的最大尺寸限制
# ==================


def ensure_dir(dir_path):
    """確保資料夾存在，不存在則創建"""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"✓ 創建資料夾：{dir_path}")


def get_first_image_file(dir_path):
    """
    獲取資料夾內的第一個圖片檔案（按字母順序）

    Args:
        dir_path: 資料夾路徑

    Returns:
        圖片檔案的完整路徑，如果沒有圖片則返回 None
    """
    try:
        # 取得所有檔案
        files = os.listdir(dir_path)

        # 過濾出圖片檔案
        image_files = []
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IMAGE_EXTENSIONS:
                image_files.append(file)

        # 排序
        image_files.sort()

        if len(image_files) == 0:
            return None

        # 返回第一個圖片的完整路徑
        return os.path.join(dir_path, image_files[0])

    except Exception as e:
        print(f"  ✗ 讀取資料夾錯誤：{e}")
        return None


def resize_image_if_needed(image_path):
    """
    如果圖片尺寸超過限制，自動縮小圖片

    Args:
        image_path: 原始圖片路徑

    Returns:
        調整後的圖片資料（bytes），以及是否有調整的標記
    """
    try:
        # 開啟圖片
        img = Image.open(image_path)
        original_size = img.size  # (width, height)

        # 檢查是否需要縮放
        max_dimension = max(original_size)

        if max_dimension <= MAX_IMAGE_DIMENSION:
            # 不需要縮放，直接讀取原始檔案
            with open(image_path, 'rb') as f:
                return f.read(), False, original_size

        # 需要縮放
        print(f"  → 原始尺寸: {original_size[0]}x{original_size[1]} (超過限制)")

        # 計算縮放比例
        scale = MAX_IMAGE_DIMENSION / max_dimension
        new_width = int(original_size[0] * scale)
        new_height = int(original_size[1] * scale)
        new_size = (new_width, new_height)

        print(f"  → 縮放至: {new_width}x{new_height}")

        # 縮放圖片（使用高品質的 LANCZOS 演算法）
        img_resized = img.resize(new_size, Image.Resampling.LANCZOS)

        # 轉換為 JPEG 格式的 bytes
        output = io.BytesIO()
        if img.mode in ('RGBA', 'LA', 'P'):
            # 如果有透明通道，轉換為 RGB
            img_resized = img_resized.convert('RGB')
        img_resized.save(output, format='JPEG', quality=95)
        image_bytes = output.getvalue()

        return image_bytes, True, new_size

    except Exception as e:
        raise Exception(f"圖片處理失敗：{e}")


def perform_ocr(image_path, api_url):
    """
    調用 OCR API 進行辨識

    Args:
        image_path: 圖片檔案路徑
        api_url: API 端點 URL

    Returns:
        API 返回的 JSON 結果
    """
    try:
        # 處理圖片（如需要會自動縮放）
        image_bytes, was_resized, image_size = resize_image_if_needed(image_path)

        # 準備表單資料
        files = {
            'image': (os.path.basename(image_path), image_bytes, 'image/jpeg')
        }

        print(f"  → 調用 API: {api_url}")

        # 發送 POST 請求（設定較長的超時時間，因為 OCR 處理需要時間）
        response = requests.post(api_url, files=files, timeout=300)

        # 檢查回應狀態
        if response.status_code != 200:
            raise Exception(f"API 錯誤 ({response.status_code}): {response.text}")

        # 解析 JSON 回應
        result = response.json()
        return result

    except Exception as e:
        raise Exception(f"OCR 處理失敗：{e}")


def save_result(folder_name, image_name, ocr_result):
    """
    儲存辨識結果到 txt 檔案
    會分別儲存：原始 OCR、二值化 OCR、交叉比對結果

    Args:
        folder_name: 資料夾名稱
        image_name: 圖片檔案名稱
        ocr_result: OCR API 返回的結果

    Returns:
        儲存的檔案路徑列表
    """
    image_base_name = os.path.splitext(image_name)[0]
    timestamp = datetime.now().strftime('%Y/%m/%d %H:%M:%S')
    saved_files = []

    # 檢查是否有詳細資料
    if 'data' not in ocr_result:
        print("  ⚠ 警告：API 未返回詳細資料，只儲存最終結果")
        # 儲存最終結果
        txt_filename = f"{folder_name}_{image_base_name}_final.txt"
        txt_filepath = os.path.join(RESULTS_DIR, txt_filename)

        result_text = (
            ocr_result.get('result_text') or
            ocr_result.get('text') or
            ocr_result.get('ocr_text') or
            ''
        )

        with open(txt_filepath, 'w', encoding='utf-8') as f:
            f.write(f"資料夾：{folder_name}\n")
            f.write(f"檔案：{image_name}\n")
            f.write(f"時間：{timestamp}\n")
            f.write("=" * 80 + "\n\n")
            f.write(result_text)

        saved_files.append(txt_filepath)
        return saved_files

    data = ocr_result['data']

    # 1. 儲存原始 OCR 結果
    if 'original_ocr' in data and data['original_ocr'].get('success'):
        orig = data['original_ocr']
        txt_filename = f"{folder_name}_{image_base_name}_original.txt"
        txt_filepath = os.path.join(RESULTS_DIR, txt_filename)

        with open(txt_filepath, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("原始 OCR 辨識結果\n")
            f.write("=" * 80 + "\n")
            f.write(f"資料夾：{folder_name}\n")
            f.write(f"檔案：{image_name}\n")
            f.write(f"時間：{timestamp}\n")
            f.write(f"處理耗時：{orig.get('ocr_time', 0):.2f}s\n")
            f.write(f"文字長度：{orig.get('text_length', 0)} 字\n")
            f.write("=" * 80 + "\n\n")
            f.write(orig.get('text', ''))

        saved_files.append(txt_filepath)
        print(f"  ✓ 儲存原始 OCR：{txt_filename}")

    # 2. 儲存二值化 OCR 結果
    if 'binary_ocr' in data and data['binary_ocr'].get('success'):
        binary = data['binary_ocr']
        txt_filename = f"{folder_name}_{image_base_name}_binary.txt"
        txt_filepath = os.path.join(RESULTS_DIR, txt_filename)

        with open(txt_filepath, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("二值化 OCR 辨識結果\n")
            f.write("=" * 80 + "\n")
            f.write(f"資料夾：{folder_name}\n")
            f.write(f"檔案：{image_name}\n")
            f.write(f"時間：{timestamp}\n")
            f.write(f"處理耗時：{binary.get('ocr_time', 0):.2f}s\n")
            f.write(f"文字長度：{binary.get('text_length', 0)} 字\n")
            f.write("=" * 80 + "\n\n")
            f.write(binary.get('text', ''))

        saved_files.append(txt_filepath)
        print(f"  ✓ 儲存二值化 OCR：{txt_filename}")

    # 3. 儲存交叉比對結果
    if 'optimized' in data and data['optimized'].get('success'):
        opt = data['optimized']
        txt_filename = f"{folder_name}_{image_base_name}_optimized.txt"
        txt_filepath = os.path.join(RESULTS_DIR, txt_filename)

        with open(txt_filepath, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("交叉比對優化結果\n")
            f.write("=" * 80 + "\n")
            f.write(f"資料夾：{folder_name}\n")
            f.write(f"檔案：{image_name}\n")
            f.write(f"時間：{timestamp}\n")
            f.write(f"比對耗時：{opt.get('compare_time', 0):.2f}s\n")
            f.write(f"文字長度：{opt.get('text_length', 0)} 字\n")
            f.write("=" * 80 + "\n\n")
            f.write(opt.get('text', ''))

        saved_files.append(txt_filepath)
        print(f"  ✓ 儲存交叉比對：{txt_filename}")

    # 4. 儲存統計摘要
    summary_filename = f"{folder_name}_{image_base_name}_summary.txt"
    summary_filepath = os.path.join(RESULTS_DIR, summary_filename)

    with open(summary_filepath, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("OCR 處理摘要\n")
        f.write("=" * 80 + "\n")
        f.write(f"資料夾：{folder_name}\n")
        f.write(f"檔案：{image_name}\n")
        f.write(f"時間：{timestamp}\n")
        f.write("=" * 80 + "\n\n")

        if 'original_ocr' in data:
            orig = data['original_ocr']
            f.write(f"原始 OCR：\n")
            f.write(f"  成功：{'是' if orig.get('success') else '否'}\n")
            f.write(f"  耗時：{orig.get('ocr_time', 0):.2f}s\n")
            f.write(f"  長度：{orig.get('text_length', 0)} 字\n\n")

        if 'binary_ocr' in data:
            binary = data['binary_ocr']
            f.write(f"二值化 OCR：\n")
            f.write(f"  成功：{'是' if binary.get('success') else '否'}\n")
            f.write(f"  耗時：{binary.get('ocr_time', 0):.2f}s\n")
            f.write(f"  長度：{binary.get('text_length', 0)} 字\n\n")

        if 'optimized' in data:
            opt = data['optimized']
            f.write(f"交叉比對：\n")
            f.write(f"  成功：{'是' if opt.get('success') else '否'}\n")
            f.write(f"  耗時：{opt.get('compare_time', 0):.2f}s\n")
            f.write(f"  長度：{opt.get('text_length', 0)} 字\n\n")

        if 'total_time' in data:
            f.write(f"總處理時間：{data['total_time']:.2f}s\n")

    saved_files.append(summary_filepath)
    print(f"  ✓ 儲存統計摘要：{summary_filename}")

    return saved_files


def main():
    """主程式"""
    print("\n" + "=" * 80)
    print("OCR 批次測試腳本")
    print("=" * 80)

    # 如果有命令列參數，使用參數作為 API URL
    api_base_url = sys.argv[1] if len(sys.argv) > 1 else API_BASE_URL
    api_endpoint = f"{api_base_url}/api/gemini_ocr"

    print(f"測試資料夾：{TESTDATA_DIR}")
    print(f"結果資料夾：{RESULTS_DIR}")
    print(f"API 端點：{api_endpoint}")
    print("=" * 80)
    print()

    # 確保結果資料夾存在
    ensure_dir(RESULTS_DIR)

    # 檢查測試資料夾是否存在
    if not os.path.exists(TESTDATA_DIR):
        print(f"✗ 錯誤：找不到資料夾 {TESTDATA_DIR}")
        return

    # 取得所有子資料夾
    folders = []
    for item in os.listdir(TESTDATA_DIR):
        item_path = os.path.join(TESTDATA_DIR, item)
        if os.path.isdir(item_path):
            folders.append(item)

    # 排序（數字優先）
    def sort_key(name):
        try:
            return (0, int(name))  # 數字
        except ValueError:
            return (1, name)  # 字串

    folders.sort(key=sort_key)

    print(f"找到 {len(folders)} 個資料夾\n")

    # 統計資料
    stats = {
        'total': len(folders),
        'success': 0,
        'failed': 0,
        'skipped': 0,
        'start_time': datetime.now()
    }

    # 處理每個資料夾
    for i, folder_name in enumerate(folders, 1):
        folder_path = os.path.join(TESTDATA_DIR, folder_name)

        print(f"[{i}/{len(folders)}] 處理資料夾：{folder_name}")

        try:
            # 取得第一個圖片檔案
            first_image_path = get_first_image_file(folder_path)

            if not first_image_path:
                print("  ⚠ 找不到圖片檔案，跳過\n")
                stats['skipped'] += 1
                continue

            image_name = os.path.basename(first_image_path)
            print(f"  → 圖片檔案：{image_name}")

            # 執行 OCR
            print("  → 開始辨識...")
            ocr_result = perform_ocr(first_image_path, api_endpoint)

            # 儲存結果
            save_result(folder_name, image_name, ocr_result)

            stats['success'] += 1
            print("  ✓ 完成\n")

        except Exception as e:
            print(f"  ✗ 錯誤：{e}\n")
            stats['failed'] += 1

    # 顯示統計結果
    elapsed_time = (datetime.now() - stats['start_time']).total_seconds()

    print("=" * 80)
    print("測試完成")
    print("=" * 80)
    print(f"總資料夾數：{stats['total']}")
    print(f"成功辨識：{stats['success']}")
    print(f"失敗：{stats['failed']}")
    print(f"跳過：{stats['skipped']}")
    print(f"總耗時：{elapsed_time:.2f}s")
    print("=" * 80)
    print()

    if stats['success'] > 0:
        print(f"✓ 所有結果已儲存至：{RESULTS_DIR}\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n✗ 使用者中斷執行")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ 執行錯誤：{e}")
        sys.exit(1)
