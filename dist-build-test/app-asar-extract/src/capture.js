const { parseUrls } = require('./urls');

const BROWSER_MSG = {
    headless: 'Using Chrome (background)',
    'headed-min': 'Switching to visible browser (minimized)',
    'headed-full': 'Switching to visible browser',
};

function parseViewport(viewport) {
    const [w, h] = String(viewport || '1366x900').split('x').map(Number);
    return { width: w || 1366, height: h || 900 };
}

function hostnameFromUrl(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}

async function launchBrowser(mode) {
    const { chromium } = require('playwright-extra');
    const stealth = require('puppeteer-extra-plugin-stealth')();
    chromium.use(stealth);

    const base = { args: ['--disable-blink-features=AutomationControlled'] };

    if (mode === 'headless') {
        base.headless = true;
    } else if (mode === 'headed-min') {
        base.headless = false;
        base.args.push('--window-position=-32000,-32000', '--window-size=1,1');
    } else {
        base.headless = false;
    }

    for (const channel of ['chrome', 'msedge']) {
        try {
            return await chromium.launch({ ...base, channel });
        } catch (_) {}
    }
    return chromium.launch(base);
}

async function isBlocked(page) {
    return (await page.locator('text=Access denied').count()) > 0;
}

async function capture({
    urls,
    outputDir,
    saveHtml = false,
    viewport = '1366x900',
    onProgress = () => {},
    shouldCancel = () => false,
}) {
    const fs = require('fs');
    const path = require('path');
    const vp = parseViewport(viewport);
    const modes = ['headless', 'headed-min', 'headed-full'];
    let browser = null;
    let context = null;
    let modeIndex = 0;
    let blockedOnFirst = false;

    const log = (message, level = 'info') => onProgress({ type: 'log', message, level });

    const ensureBrowser = async (forceNext = false) => {
        if (browser && !forceNext) return;
        if (browser) {
            await browser.close().catch(() => {});
            browser = null;
            context = null;
        }
        if (forceNext && modeIndex < modes.length - 1) modeIndex++;
        const mode = modes[modeIndex];
        browser = await launchBrowser(mode);
        context = await browser.newContext({
            viewport: vp,
            locale: 'en-AE',
            timezoneId: 'Asia/Dubai',
            geolocation: { latitude: 25.2048, longitude: 55.2708 },
            permissions: ['geolocation'],
            extraHTTPHeaders: { 'Accept-Language': 'en-AE,en;q=0.9,ar;q=0.8' },
        });
        if (forceNext || modeIndex > 0) log(BROWSER_MSG[mode] || `Browser: ${mode}`);
    };

    try {
        await ensureBrowser();
    } catch (err) {
        log(`Launch failed: ${err.message}`, 'error');
        return { saved: 0, errors: urls.length };
    }

    fs.mkdirSync(outputDir, { recursive: true });
    const hostCounts = {};
    let saved = 0;
    let errors = 0;

    for (let i = 0; i < urls.length; i++) {
        if (shouldCancel()) break;

        const url = urls[i];
        const host = hostnameFromUrl(url);
        hostCounts[host] = (hostCounts[host] || 0) + 1;
        const n = hostCounts[host];
        const baseName = `${host}-${n}`;
        const pngPath = path.join(outputDir, `${baseName}.png`);
        const htmlPath = path.join(outputDir, `${baseName}.html`);

        onProgress({ type: 'progress', current: i + 1, total: urls.length, url, host, phase: 'loading' });

        const page = await context.newPage();
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
            await page.waitForTimeout(5000);
            onProgress({ type: 'progress', current: i + 1, total: urls.length, url, host, phase: 'capturing' });

            if (await isBlocked(page)) {
                if (i === 0 && modeIndex < modes.length - 1) {
                    blockedOnFirst = true;
                    await page.close();
                    await ensureBrowser(true);
                    const retryPage = await context.newPage();
                    try {
                        onProgress({ type: 'progress', current: i + 1, total: urls.length, url, host, phase: 'loading' });
                        await retryPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
                        await retryPage.waitForTimeout(5000);
                        onProgress({ type: 'progress', current: i + 1, total: urls.length, url, host, phase: 'capturing' });
                        if (await isBlocked(retryPage)) throw new Error('Blocked by bot protection');
                        await retryPage.screenshot({ path: pngPath, fullPage: true });
                        if (saveHtml) fs.writeFileSync(htmlPath, await retryPage.content(), 'utf8');
                        saved++;
                        log(`Saved ${baseName}.png`, 'ok');
                    } finally {
                        await retryPage.close();
                    }
                    continue;
                }
                throw new Error('Blocked by bot protection');
            }

            await page.screenshot({ path: pngPath, fullPage: true });
            if (saveHtml) fs.writeFileSync(htmlPath, await page.content(), 'utf8');
            saved++;
            log(`Saved ${baseName}.png`, 'ok');
        } catch (err) {
            errors++;
            log(`Failed ${host}: ${err.message}`, 'error');
            if (i === 0 && modeIndex === 0 && !blockedOnFirst && modes.length > 1) {
                await page.close();
                try {
                    await ensureBrowser(true);
                } catch (launchErr) {
                    log(`Retry launch failed: ${launchErr.message}`, 'error');
                }
                continue;
            }
        } finally {
            await page.close().catch(() => {});
        }
    }

    if (browser) await browser.close().catch(() => {});
    return { saved, errors, cancelled: shouldCancel() };
}

module.exports = { capture, parseUrls, parseViewport };

if (require.main === module) {
    const fs = require('fs');
    const path = require('path');
    const [listFile, outDir] = process.argv.slice(2);
    if (!listFile || !outDir) {
        console.error('Usage: node src/capture.js urls.txt ./out');
        process.exit(1);
    }
    const text = fs.readFileSync(listFile, 'utf8');
    const { urls, duplicatesRemoved, invalidSkipped } = parseUrls(text);
    if (duplicatesRemoved) console.log(`${duplicatesRemoved} duplicates removed`);
    if (invalidSkipped) console.log(`${invalidSkipped} invalid lines skipped`);
    capture({
        urls,
        outputDir: path.resolve(outDir),
        saveHtml: process.argv.includes('--html'),
        onProgress: (e) => {
            if (e.type === 'log') console.log(e.message);
            else if (e.type === 'progress') console.log(`[${e.current}/${e.total}] ${e.host || e.url}`);
        },
    }).then((r) => {
        console.log(`Done. saved=${r.saved} errors=${r.errors}`);
        process.exit(r.errors && !r.saved ? 1 : 0);
    });
}
