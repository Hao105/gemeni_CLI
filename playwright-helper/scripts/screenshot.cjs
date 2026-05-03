const { execSync } = require('child_process');

/**
 * 使用 Playwright 進行網頁截圖
 */
function takeScreenshot(url, filename) {
  if (!url || !filename) {
    console.error('錯誤：請提供 URL 和 檔案名稱。');
    process.exit(1);
  }

  try {
    console.log(`正在為 ${url} 進行截圖...`);
    execSync(`npx playwright screenshot ${url} ${filename}`, { encoding: 'utf-8' });
    console.log(`截圖已儲存至：${filename}`);
  } catch (error) {
    console.error('截圖失敗：');
    console.error(error.message);
    process.exit(1);
  }
}

const [url, filename] = process.argv.slice(2);
takeScreenshot(url, filename);
