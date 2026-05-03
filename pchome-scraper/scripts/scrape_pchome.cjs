const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadImage(url, dest) {
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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('正在前往 PChome 24h...');
    await page.goto('https://24h.pchome.com.tw/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('正在捲動頁面以加載商品...');
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1000);
    }

    console.log('正在擷取商品資料...');
    const products = await page.evaluate(() => {
      const items = [];
      const potentialContainers = document.querySelectorAll('[class*="prod"], [class*="item"], [class*="box"]');
      
      potentialContainers.forEach(el => {
        const nameEl = el.querySelector('[class*="name"], [class*="title"]');
        const priceEl = el.querySelector('[class*="price"], [class*="value"]');
        const imgEl = el.querySelector('img');
        const linkEl = el.closest('a') || el.querySelector('a');

        if (nameEl && priceEl && nameEl.textContent?.trim() && priceEl.textContent?.trim()) {
          const name = nameEl.textContent.trim().replace(/,/g, ' ');
          const price = priceEl.textContent.trim().replace(/[^0-9]/g, '');
          const link = linkEl ? linkEl.href : '';
          const imgUrl = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';

          const junkKeywords = ['結束', '距離', '剩餘', '倒數', '活動', '領券'];
          const isJunk = junkKeywords.some(k => name.includes(k));

          if (name.length > 5 && price.length > 0 && !isJunk && imgUrl && imgUrl.startsWith('http')) {
            if (!items.find(i => i.name === name)) {
              items.push({ name, price, link, imgUrl });
            }
          }
        }
      });
      return items;
    });

    console.log(`成功找到 ${products.length} 項商品。`);

    const outputDir = path.join(process.cwd(), 'pchome_daily_report');
    const imgDir = path.join(outputDir, 'images');
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

    let mdContent = '# PChome 每日促銷商品報告\n\n產生時間: ' + new Date().toLocaleString() + '\n\n| 預覽 | 商品名稱 | 價格 | 連結 |\n| --- | --- | --- | --- |\n';
    const limit = Math.min(products.length, 30);
    
    for (let i = 0; i < limit; i++) {
      const p = products[i];
      const imgName = `prod_${i}.jpg`;
      const imgPath = path.join(imgDir, imgName);
      
      try {
        await downloadImage(p.imgUrl, imgPath);
        mdContent += `| ![](${path.join('images', imgName)}) | ${p.name} | $${p.price} | [前往購買](${p.link}) |\n`;
      } catch (err) {
        mdContent += `| (無圖) | ${p.name} | $${p.price} | [前往購買](${p.link}) |\n`;
      }
    }

    fs.writeFileSync(path.join(outputDir, 'README.md'), mdContent, 'utf8');
    console.log(`✅ 報告已生成：${path.join(outputDir, 'README.md')}`);

  } catch (error) {
    console.error('❌ 執行失敗:', error.message);
  } finally {
    await browser.close();
  }
})();
