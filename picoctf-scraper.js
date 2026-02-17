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

        // Wait for the main stats to appear. 
        // We search for elements containing keywords like "Score" or "Rank"
        const stats = await page.evaluate(() => {
            const getStat = (text) => {
                const el = Array.from(document.querySelectorAll('div, span, p, h3, h4'))
                    .find(e => e.textContent.includes(text));
                if (!el) return null;

                // Usually the number is in the next sibling or parent's child
                const parent = el.parentElement;
                return parent ? parent.textContent.replace(text, '').trim() : null;
            };

            return {
                score: getStat('Score'),
                rank: getStat('World Rank'),
                solved: getStat('Solved')
            };
        });

        console.log('[picoctf-scraper] Scraped stats:', stats);

        if (stats.score || stats.rank || stats.solved) {
            fs.writeFileSync('picoctf-stats.json', JSON.stringify(stats, null, 2));
            console.log('[picoctf-scraper] Wrote picoctf-stats.json');
        } else {
            console.error('[picoctf-scraper] Could not find stats on page.');
        }

    } catch (error) {
        console.error('[picoctf-scraper] Error during scraping:', error);
    } finally {
        await browser.close();
    }
}

const user = process.argv[2] || 'spw';
scrapePicoCTF(user);
