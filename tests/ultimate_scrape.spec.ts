import { test } from '@playwright/test';
import fs from 'fs';

test('ultimate scrape google maps', async ({ page }) => {
  test.setTimeout(120000);
  // 使用包含評論關鍵字的 URL 並強制繁體中文
  const url = 'https://www.google.com/maps/place/%E9%BA%A5%E7%95%B6%E5%8B%9E-%E6%9D%B1%E5%8B%A2%E6%96%B0%E5%8B%A2%E5%BA%97/@24.2526526,120.843658,17z/data=!4m8!3m7!1s0x3469104f65311025:0x892a06141203b5b1!8m2!3d24.2526526!4d120.8462329!9m1!1b1!16s%2Fg%2F1tdmpxcl?hl=zh-TW';
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log('頁面載入中...');
  
  await page.waitForTimeout(5000);

  // 1. 處理彈窗
  const consentBtn = page.locator('button:has-text("我同意"), button:has-text("全部接受"), button:has-text("Accept all")');
  if (await consentBtn.isVisible()) {
    await consentBtn.click();
    await page.waitForTimeout(2000);
  }

  // 2. 尋找捲動容器並模擬大量捲動
  const scrollContainer = page.locator('div[role="main"] div[tabindex="-1"]').nth(1);
  console.log('正在加載評論數據...');
  for (let i = 0; i < 5; i++) {
    await scrollContainer.evaluate(node => node.scrollBy(0, 2000));
    await page.waitForTimeout(2000);
  }

  // 3. 執行瀏覽器內部的強力抓取
  const reviews = await page.evaluate(() => {
    const results = [];
    // 遍歷所有可能包含評論的容器
    const selectors = ['div[data-review-id]', '.jfti7e', '.m6QErb.DziZTe'];
    let items = [];
    for (const s of selectors) {
      const found = document.querySelectorAll(s);
      if (found.length > items.length) items = Array.from(found);
    }

    items.forEach(item => {
      // 使用多重選擇器提取資料
      const author = item.querySelector('.d4r55, .TSZ61d')?.innerText || '匿名';
      const text = item.querySelector('.wiI79, .MyEned')?.innerText || '';
      const ratingLabel = item.querySelector('span[role="img"][aria-label*="星"]')?.getAttribute('aria-label') || '';
      const ratingMatch = ratingLabel.match(/\d+/);
      const rating = ratingMatch ? parseInt(ratingMatch[0]) : 0;

      // 篩選：負評 (1-2星) 且有實質內容
      if (rating > 0 && rating <= 2 && text.trim().length > 5) {
        results.push({ author: author.trim(), rating, text: text.trim() });
      }
    });

    // 去重
    return Array.from(new Set(results.map(r => JSON.stringify(r)))).map(s => JSON.parse(s));
  });

  console.log(`總共抓取到 ${reviews.length} 則有效負評`);

  // 4. 寫入新檔案避免 EBUSY
  const timestamp = new Date().getTime();
  const finalFileName = `mcdonalds_reviews_${timestamp}.csv`;
  const csvHeader = '\ufeff作者,評分,內容\n';
  const csvRows = reviews.slice(0, 10).map(r => 
    `"${r.author.replace(/"/g, '""')}","${r.rating}","${r.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`
  ).join('\n');
  
  fs.writeFileSync(finalFileName, csvHeader + csvRows);
  console.log(`成功！結果已儲存至: ${finalFileName}`);

  if (reviews.length === 0) {
    await page.screenshot({ path: 'debug_last_chance.png', fullPage: true });
    console.log('提醒：未抓取到任何負評，請檢查 debug_last_chance.png。');
  }
});
