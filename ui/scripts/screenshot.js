import puppeteer from 'puppeteer';
import path from 'path';

const htmlPath = process.argv[2];
const outPath = process.argv[3];

if (!htmlPath || !outPath) {
  console.error("Usage: node screenshot.js <input.html> <output.png>");
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport large enough for a plot
  await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });
  
  // Load the HTML file
  const fileUrl = 'file://' + path.resolve(htmlPath);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  
  // Wait an extra moment to ensure Plotly animations/renderings are completely finished
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await page.screenshot({ path: outPath });
  await browser.close();
})();
