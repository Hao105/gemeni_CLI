import { test, expect } from '@playwright/test';
import fs from 'fs';

test('scrape google maps reviews optimized', async ({ page }) => {
  test.setTimeout(120000); // 延長至 2 分鐘
  const storeName = '東勢麥當勞';
  console.log(`正在處理: ${storeName}`);

  // 1. 直接導航到 Google Maps 搜尋 (改用 domcontentloaded 以避免 networkidle 永不結束的問題)
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(storeName)}`, { waitUntil: 'domcontentloaded' });
  console.log('頁面初步載入完成');

  // 2. 等待搜尋結果或店家面板出現
  try {
    await page.waitForSelector('a[aria-label*="' + storeName + '"], h1', { timeout: 30000 });
  } catch (e) {
    console.log('等待搜尋結果超時，嘗試繼續執行...');
  }

  // 3. 尋找並點擊「評論」標籤
  const reviewsTab = page.getByRole('tab', { name: /評論|Reviews/ });
  await reviewsTab.waitFor({ state: 'visible', timeout: 10000 });
  await reviewsTab.click();
  console.log('已進入評論頁面');

  // 4. 排序：評分最低
  const sortButton = page.getByLabel(/排序評論|Sort reviews/);
  await sortButton.click();
  await page.getByRole('menuitem', { name: /評分最低|Lowest rating/ }).click();
  await page.waitForTimeout(3000); // 等待排序生效

  // 5. 抓取評論邏輯
  const reviews = [];
  const maxRetries = 10;
  
  for (let i = 0; i < maxRetries; i++) {
    // 定位所有評論容器
    const reviewElements = page.locator('div[data-review-id]');
    const count = await reviewElements.count();
    console.log(`目前發現 ${count} 則評論內容...`);

    for (let j = 0; j < count; j++) {
      const el = reviewElements.nth(j);
      
      // 提取評分 (從 aria-label 提取數字)
      const ratingLabel = await el.locator('span[role="img"][aria-label*="星"]').getAttribute('aria-label').catch(() => '0');
      const rating = parseInt(ratingLabel.match(/\d+/)?.[0] || '0');
      
      // 提取文字
      const text = await el.locator('.wiI79').innerText().catch(() => '');
      const author = await el.locator('.d4r55').innerText().catch(() => '匿名用戶');
      
      // 過濾條件：
      // - 評分 <= 2
      // - 文字長度 > 5 (排除機器人/純評分)
      // - 不重複
      if (rating <= 2 && text.length > 5) {
        if (!reviews.some(r => r.text === text)) {
          reviews.push({ author, rating, text });
          console.log(`已抓取來自 ${author} 的負評 (${rating}星)`);
        }
      }
      
      if (reviews.length >= 10) break;
    }

    if (reviews.length >= 10) break;

    // 滾動加載更多評論
    // 尋找評論捲動容器（通常是包含所有評論的那個 div）
    const scrollContainer = page.locator('div[role="main"] div[tabindex="-1"]').nth(1);
    await scrollContainer.evaluate(node => node.scrollBy(0, 1500));
    await page.waitForTimeout(2000);
  }

  // 6. 寫入 CSV
  if (reviews.length > 0) {
    const csvHeader = '作者,評分,內容\n';
    const csvRows = reviews.slice(0, 10).map(r => 
      `"${r.author.replace(/"/g, '""')}","${r.rating}","${r.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ).join('\n');
    
    fs.writeFileSync('mcdonalds_reviews.csv', '\ufeff' + csvHeader + csvRows);
    console.log(`任務完成！已將 ${reviews.length} 則評論儲存至 mcdonalds_reviews.csv`);
  } else {
    console.log('未找到符合條件的負評，請檢查網頁是否被阻擋。');
    await page.screenshot({ path: 'failure_debug.png' });
  }
});
