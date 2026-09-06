const $ = (id) => document.getElementById(id);

const urlWell = $('urlWell');
const countPill = $('countPill');
const dupesCaption = $('dupesCaption');
const folderPath = $('folderPath');
const browseBtn = $('browseBtn');
const actionBtn = $('actionBtn');
const progressSection = $('progressSection');
const progressLabel = $('progressLabel');
const progressFill = $('progressFill');
const logEl = $('log');
const doneSection = $('doneSection');
const doneText = $('doneText');
const gearBtn = $('gearBtn');
const settingsOverlay = $('settingsOverlay');
const settingsClose = $('settingsClose');

let parsed = { urls: [], duplicatesRemoved: 0 };
let saveHtml = false;
let running = false;
let outputDir = '';

function parseUrls(text) {
    const seen = new Set();
    const urls = [];
    let duplicatesRemoved = 0;
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            const url = new URL(trimmed);
            if (!['http:', 'https:'].includes(url.protocol)) continue;
            const key = url.href;
            if (seen.has(key)) { duplicatesRemoved++; continue; }
            seen.add(key);
            urls.push(key);
        } catch { /* skip invalid */ }
    }
    return { urls, duplicatesRemoved };
}

function updateCount() {
    parsed = parseUrls(urlWell.value);
    countPill.textContent = `${parsed.urls.length} URL${parsed.urls.length === 1 ? '' : 's'}`;
    countPill.classList.remove('bump');
    void countPill.offsetWidth;
    countPill.classList.add('bump');
    if (parsed.duplicatesRemoved) {
        dupesCaption.textContent = `${parsed.duplicatesRemoved} duplicates removed`;
        dupesCaption.hidden = false;
    } else {
        dupesCaption.hidden = true;
    }
    updateCaptureState();
}

function updateCaptureState() {
    actionBtn.disabled = running || parsed.urls.length === 0 || !outputDir;
}

function truncatePath(p) {
    if (p.length <= 48) return p;
    return '…' + p.slice(-45);
}

async function loadConfig() {
    const config = await window.api.getConfig();
    outputDir = config.outputDir;
    folderPath.textContent = truncatePath(outputDir);
    folderPath.title = outputDir;
    document.documentElement.dataset.theme = config.theme || 'light';
    syncSettingsUI(config);
}

function syncSettingsUI(config) {
    document.querySelectorAll('[data-theme]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.theme === config.theme);
    });
    document.querySelectorAll('[data-viewport]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.viewport === config.viewport);
    });
}

function setRunning(on) {
    running = on;
    urlWell.disabled = on;
    browseBtn.disabled = on;
    actionBtn.textContent = on ? 'Cancel' : 'Capture';
    actionBtn.classList.toggle('cancel', on);
    actionBtn.disabled = on ? false : parsed.urls.length === 0 || !outputDir;
    progressSection.hidden = !on;
    if (!on) progressFill.style.width = '0%';
}

function appendLog(msg) {
    logEl.textContent += (logEl.textContent ? '\n' : '') + msg;
    logEl.scrollTop = logEl.scrollHeight;
}

async function startCapture() {
    doneSection.hidden = true;
    logEl.textContent = '';
    setRunning(true);
    progressLabel.textContent = `0 / ${parsed.urls.length}`;
    const unsub = window.api.onProgress((e) => {
        if (e.type === 'progress') {
            progressLabel.textContent = `${e.current} / ${e.total}`;
            progressFill.style.width = `${(e.current / e.total) * 100}%`;
        } else if (e.type === 'log') {
            appendLog(e.message);
        }
    });
    try {
        const result = await window.api.startCapture({ urls: parsed.urls, saveHtml });
        doneText.textContent = `Saved to ${result.outputDir}`;
        doneSection.hidden = false;
    } finally {
        unsub();
        setRunning(false);
        updateCaptureState();
    }
}

urlWell.addEventListener('input', updateCount);
urlWell.addEventListener('paste', () => setTimeout(updateCount, 0));

browseBtn.addEventListener('click', async () => {
    const folder = await window.api.selectFolder();
    if (folder) {
        outputDir = folder;
        folderPath.textContent = truncatePath(folder);
        folderPath.title = folder;
        updateCaptureState();
    }
});

document.querySelector('.segmented[aria-label]').addEventListener('click', (e) => {
    const btn = e.target.closest('.segment');
    if (!btn) return;
    document.querySelectorAll('.segmented[aria-label] .segment').forEach((s) => s.classList.remove('active'));
    btn.classList.add('active');
    saveHtml = btn.dataset.format === 'html';
});

actionBtn.addEventListener('click', () => {
    if (running) window.api.cancelCapture();
    else startCapture();
});

gearBtn.addEventListener('click', () => { settingsOverlay.hidden = false; });
settingsClose.addEventListener('click', () => { settingsOverlay.hidden = true; });
settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) settingsOverlay.hidden = true;
});

document.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const theme = btn.dataset.theme;
        document.documentElement.dataset.theme = theme;
        document.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('active', b.dataset.theme === theme));
        await window.api.setConfig({ theme });
    });
});

document.querySelectorAll('[data-viewport]').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const viewport = btn.dataset.viewport;
        document.querySelectorAll('[data-viewport]').forEach((b) => b.classList.toggle('active', b.dataset.viewport === viewport));
        await window.api.setConfig({ viewport });
    });
});

loadConfig();
updateCount();
