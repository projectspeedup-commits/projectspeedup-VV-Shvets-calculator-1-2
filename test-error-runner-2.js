import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('LOG:', msg.text());
    }
  });
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  try {
    console.log("Navigating...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Check if error boundary is visible initially
    await new Promise(r => setTimeout(r, 1000));
    const btn = await page.$('button');
    if (btn) {
       console.log("Found button! Clicking...");
       await btn.click(); // clicks "Войти" hopefully
       await new Promise(r => setTimeout(r, 2000));
    }
    const html = await page.content();
    console.log("Current HTML length:", html.length);
    if (html.includes('pre') && html.includes('color: red')) {
      console.log("Error boundary triggered!");
      const errorText = await page.evaluate(() => document.body.innerText);
      console.log("PAGE TEXT:", errorText);
    } else {
      console.log("No explicit error boundary visible");
    }

  } catch (err) {
    console.error('Failed to load:', err);
  }
  
  await browser.close();
})();
