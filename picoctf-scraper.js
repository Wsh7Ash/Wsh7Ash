const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function scrapePicoCTF(username) {
    console.log(`[picoctf-scraper] Starting stealth scrape for: ${username}`);
    const stats = { score: null, rank: null, solved: null };

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        const url = `https://play.picoctf.org/users/${username}`;
        console.log(`[picoctf-scraper] Navigating to: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

        // Wait for potential splash screens or SPA loading
        console.log("[picoctf-scraper] Waiting 30s for content...");
        await new Promise(r => setTimeout(r, 30000));

        const data = await page.evaluate(() => {
            const result = { score: null, rank: null, solved: null };
            const bodyText = document.body.innerText;

            // Search for patterns
            const scoreMatch = bodyText.match(/Score\s*[:\-]?\s*(\d[0-9,]*)/i);
            const rankMatch = bodyText.match(/World Rank\s*[:\-]?\s*(#[\d,]+)/i);
            const solvedMatch = bodyText.match(/Solved\s*[:\-]?\s*(\d[0-9,]*)/i);

            if (scoreMatch) result.score = scoreMatch[1].trim();
            if (rankMatch) result.rank = rankMatch[1].trim();
            if (solvedMatch) result.solved = solvedMatch[1].trim();

            return { result, text: bodyText.substring(0, 1000) };
        });

        console.log('[picoctf-scraper] Scraped result:', data.result);

        if (data.result.score || data.result.rank || data.result.solved) {
            data.result.last_updated = new Date().toISOString();
            fs.writeFileSync('picoctf-stats.json', JSON.stringify(data.result, null, 2));
            console.log('[picoctf-scraper] SUCCESS: Data saved.');
        } else {
            console.error('[picoctf-scraper] FAILURE: No stats found. Text preview:');
            console.log(data.text);
            fs.writeFileSync('picoctf-stats.json', JSON.stringify({ score: "N/A", rank: "Hidden", solved: "N/A", last_updated: new Date().toISOString() }, null, 2));
        }

    } catch (error) {
        console.error('[picoctf-scraper] CRITICAL ERROR:', error.message);
        fs.writeFileSync('picoctf-stats.json', JSON.stringify({ score: "Error", rank: error.message, solved: "Error", last_updated: new Date().toISOString() }, null, 2));
    } finally {
        await browser.close();
    }
}

const user = process.argv[2] || 'spw';
scrapePicoCTF(user);
