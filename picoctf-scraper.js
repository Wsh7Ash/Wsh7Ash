const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapePicoCTF(username) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log(`[picoctf-scraper] Navigating to profile: https://play.picoctf.org/users/${username}`);
        await page.goto(`https://play.picoctf.org/users/${username}`, { waitUntil: 'networkidle2' });

        // Give it plenty of time to load dynamic content
        await new Promise(r => setTimeout(r, 10000));

        const stats = await page.evaluate(() => {
            const results = {};
            const allElements = Array.from(document.querySelectorAll('*'));

            const findValueForLabel = (label) => {
                const labelEl = allElements.find(el => el.innerText && el.innerText.trim() === label);
                if (!labelEl) return null;

                // Try parent's children logic
                const parent = labelEl.parentElement;
                if (!parent) return null;

                // Find a sibling that looks like a number
                const siblings = Array.from(parent.children);
                for (const sib of siblings) {
                    if (sib === labelEl) continue;
                    const text = sib.innerText.trim();
                    if (text && /^[#\d,]+$/.test(text)) return text;
                }

                // Fallback: search in parent's text
                const pt = parent.innerText.replace(label, '').trim();
                if (pt && /^[#\d,]+$/.test(pt.split('\n')[0])) return pt.split('\n')[0];

                return null;
            };

            results.score = findValueForLabel('Score');
            results.rank = findValueForLabel('World Rank');
            results.solved = findValueForLabel('Solved');

            return results;
        });

        console.log('[picoctf-scraper] Scraped stats:', stats);

        if (stats.score || stats.rank || stats.solved) {
            fs.writeFileSync('picoctf-stats.json', JSON.stringify(stats, null, 2));
            console.log('[picoctf-scraper] Wrote picoctf-stats.json');
        } else {
            console.error('[picoctf-scraper] Could not find stats on page. Check if elements changed.');
        }

    } catch (error) {
        console.error('[picoctf-scraper] Error during scraping:', error);
    } finally {
        await browser.close();
    }
}

const user = process.argv[2] || 'spw';
scrapePicoCTF(user);
