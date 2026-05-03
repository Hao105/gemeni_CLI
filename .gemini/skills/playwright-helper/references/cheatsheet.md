# Playwright 常用參考

## 常用指令 (CLI)

- 執行所有測試: `npx playwright test`
- 執行特定測試檔案: `npx playwright test tests/example.spec.ts`
- 開啟 UI 模式: `npx playwright test --ui`
- 生成代碼: `npx playwright codegen <url>`
- 查看報告: `npx playwright show-report`

## 常用斷言 (Assertions)

```typescript
await expect(page).toHaveTitle(/Playwright/);
await expect(page.getByRole('button')).toBeVisible();
await expect(page.locator('.status')).toHaveText('Submitted');
```

## 偵錯技巧

- 在代碼中加入 `await page.pause();` 以啟動偵錯器。
- 使用 `DEBUG=pw:api npx playwright test` 查看詳細 API 日誌。
