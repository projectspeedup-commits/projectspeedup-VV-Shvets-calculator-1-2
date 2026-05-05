import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
        await page.goto('http://localhost:3000', {waitUntil: 'networkidle2'});
        
        let buttons = await page.$$('button');
        let clicked = false;
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text && text.includes('Войти в калькулятор')) {
                console.log('Clicking', text);
                await btn.click();
                clicked = true;
                break;
            }
        }
        if (!clicked) console.log("Did not find button");
        await new Promise(r => setTimeout(r, 2000));
        await browser.close();
    } catch(e) { console.error('Puppeteer error:', e) }
})();
