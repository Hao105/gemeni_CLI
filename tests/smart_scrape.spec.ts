import { test } from '@playwright/test';
import fs from 'fs';

test('smart scrape google maps', async ({ page }) => {
  test.setTimeout(120000);
  // 強制使用台灣語系
  const url = 'https://www.google.com/maps/place/%E9%BA%A5%E7%95%B6%E5%8B%9E-%E6%9D%B1%E5%8B%A2%E6%96%B0%E5%8B%A2%E5%BA%97/@24.2526526,120.843658,17z/data=!4m8!3m7!1s0x3469104f65311025:0x892a06141203b5b1!8m2!3d24.2526526!4d120.8462329!9m1!1b1!16s%2Fg%2F1tdmpxcl?hl=zh-TW';
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log('頁面導航完成，等待載入...');
  
  // 處理可能的彈窗
  await page.waitForTimeout(5000);
  const agreeBtn = page.locator('button:has-text("我同意"), button:has-text("全部接受")');
  if (await agreeBtn.isVisible()) {
    await agreeBtn.click();
    await page.waitForTimeout(2000);
  }

  // 等待評論容器出現 (使用更通用的定位器)
  await page.waitForSelector('div[role="main"]', { timeout: 30000 });
  
  // 模擬滾動以加載評論
  console.log('開始滾動以觸發評論載入...');
  for(let i=0; i<3; i++) {
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(2000);
  }

  // 使用 evaluate 在瀏覽器內部抓取，避開 Playwright Locator 的一些限制
  const reviews = await page.evaluate(() => {
    const results = [];
    // 尋找包含評論的 div (通常有 data-review-id)
    const items = document.querySelectorAll('div[data-review-id], .jfti7e');
    
    items.forEach(item => {
      const author = item.querySelector('.d4r55')?.innerText || '匿名';
      const text = item.querySelector('.wiI79')?.innerText || '';
      const ratingLabel = item.querySelector('span[role="img"][aria-label*="星"]')?.getAttribute('aria-label') || '';
      const ratingMatch = ratingLabel.match(/\d+/);
      const rating = ratingMatch ? parseInt(ratingMatch[0]) : 0;

      if (rating > 0 && rating <= 2 && text.length > 5) {
        results.push({ author, rating, text });
      }
    });
    return results;
  });

  console.log(`抓取到 ${reviews.length} 則符合條件的負評`);

  // 即使只有一則也儲存
  const csvHeader = '\ufeff作者,評分,內容\n';
  const csvRows = reviews.slice(0, 10).map(r => 
    `"${r.author.replace(/"/g, '""')}","${r.rating}","${r.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`
  ).join('\n');
  
  fs.writeFileSync('mcdonalds_reviews.csv', csvHeader + csvRows);
  
  if (reviews.length === 0) {
    await page.screenshot({ path: 'final_check.png', fullPage: true });
    console.log('未能抓取到評論，已截圖 final_check.png 供檢查。');
  } else {
    console.log('CSV 檔案已更新。');
  }
});
