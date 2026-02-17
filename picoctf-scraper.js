const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapePicoCTF(username) {
    console.log(`[picoctf-scraper] Starting scrape for user: ${username}`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        const url = `https://play.picoctf.org/users/${username}`;
        console.log(`[picoctf-scraper] Navigating to: ${url}`);

        // Attempt navigation with a longer timeout
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

        console.log(`[picoctf-scraper] Page loaded. Title: ${await page.title()}`);

        // Wait for the content to render (SPA takes time)
        await new Promise(r => setTimeout(r, 20000));

        const result = await page.evaluate(() => {
            const stats = { score: null, rank: null, solved: null };

            // Look for any text that matches the labels
            const walk = (el) => {
                if (!el || el.children.length > 50) return; // avoid deep recursion on containers

                const txt = el.innerText ? el.innerText.trim() : "";

                if (txt === "Score" || txt === "Total Score") {
                    const val = el.parentElement ? el.parentElement.innerText.replace(txt, '').trim() : "";
                    if (val && /^[0-9,]+$/.test(val.split('\n')[0])) stats.score = val.split('\n')[0];
                }

                if (txt === "World Rank") {
                    const val = el.parentElement ? el.parentElement.innerText.replace(txt, '').trim() : "";
                    if (val && /^[#0-9,]+$/.test(val.split('\n')[0])) stats.rank = val.split('\n')[0];
                }

                if (txt === "Solved") {
                    const val = el.parentElement ? el.parentElement.innerText.replace(txt, '').trim() : "";
                    if (val && /^[0-9,]+$/.test(val.split('\n')[0])) stats.solved = val.split('\n')[0];
                }

                Array.from(el.children).forEach(walk);
            };

            walk(document.body);

            // Specific selector fallback (common classes in CTFd based platforms)
            if (!stats.score) {
                const els = Array.from(document.querySelectorAll('h1, h2, h3, h4, span, div'));
                const scoreIdx = els.findIndex(e => e.innerText && e.innerText.includes("Score"));
                if (scoreIdx !== -1 && els[scoreIdx + 1]) stats.score = els[scoreIdx + 1].innerText.trim();
            }

            return { stats, bodyText: document.body.innerText.substring(0, 5000) };
        });

        console.log('[picoctf-scraper] Scraped Stats:', result.stats);

        // Final Regex Fallback on the whole string
        if (!result.stats.score) {
            const m = result.bodyText.match(/Score\s*[:\-]?\s*(\d[0-9,]*)/i);
            if (m) result.stats.score = m[1].trim();
        }
        if (!result.stats.rank) {
            const m = result.bodyText.match(/World Rank\s*[:\-]?\s*(#[\d,]+)/i);
            if (m) result.stats.rank = m[1].trim();
        }
        if (!result.stats.solved) {
            const m = result.bodyText.match(/Solved\s*[:\-]?\s*(\d[0-9,]*)/i);
            if (m) result.stats.solved = m[1].trim();
        }

        if (result.stats.score || result.stats.rank || result.stats.solved) {
            fs.writeFileSync('picoctf-stats.json', JSON.stringify(result.stats, null, 2));
            console.log('[picoctf-scraper] SUCCESS: Data saved.');
        } else {
            console.error('[picoctf-scraper] ERROR: All extraction methods failed.');
            console.log('--- SITE CONTENT DUMP ---');
            console.log(result.bodyText);
            console.log('--- END DUMP ---');
        }

    } catch (error) {
        console.error('[picoctf-scraper] CRITICAL ERROR:', error.message);
    } finally {
        await browser.close();
    }
}

const user = process.argv[2] || 'spw';
scrapePicoCTF(user).catch(err => {
    console.error('[picoctf-scraper] Unhandled rejection:', err);
    process.exit(1);
});
