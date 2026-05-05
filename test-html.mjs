import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.goto('http://localhost:3000', {waitUntil: 'networkidle2'});
        const html = await page.evaluate(() => document.body.innerHTML);
        console.log("HTML:", html.substring(0, 500));
        await browser.close();
    } catch(e) { console.error('Puppeteer error:', e) }
})();
