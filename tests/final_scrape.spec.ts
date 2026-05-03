import { test } from '@playwright/test';
import fs from 'fs';

test('final repair scrape', async ({ page }) => {
  test.setTimeout(120000);
  const storeName = '東勢麥當勞';
  const csvFile = 'mcdonalds_reviews.csv';
  
  try {
    console.log(`開始搜尋: ${storeName}`);
    // 導航並等待 DOM
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(storeName)}`, { waitUntil: 'domcontentloaded' });
    
    // 等待核心容器出現
    await page.waitForSelector('div[role="main"]', { timeout: 20000 });
    
    // 嘗試點擊評論標籤 (多種選擇器組合)
    const reviewsBtn = page.locator('button[aria-label*="評論"], button[role="tab"]:has-text("評論"), .hh746e').first();
    await reviewsBtn.waitFor({ state: 'visible', timeout: 15000 });
    await reviewsBtn.click();
    console.log('成功進入評論區');

    // 等待評論內容加載
    await page.waitForSelector('div[data-review-id]', { timeout: 15000 });

    // 排序：最低評分
    const sortBtn = page.getByLabel(/排序評論|Sort reviews/);
    if (await sortBtn.isVisible()) {
      await sortBtn.click();
      await page.getByRole('menuitem', { name: /評分最低|Lowest rating/ }).click();
      await page.waitForTimeout(3000);
    }

    let reviews = [];
    const scrollContainer = page.locator('div[role="main"] div[tabindex="-1"]').nth(1);

    for (let i = 0; i < 5; i++) {
      const elements = page.locator('div[data-review-id]');
      const count = await elements.count();
      
      for (let j = 0; j < count; j++) {
        const el = elements.nth(j);
        const text = await el.locator('.wiI79').innerText().catch(() => '');
        const author = await el.locator('.d4r55').innerText().catch(() => '匿名');
        const ratingLabel = await el.locator('span[role="img"][aria-label*="星"]').getAttribute('aria-label').catch(() => '');
        const rating = parseInt(ratingLabel.match(/\d+/)?.[0] || '0');

        // 過濾：負評 (<=2星) 且有內容且非重複
        if (rating > 0 && rating <= 2 && text.length > 5) {
          if (!reviews.some(r => r.text === text)) {
            reviews.push({ author, rating, text });
          }
        }
        if (reviews.length >= 10) break;
      }

      if (reviews.length >= 10) break;
      
      // 捲動
      await scrollContainer.evaluate(node => node.scrollBy(0, 1000));
      await page.waitForTimeout(2000);
    }

    // 儲存結果
    if (reviews.length > 0) {
      const csvContent = '\ufeff作者,評分,內容\n' + reviews.slice(0, 10).map(r => 
        `"${r.author.replace(/"/g, '""')}","${r.rating}","${r.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ).join('\n');
      fs.writeFileSync(csvFile, csvContent);
      console.log(`成功！已儲存 ${reviews.length} 則負評至 ${csvFile}`);
    } else {
      console.log('未抓取到符合條件的評論。');
    }

  } catch (error) {
    console.error(`執行出錯: ${error.message}`);
    await page.screenshot({ path: 'final_error.png' });
  }
});
