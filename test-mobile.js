import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 375, height: 667 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Login
    await new Promise(r => setTimeout(r, 1000));
    const btn = await page.$('button');
    if (btn) {
       await btn.click(); // clicks "Войти" hopefully
       await new Promise(r => setTimeout(r, 2000));
    }
    await page.screenshot({ path: 'mobile.png' });
    const html = await page.content();
    console.log("HTML length:", html.length);
  } catch (err) {
    console.error('Failed to load:', err);
  }
  
  await browser.close();
})();
