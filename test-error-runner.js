import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  try {
    console.log("Navigating...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });
    const content = await page.content();
    if (content.includes('HasError')) {
      console.log("Error boundary triggered or visible in HTML");
      const errorText = await page.evaluate(() => document.body.innerText);
      console.log("PAGE TEXT:", errorText);
    } else {
      console.log('No error seen on page');
    }
  } catch (err) {
    console.error('Failed to load:', err);
  }
  
  await browser.close();
})();
