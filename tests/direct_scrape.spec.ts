import { test } from '@playwright/test';
import fs from 'fs';

test('direct scrape from url', async ({ page }) => {
  test.setTimeout(60000);
  // 直接進入評論頁面 (URL 已包含最低評分排序)
  const targetUrl = "https://www.google.com/maps/place/%E9%BA%A5%E7%95%B6%E5%8B%9E-%E6%9D%B1%E5%8B%A2%E6%96%B0%E5%8B%A2%E5%BA%97/@24.2526526,120.843658,17z/data=!4m8!3m7!1s0x3469104f65311025:0x892a06141203b5b1!8m2!3d24.2526526!4d120.8462329!9m1!1b1!16s%2Fg%2F1tdmpxcl?entry=ttu";
  
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  console.log('正在加載評論頁面...');

  // 等待評論元素 (使用多種可能的 class)
  await page.waitForSelector('.jfti7e, div[data-review-id]', { timeout: 30000 });

  const reviews = [];
  const reviewNodes = page.locator('.jfti7e, div[data-review-id]');
  const count = await reviewNodes.count();
  console.log(`找到 ${count} 則初步評論`);

  for (let i = 0; i < count; i++) {
    const el = reviewNodes.nth(i);
    const text = await el.locator('.wiI79').innerText().catch(() => '');
    const author = await el.locator('.d4r55').innerText().catch(() => '匿名');
    const ratingLabel = await el.locator('span[role="img"][aria-label*="星"]').getAttribute('aria-label').catch(() => '');
    const rating = parseInt(ratingLabel.match(/\d+/)?.[0] || '0');

    // 過濾：負評 (<=2星) 且文字長度 > 5
    if (rating > 0 && rating <= 2 && text.length > 5) {
      reviews.push({ author, rating, text });
    }
    if (reviews.length >= 10) break;
  }

  if (reviews.length > 0) {
    const csvContent = '\ufeff作者,評分,內容\n' + reviews.slice(0, 10).map(r => 
      `"${r.author.replace(/"/g, '""')}","${r.rating}","${r.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ).join('\n');
    fs.writeFileSync('mcdonalds_reviews.csv', csvContent);
    console.log(`成功儲存 ${reviews.length} 則評論至 mcdonalds_reviews.csv`);
  } else {
    console.log('未找到符合條件的評論，可能是選擇器失效。');
  }
});
