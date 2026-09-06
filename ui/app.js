const $ = (id) => document.getElementById(id);

const urlWell = $('urlWell');
const countPill = $('countPill');
const metaCaption = $('metaCaption');
const folderPath = $('folderPath');
const browseBtn = $('browseBtn');
const actionBtn = $('actionBtn');
const actionHint = $('actionHint');
const progressSection = $('progressSection');
const progressLabel = $('progressLabel');
const progressBar = $('progressBar');
const progressFill = $('progressFill');
const logEl = $('log');
const doneSection = $('doneSection');
const doneText = $('doneText');
const gearBtn = $('gearBtn');
const settingsOverlay = $('settingsOverlay');
const settingsClose = $('settingsClose');
const toast = $('toast');

let parsed = { urls: [], duplicatesRemoved: 0, invalidSkipped: 0 };
let saveHtml = false;
let running = false;
let cancelling = false;
let configReady = false;
let outputDir = '';
let isDefaultFolder = true;

function updateCount() {
    parsed = window.api.parseUrls(urlWell.value);
    countPill.textContent = `${parsed.urls.length} URL${parsed.urls.length === 1 ? '' : 's'}`;
    countPill.classList.remove('bump');
    void countPill.offsetWidth;
    countPill.classList.add('bump');

    const parts = [];
    if (parsed.duplicatesRemoved) parts.push(`${parsed.duplicatesRemoved} duplicates removed`);
    if (parsed.invalidSkipped) parts.push(`${parsed.invalidSkipped} invalid lines skipped`);
    metaCaption.textContent = parts.join(' · ');
    metaCaption.hidden = !parts.length;

    updateCaptureState();
}

function captureHint() {
    if (!configReady) return 'Loading…';
    if (parsed.urls.length === 0) return 'Paste at least one URL';
    if (!outputDir) return 'Choose a folder';
    return '';
}

function updateCaptureState() {
    const hint = captureHint();
    actionHint.textContent = running || cancelling ? '' : hint;
    actionBtn.disabled = running ? cancelling : (!configReady || parsed.urls.length === 0 || !outputDir);
    actionBtn.title = hint;
}

function truncatePath(p) {
    if (!p || p.length <= 48) return p || '';
    return '…' + p.slice(-45);
}

function setFolderDisplay() {
    const label = truncatePath(outputDir);
    folderPath.textContent = isDefaultFolder ? `${label} (default)` : label;
    folderPath.title = `${outputDir}\nClick to copy`;
}

async function loadConfig() {
    const config = await window.api.getConfig();
    outputDir = config.outputDir;
    isDefaultFolder = config.isDefaultFolder;
    configReady = true;
    setFolderDisplay();
    document.documentElement.dataset.theme = config.theme || 'light';
    syncSettingsUI(config);
    updateCaptureState();
}

function syncSettingsUI(config) {
    document.querySelectorAll('.settings-segment [data-theme]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.theme === config.theme);
    });
    document.querySelectorAll('[data-viewport]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.viewport === config.viewport);
    });
}

function setRunning(on) {
    running = on;
    cancelling = false;
    urlWell.disabled = on;
    browseBtn.disabled = on;
    actionBtn.textContent = on ? 'Cancel' : 'Capture';
    actionBtn.classList.toggle('cancel', on);
    progressBar.hidden = !on;
    progressSection.classList.toggle('active', on);
    if (!on) {
        progressFill.style.width = '0%';
        progressLabel.textContent = '';
    }
    updateCaptureState();
}

function appendLog(message, level = 'info') {
    const line = document.createElement('div');
    line.className = `log-line log-${level}`;
    line.textContent = message;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
}

function formatProgress(e) {
    const base = `${e.current} / ${e.total}`;
    const host = e.host || '';
    if (e.phase === 'loading') return `${base} · Loading ${host}…`;
    if (e.phase === 'capturing') return `${base} · Capturing ${host}…`;
    return `${base} · ${host}`;
}

function showDone(result) {
    const path = truncatePath(result.outputDir);
    const fullPath = result.outputDir;
    let text = '';
    let kind = 'success';

    if (result.cancelled) {
        kind = result.saved > 0 ? 'warning' : 'cancelled';
        if (result.saved > 0) {
            text = `⚠ Cancelled — ${result.saved} saved, ${result.errors} failed · ${path}`;
        } else {
            text = `✕ Cancelled — nothing saved`;
        }
    } else if (result.saved === 0 && result.errors > 0) {
        kind = 'error';
        text = `✕ Failed — ${result.errors} error${result.errors === 1 ? '' : 's'}`;
    } else if (result.errors > 0) {
        kind = 'warning';
        text = `⚠ ${result.saved} saved, ${result.errors} failed · ${path}`;
    } else {
        text = `✓ Saved ${result.saved} file${result.saved === 1 ? '' : 's'} to ${path}`;
    }

    doneSection.className = `done-section done-${kind}`;
    doneText.textContent = text;
    doneText.title = fullPath;
    doneSection.hidden = false;
}

function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 2000);
}

async function startCapture() {
    doneSection.hidden = true;
    logEl.innerHTML = '';
    setRunning(true);
    progressLabel.textContent = `0 / ${parsed.urls.length}`;

    const unsub = window.api.onProgress((e) => {
        if (e.type === 'progress') {
            progressLabel.textContent = formatProgress(e);
            progressFill.style.width = `${(e.current / e.total) * 100}%`;
        } else if (e.type === 'log') {
            const level = e.level || (e.message.startsWith('Failed') || e.message.startsWith('Launch') ? 'error' : e.message.startsWith('Saved') ? 'ok' : 'info');
            appendLog(e.message, level);
        }
    });

    try {
        const result = await window.api.startCapture({ urls: parsed.urls, saveHtml });
        showDone(result);
    } finally {
        unsub();
        setRunning(false);
        updateCaptureState();
    }
}

function openSettings() {
    settingsOverlay.hidden = false;
    settingsClose.focus();
}

function closeSettings() {
    settingsOverlay.hidden = true;
    gearBtn.focus();
}

urlWell.addEventListener('input', updateCount);
urlWell.addEventListener('paste', () => setTimeout(updateCount, 0));

browseBtn.addEventListener('click', async () => {
    const folder = await window.api.selectFolder();
    if (folder) {
        outputDir = folder;
        isDefaultFolder = false;
        setFolderDisplay();
        updateCaptureState();
    }
});

folderPath.addEventListener('click', async () => {
    if (!outputDir) return;
    await navigator.clipboard.writeText(outputDir);
    showToast('Copied path');
});

document.querySelector('.format-segment').addEventListener('click', (e) => {
    const btn = e.target.closest('.segment');
    if (!btn) return;
    document.querySelectorAll('.format-segment .segment').forEach((s) => s.classList.remove('active'));
    btn.classList.add('active');
    saveHtml = btn.dataset.format === 'html';
});

actionBtn.addEventListener('click', () => {
    if (running && !cancelling) {
        cancelling = true;
        actionBtn.textContent = 'Cancelling…';
        actionBtn.disabled = true;
        window.api.cancelCapture();
    } else if (!running) {
        startCapture();
    }
});

gearBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) closeSettings();
});

document.querySelectorAll('.settings-segment [data-theme]').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const theme = btn.dataset.theme;
        document.documentElement.dataset.theme = theme;
        document.querySelectorAll('.settings-segment [data-theme]').forEach((b) => {
            b.classList.toggle('active', b.dataset.theme === theme);
        });
        await window.api.setConfig({ theme });
    });
});

document.querySelectorAll('[data-viewport]').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const viewport = btn.dataset.viewport;
        document.querySelectorAll('[data-viewport]').forEach((b) => {
            b.classList.toggle('active', b.dataset.viewport === viewport);
        });
        await window.api.setConfig({ viewport });
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!settingsOverlay.hidden) { closeSettings(); return; }
        if (running && !cancelling) {
            cancelling = true;
            actionBtn.textContent = 'Cancelling…';
            actionBtn.disabled = true;
            window.api.cancelCapture();
        }
        return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !running && !actionBtn.disabled) {
        e.preventDefault();
        startCapture();
    }
});

loadConfig();
updateCount();
