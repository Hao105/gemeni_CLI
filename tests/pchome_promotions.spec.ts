import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// 下載圖片的輔助函式
async function downloadImage(url: string, dest: string) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(true);
        });
      } else {
        reject(`Failed to download: ${res.statusCode}`);
      }
    }).on('error', (err) => {
      reject(err.message);
    });
  });
}

test('擷取 PChome 促銷商品、圖片並產生 Markdown 報告', async ({ page }) => {
  // 設定較長的超時時間
  test.setTimeout(120000);

  // 1. 前往 PChome 24h 首頁 (放寬等待條件以避免逾時)
  await page.goto('https://24h.pchome.com.tw/', { waitUntil: 'domcontentloaded' });

  // 2. 自動向下捲動
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(800);
  }

  // 3. 定位促銷商品與圖片
  const products = await page.evaluate(() => {
    const items: any[] = [];
    const potentialContainers = document.querySelectorAll('[class*="prod"], [class*="item"], [class*="box"]');
    
    potentialContainers.forEach(el => {
      const nameEl = el.querySelector('[class*="name"], [class*="title"]');
      const priceEl = el.querySelector('[class*="price"], [class*="value"]');
      const imgEl = el.querySelector('img');
      const linkEl = el.closest('a') || el.querySelector('a');

      if (nameEl && priceEl && nameEl.textContent?.trim() && priceEl.textContent?.trim()) {
        const name = nameEl.textContent.trim().replace(/,/g, ' ');
        const price = priceEl.textContent.trim().replace(/[^0-9]/g, '');
        const link = linkEl ? (linkEl as HTMLAnchorElement).href : '';
        // 處理 Lazy load 圖片 URL
        const imgUrl = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';

        const junkKeywords = ['結束', '距離', '剩餘', '倒數', '活動', '領券'];
        const isJunk = junkKeywords.some(k => name.includes(k));

        if (name.length > 5 && price.length > 0 && !isJunk && imgUrl && imgUrl.startsWith('http') && !items.find(i => i.name === name)) {
          items.push({ name, price, link, imgUrl });
        }
      }
    });
    return items;
  });

  console.log(`成功找到 ${products.length} 項帶有圖片的商品。`);

  // 4. 建立目錄結構
  const outputDir = path.join(process.cwd(), 'pchome_report');
  const imgDir = path.join(outputDir, 'images');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  // 5. 下載圖片並產生 Markdown 內容 (限制下載前 30 個以節省資源)
  let mdContent = '# PChome 當日促銷商品報告\n\n| 預覽 | 商品名稱 | 價格 | 連結 |\n| --- | --- | --- | --- |\n';
  const limit = Math.min(products.length, 30);
  
  for (let i = 0; i < limit; i++) {
    const p = products[i];
    const imgName = `prod_${i}.jpg`;
    const imgPath = path.join(imgDir, imgName);
    
    try {
      await downloadImage(p.imgUrl, imgPath);
      mdContent += `| ![](${path.join('images', imgName)}) | ${p.name} | $${p.price} | [前往購買](${p.link}) |\n`;
      if ((i + 1) % 5 === 0) console.log(`已下載 ${i + 1} 張圖片...`);
    } catch (err) {
      console.error(`無法下載圖片 ${p.imgUrl}: ${err}`);
      mdContent += `| (無圖) | ${p.name} | $${p.price} | [前往購買](${p.link}) |\n`;
    }
  }

  // 6. 寫入 Markdown 檔案
  fs.writeFileSync(path.join(outputDir, 'README.md'), mdContent, 'utf8');
  console.log(`Markdown 報告已生成：${path.join(outputDir, 'README.md')}`);
});

