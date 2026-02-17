const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapePicoCTF(username) {
    console.log(`[picoctf-scraper] Starting scrape for user: ${username}`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        const url = `https://play.picoctf.org/users/${username}`;
        console.log(`[picoctf-scraper] Navigating to: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for the dynamic content to settle
        console.log(`[picoctf-scraper] Waiting 15s for content...`);
        await new Promise(r => setTimeout(r, 15000));

        const result = await page.evaluate(() => {
            const stats = { score: null, rank: null, solved: null };
            const body = document.body;
            const text = body.innerText;

            // Strategy 1: Look for specific labels and their neighbors
            const findVal = (label) => {
                const el = Array.from(document.querySelectorAll('*'))
                    .find(e => e.children.length === 0 && e.innerText && e.innerText.trim() === label);
                if (!el) return null;

                // Check siblings or parent's other children
                let p = el.parentElement;
                if (!p) return null;

                let val = Array.from(p.innerText.split('\n'))
                    .map(t => t.trim())
                    .filter(t => t && t !== label && /^[#\d,]+$/.test(t))[0];

                return val || null;
            };

            stats.score = findVal('Score');
            stats.rank = findVal('World Rank');
            stats.solved = findVal('Solved');

            // Strategy 2: Regex fallback
            if (!stats.score) {
                const m = text.match(/Score\s*\n*\s*([\d,]+)/i);
                if (m) stats.score = m[1].trim();
            }
            if (!stats.rank) {
                const m = text.match(/World Rank\s*\n*\s*(#[\d,]+)/i);
                if (m) stats.rank = m[1].trim();
            }
            if (!stats.solved) {
                const m = text.match(/Solved\s*\n*\s*([\d,]+)/i);
                if (m) stats.solved = m[1].trim();
            }

            return { stats, html: body.innerHTML.substring(0, 10000), text: text.substring(0, 2000) };
        });

        console.log('[picoctf-scraper] Scraped Result:', result.stats);

        if (result.stats.score || result.stats.rank || result.stats.solved) {
            fs.writeFileSync('picoctf-stats.json', JSON.stringify(result.stats, null, 2));
            console.log('[picoctf-scraper] SUCCESS: Wrote picoctf-stats.json');
        } else {
            console.error('[picoctf-scraper] FAILURE: Could not find stats. Page content follows:');
            console.log('--- TEXT CONTENT ---');
            console.log(result.text);
            console.log('--- END TEXT CONTENT ---');
        }

    } catch (error) {
        console.error('[picoctf-scraper] CRITICAL ERROR:', error.message);
    } finally {
        await browser.close();
    }
}

const user = process.argv[2] || 'spw';
scrapePicoCTF(user);
