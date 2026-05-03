const { execSync } = require('child_process');

/**
 * 執行 Playwright 測試並返回簡潔結果
 */
function runTests(filter = '') {
  try {
    console.log(`正在執行 Playwright 測試${filter ? ` (篩選: ${filter})` : ''}...`);
    const output = execSync(`npx playwright test ${filter} --reporter=line`, { encoding: 'utf-8' });
    console.log('測試執行成功！');
    console.log(output);
  } catch (error) {
    console.error('測試執行失敗：');
    console.error(error.stdout || error.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
runTests(args.join(' '));
