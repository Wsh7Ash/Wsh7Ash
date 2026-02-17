const fs = require('fs');
const https = require('https');

async function scrapePicoCTF(username) {
    console.log(`[picoctf-scraper] Fetching data for user: ${username}`);
    const stats = { score: null, rank: null, solved: null };

    try {
        const htmlUrl = `https://play.picoctf.org/users/${username}`;
        console.log(`[picoctf-scraper] Trying HTML: ${htmlUrl}`);

        const htmlData = await new Promise((resolve, reject) => {
            const req = https.get(htmlUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
                }
            }, (res) => {
                console.log(`[picoctf-scraper] HTML Fetch Status: ${res.statusCode}`);
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            });
            req.on('error', (err) => {
                console.error(`[picoctf-scraper] Fetch Error: ${err.message}`);
                reject(err);
            });
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Timeout after 30s'));
            });
        });

        console.log(`[picoctf-scraper] Fetched HTML Length: ${htmlData.length}`);

        // Strategy 1: Look for strings in HTML
        const scoreMatch = htmlData.match(/Score\s*[:\-]?\s*(\d[0-9,]*)/i);
        const rankMatch = htmlData.match(/World Rank\s*[:\-]?\s*(#[\d,]+)/i);
        const solvedMatch = htmlData.match(/Solved\s*[:\-]?\s*(\d[0-9,]*)/i);

        if (scoreMatch) stats.score = scoreMatch[1].trim();
        if (rankMatch) stats.rank = rankMatch[1].trim();
        if (solvedMatch) stats.solved = solvedMatch[1].trim();

        console.log('[picoctf-scraper] Final Stats:', stats);

        if (stats.score || stats.rank || stats.solved) {
            fs.writeFileSync('picoctf-stats.json', JSON.stringify(stats, null, 2));
            console.log('[picoctf-scraper] SUCCESS: Data saved.');
        } else {
            console.error('[picoctf-scraper] FAILURE: No stats found in HTML strings.');
            fs.writeFileSync('picoctf-stats.json', JSON.stringify({ score: "N/A", rank: "N/A", solved: "N/A" }, null, 2));
        }

    } catch (error) {
        console.error('[picoctf-scraper] CRITICAL ERROR:', error.message);
        fs.writeFileSync('picoctf-stats.json', JSON.stringify({ score: "Error", rank: error.message, solved: "Error" }, null, 2));
    }
}

const user = process.argv[2] || 'spw';
scrapePicoCTF(user);
