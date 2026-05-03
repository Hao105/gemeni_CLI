import { test } from '@playwright/test';
import fs from 'fs';

test('invincible scrape google maps', async ({ page }) => {
  // 設置極長超時 (3分鐘)
  test.setTimeout(180000);
  const url = 'https://www.google.com/maps/place/%E9%BA%A5%E7%95%B6%E5%8B%9E-%E6%9D%B1%E5%8B%A2%E6%96%B0%E5%8B%A2%E5%BA%97/@24.2526526,120.843658,17z/data=!4m8!3m7!1s0x3469104f65311025:0x892a06141203b5b1!8m2!3d24.2526526!4d120.8462329!9m1!1b1!16s%2Fg%2F1tdmpxcl?hl=zh-TW';
  
  await page.goto(url, { waitUntil: 'load' });
  console.log('頁面已導航，等待穩定...');
  await page.waitForTimeout(8000);

  // 1. 強力處理彈窗 (使用多種語言可能的文字)
  const buttons = page.locator('button');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const text = await buttons.nth(i).innerText();
    if (text.includes('接受') || text.includes('同意') || text.includes('Accept') || text.includes('Agree')) {
      await buttons.nth(i).click().catch(() => {});
      await page.waitForTimeout(2000);
      break;
    }
  }

  // 2. 模擬真人滾動 (不依賴特定容器 ID)
  console.log('正在嘗試多種方式捲動頁面以載入評論...');
  // 移動滑鼠到左側區域並捲動
  await page.mouse.move(200, 500);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(1500);
  }

  // 3. 在瀏覽器端提取所有可見評論
  const reviews = await page.evaluate(() => {
    const data = [];
    // 尋找所有包含評論文字的區塊 (通常是 .wiI79 或 .MyEned)
    const reviewBlocks = document.querySelectorAll('div[data-review-id], .jfti7e');
    
    reviewBlocks.forEach(block => {
      const author = block.querySelector('.d4r55, .TSZ61d')?.textContent || '匿名';
      const text = block.querySelector('.wiI79, .MyEned')?.textContent || '';
      const ratingEl = block.querySelector('span[role="img"][aria-label*="星"]');
      const ratingLabel = ratingEl ? ratingEl.getAttribute('aria-label') : '';
      const ratingMatch = ratingLabel ? ratingLabel.match(/\d+/) : null;
      const rating = ratingMatch ? parseInt(ratingMatch[0]) : 0;

      if (rating > 0 && rating <= 2 && text.trim().length > 3) {
        data.push({ author: author.trim(), rating, text: text.trim() });
      }
    });
    return data;
  });

  // 4. 去重並取前10則
  const uniqueReviews = [];
  const seenTexts = new Set();
  for (const r of reviews) {
    if (!seenTexts.has(r.text)) {
      uniqueReviews.push(r);
      seenTexts.add(r.text);
    }
    if (uniqueReviews.length >= 10) break;
  }

  console.log(`成功找到 ${uniqueReviews.length} 則不重複負評。`);

  // 5. 強制生成 CSV
  const finalFile = 'mcdonalds_final_export.csv';
  const csvHeader = '\ufeff作者,評分,內容\n';
  const csvRows = uniqueReviews.map(r => 
    `"${r.author.replace(/"/g, '""')}","${r.rating}","${r.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`
  ).join('\n');
  
  fs.writeFileSync(finalFile, csvHeader + csvRows);
  console.log(`✅ 任務完成！檔案已產出：${finalFile}`);

  if (uniqueReviews.length === 0) {
    await page.screenshot({ path: 'final_debug_shot.png' });
    console.log('⚠️ 注意：未能抓取到任何負評，請查看 final_debug_shot.png 檢查畫面。');
  }
});
