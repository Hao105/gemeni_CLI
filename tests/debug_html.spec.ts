import { test } from '@playwright/test';
import fs from 'fs';

test('dump html content', async ({ page }) => {
  const storeName = '東勢麥當勞';
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(storeName)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000); // 等待一下
  
  // 檢查是否有 Cookie 同意視窗 (常見於歐洲或特定網路環境，雖然台灣較少，但仍需排除)
  const consentBtn = page.locator('button:has-text("全部接受"), button:has-text("Accept all")');
  if (await consentBtn.isVisible()) {
    await consentBtn.click();
    await page.waitForTimeout(2000);
  }

  const html = await page.content();
  fs.writeFileSync('page_dump.txt', html);
  console.log('HTML 已導出至 page_dump.txt');
  
  // 截圖確認當前畫面
  await page.screenshot({ path: 'current_view.png', fullPage: true });
});
