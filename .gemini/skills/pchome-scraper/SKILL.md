---
name: pchome-scraper
description: 自動化抓取 PChome 24h 每日促銷商品並生成 Markdown 報告。適用於需要獲取當日熱門商品、價格及連結的情況。
---

# PChome 商品抓取 Skill

此 Skill 提供自動化抓取 PChome 24h 首頁促銷商品的功能，並會下載商品圖片與生成 Markdown 格式的報告。

## 使用方式

當你需要抓取 PChome 每日商品時，請執行以下步驟：

1. **執行抓取腳本**：
   使用 `run_shell_command` 執行 `scripts/scrape_pchome.cjs`。此腳本會自動處理頁面捲動、資料擷取與圖片下載。

   ```powershell
   node pchome-scraper/scripts/scrape_pchome.cjs
   ```

2. **查看結果**：
   執行完成後，報告將儲存於 `pchome_daily_report/README.md`，商品圖片則位於 `pchome_daily_report/images/`。

## 輸出結構

- `pchome_daily_report/`
    - `README.md`: 包含商品預覽圖、名稱、價格與購買連結的表格。
    - `images/`: 下載的商品圖片檔案。

## 注意事項

- 此腳本依賴 `playwright` 庫，請確保環境中已安裝相關依賴。
- 預設抓取前 30 項有效商品以維持效能。
- 若網路環境受限，圖片下載可能會失敗，報告中會顯示 `(無圖)`。
