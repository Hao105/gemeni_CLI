---
name: playwright-helper
description: 協助使用 Playwright CLI 進行自動化測試、網頁截圖及代碼生成。當需要執行測試、偵錯失敗任務、或獲取網頁快照時使用。
---

# Playwright Helper

此技能連動 Playwright CLI，協助開發者更有效率地進行 E2E 測試。

## 核心功能

### 1. 執行測試
使用此功能來運行 Playwright 測試並獲取結果。
- **指令稿**: `node scripts/run_tests.cjs [filter]`
- **範例**: `node scripts/run_tests.cjs tests/login.spec.ts`

### 2. 網頁截圖
快速獲取指定 URL 的截圖。
- **指令稿**: `node scripts/screenshot.cjs <url> <filename>`
- **範例**: `node scripts/screenshot.cjs https://example.com example.png`

### 3. 生成代碼 (Codegen)
當需要錄製新的測試腳本時，建議用戶執行：
`npx playwright codegen <url>`

### 4. 參考指南
關於常用斷言與指令，請參閱 [references/cheatsheet.md](references/cheatsheet.md)。

## 工作流建議

- **測試失敗時**: 建議執行 `npx playwright show-report` 查看詳細失敗原因，或參考 `cheatsheet.md` 中的偵錯技巧。
- **建立新測試時**: 先使用 `codegen` 錄製初步流程，再根據 `cheatsheet.md` 修改斷言。
