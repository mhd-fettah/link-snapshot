const $ = (id) => document.getElementById(id);

const urlWell = $('urlWell');
const urlInputWrap = $('urlInputWrap');
const urlCardsWrap = $('urlCardsWrap');
const urlCards = $('urlCards');
const urlAreaToolbar = $('urlAreaToolbar');
const discardAllBtn = $('discardAllBtn');
const linkCount = $('linkCount');
const captureProgress = $('captureProgress');
const captureProgressFill = $('captureProgressFill');
const captureProgressLabel = $('captureProgressLabel');
const folderPath = $('folderPath');
const folderPicker = $('folderPicker');
const imagesBtn = $('imagesBtn');
const htmlBtn = $('htmlBtn');
const viewportBtn = $('viewportBtn');
const viewportMenu = $('viewportMenu');
const viewportLabel = $('viewportLabel');
const viewportWrap = $('viewportWrap');
const actionBtn = $('actionBtn');
const toast = $('toast');

const ICON_CHECK = '<path d="M10 3L4.5 8.5 2 6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
const ICON_OFF = '<path d="M3 6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';

const VIEWPORTS = {
    '390x844': 'Mobile',
    '768x1024': 'Tablet',
    '1366x900': 'Laptop',
    '1536x864': 'Desktop',
    '1920x1080': 'Full HD',
};

let urlItems = [];
let saveImages = true;
let saveHtml = false;
let running = false;
let cancelling = false;
let configReady = false;
let outputDir = '';
let isDefaultFolder = true;
let inputTimer;

function parseInput(text) {
    if (window.api?.parseUrls) return window.api.parseUrls(text);
    const seen = new Set();
    const urls = [];
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            const url = new URL(trimmed);
            if (['http:', 'https:'].includes(url.protocol) && !seen.has(url.href)) {
                seen.add(url.href);
                urls.push(url.href);
            }
        } catch (_) {}
    }
    return { urls };
}

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

function shortUrl(url) {
    try {
        const u = new URL(url);
        const path = u.pathname + u.search;
        const host = u.hostname.replace(/^www\./, '');
        if (path === '/' || path === '') return host;
        const p = path.length > 36 ? path.slice(0, 33) + '…' : path;
        return host + p;
    } catch {
        return url.length > 48 ? url.slice(0, 45) + '…' : url;
    }
}

function syncFormatBtn(btn, on) {
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.querySelector('.format-icon').innerHTML = on ? ICON_CHECK : ICON_OFF;
}

function setViewport(value, persist = true) {
    const v = VIEWPORTS[value] ? value : '1366x900';
    viewportLabel.textContent = VIEWPORTS[v];
    document.querySelectorAll('.viewport-option').forEach((opt) => {
        opt.classList.toggle('active', opt.dataset.viewport === v);
    });
    if (persist && window.api?.setConfig) window.api.setConfig({ viewport: v });
}

function updateLinkCount() {
    const n = urlItems.length;
    linkCount.textContent = `${n} link${n === 1 ? '' : 's'}`;
}

function setToolbarCaptureMode(on) {
    discardAllBtn.hidden = on;
    linkCount.hidden = on;
    captureProgress.hidden = !on;
    if (!on) {
        captureProgressFill.style.width = '0%';
        captureProgressLabel.textContent = '';
    }
}

function showInputView() {
    urlItems = [];
    urlInputWrap.hidden = false;
    urlCardsWrap.hidden = true;
    urlAreaToolbar.hidden = true;
    urlWell.value = '';
    urlWell.disabled = false;
    updateCaptureState();
}

function showCardView() {
    urlInputWrap.hidden = true;
    urlCardsWrap.hidden = false;
    urlAreaToolbar.hidden = false;
    setToolbarCaptureMode(false);
    updateLinkCount();
    renderCards();
    updateCaptureState();
}

function commitUrls(urls) {
    urlItems = urls.map((url) => ({ id: uid(), url }));
    showCardView();
}

function renderCards() {
    urlCards.innerHTML = urlItems.map((item) => `
        <div class="url-card" data-id="${item.id}">
            <div class="url-card-progress"></div>
            <div class="url-card-content">
                <span class="url-card-text" title="${item.url.replace(/"/g, '&quot;')}">${shortUrl(item.url)}</span>
                <button type="button" class="url-card-discard" data-id="${item.id}" aria-label="Discard URL" ${running ? 'disabled' : ''}>×</button>
            </div>
        </div>
    `).join('');
}

function discardUrl(id) {
    const card = urlCards.querySelector(`.url-card[data-id="${id}"]`);
    if (!card || card.classList.contains('removing')) return;

    card.style.maxHeight = `${card.offsetHeight}px`;
    requestAnimationFrame(() => {
        card.classList.add('removing');
        card.style.maxHeight = '0';
    });

    setTimeout(() => {
        urlItems = urlItems.filter((item) => item.id !== id);
        card.remove();
        updateLinkCount();
        updateCaptureState();
        if (!urlItems.length) showInputView();
    }, 280);
}

function resetCardProgress() {
    urlCards.querySelectorAll('.url-card').forEach((card) => {
        card.className = 'url-card';
        card.querySelector('.url-card-progress').style.width = '0%';
    });
}

function setOverallProgress(current, total, phase) {
    const phaseW = phase === 'capturing' ? 0.85 : phase === 'loading' ? 0.4 : 0.2;
    captureProgressFill.style.width = `${((current - 1) + phaseW) / total * 100}%`;
    captureProgressLabel.textContent = `${current} / ${total}`;
}

function scrollToCard(idx) {
    const card = urlCards.querySelectorAll('.url-card')[idx];
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setCardProgress(url, phase, current, total) {
    const activeIdx = urlItems.findIndex((item) => item.url === url);
    if (activeIdx < 0) return;

    if (current && total) setOverallProgress(current, total, phase);
    scrollToCard(activeIdx);

    urlCards.querySelectorAll('.url-card').forEach((card, idx) => {
        const bar = card.querySelector('.url-card-progress');
        card.classList.remove('active', 'done', 'error');

        if (idx < activeIdx) {
            card.classList.add('done');
            bar.style.width = '100%';
        } else if (idx === activeIdx) {
            card.classList.add('active');
            bar.style.width = phase === 'capturing' ? '85%' : phase === 'loading' ? '40%' : '20%';
        } else {
            bar.style.width = '0%';
        }
    });
}

function markCardError(url) {
    const idx = urlItems.findIndex((item) => item.url === url);
    if (idx < 0) return;
    const card = urlCards.querySelectorAll('.url-card')[idx];
    if (!card) return;
    card.classList.remove('active');
    card.classList.add('error');
    card.querySelector('.url-card-progress').style.width = '100%';
}

function finishCardProgress(total) {
    if (total) {
        captureProgressFill.style.width = '100%';
        captureProgressLabel.textContent = `${total} / ${total}`;
    }
    urlCards.querySelectorAll('.url-card').forEach((card) => {
        if (!card.classList.contains('error')) {
            card.classList.remove('active');
            card.classList.add('done');
            card.querySelector('.url-card-progress').style.width = '100%';
        }
    });
}

function processInput() {
    const { urls } = parseInput(urlWell.value);
    if (urls.length) commitUrls(urls);
}

function scheduleProcessInput() {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(processInput, 400);
}

function updateCaptureState() {
    actionBtn.disabled = running ? cancelling : (!configReady || !urlItems.length || (!saveImages && !saveHtml));
}

function truncatePath(p) {
    if (!p || p.length <= 48) return p || '';
    return '…' + p.slice(-45);
}

function setFolderDisplay() {
    const label = truncatePath(outputDir) || 'Downloads';
    folderPath.textContent = isDefaultFolder ? `${label} (default)` : label;
    folderPicker.title = outputDir ? `${outputDir}\nClick to change folder` : 'Click to choose folder';
}

async function loadConfig() {
    try {
        if (window.api?.getConfig) {
            const config = await window.api.getConfig();
            outputDir = config.outputDir || '';
            isDefaultFolder = config.isDefaultFolder ?? true;
            setViewport(config.viewport || '1366x900', false);
        }
    } catch (_) {
        outputDir = '';
        isDefaultFolder = true;
    } finally {
        configReady = true;
        setFolderDisplay();
        updateCaptureState();
    }
}

function setFolderPickerEnabled(on) {
    folderPicker.classList.toggle('is-disabled', !on);
    folderPicker.tabIndex = on ? 0 : -1;
}

function setRunning(on) {
    running = on;
    cancelling = false;
    urlWell.disabled = on;
    setFolderPickerEnabled(!on);
    imagesBtn.disabled = on;
    htmlBtn.disabled = on;
    viewportBtn.disabled = on;
    discardAllBtn.disabled = on;
    setToolbarCaptureMode(on);
    actionBtn.textContent = on ? 'Cancel' : 'Capture';
    actionBtn.classList.toggle('cancel', on);
    if (!on) renderCards();
    updateCaptureState();
}

function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 2000);
}

async function startCapture() {
    resetCardProgress();
    setRunning(true);

    const urls = urlItems.map((item) => item.url);
    const total = urls.length;
    captureProgressFill.style.width = '0%';
    captureProgressLabel.textContent = `0 / ${total}`;

    const unsub = window.api.onProgress((e) => {
        if (e.type === 'progress') setCardProgress(e.url, e.phase, e.current, e.total);
        else if (e.type === 'log' && e.message.startsWith('Failed') && e.message.includes(':')) {
            const failedUrl = urls.find((u) => e.message.includes(new URL(u).hostname.replace(/^www\./, '')));
            if (failedUrl) markCardError(failedUrl);
        }
    });

    try {
        await window.api.startCapture({ urls, saveImages, saveHtml });
        finishCardProgress(total);
    } finally {
        unsub();
        setRunning(false);
        updateCaptureState();
    }
}

function closeViewportMenu() {
    viewportMenu.hidden = true;
    viewportBtn.setAttribute('aria-expanded', 'false');
}

function toggleViewportMenu() {
    const open = viewportMenu.hidden;
    viewportMenu.hidden = !open;
    viewportBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

urlWell.addEventListener('paste', () => {
    requestAnimationFrame(() => requestAnimationFrame(processInput));
});
urlWell.addEventListener('input', scheduleProcessInput);
urlWell.addEventListener('blur', processInput);

urlCards.addEventListener('click', (e) => {
    const btn = e.target.closest('.url-card-discard');
    if (btn && !running) discardUrl(btn.dataset.id);
});

discardAllBtn.addEventListener('click', () => {
    if (!running) showInputView();
});

async function openFolderPicker() {
    if (running || folderPicker.classList.contains('is-disabled')) return;
    if (!window.api?.selectFolder) {
        showToast('Could not open folder picker');
        return;
    }
    try {
        const folder = await window.api.selectFolder();
        if (folder) {
            outputDir = folder;
            isDefaultFolder = false;
            setFolderDisplay();
            updateCaptureState();
        }
    } catch (_) {
        showToast('Could not open folder picker');
    }
}

folderPicker.addEventListener('click', openFolderPicker);
folderPicker.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFolderPicker();
    }
});

imagesBtn.addEventListener('click', () => {
    saveImages = !saveImages;
    syncFormatBtn(imagesBtn, saveImages);
    updateCaptureState();
});

htmlBtn.addEventListener('click', () => {
    saveHtml = !saveHtml;
    syncFormatBtn(htmlBtn, saveHtml);
    updateCaptureState();
});

viewportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleViewportMenu();
});

viewportMenu.addEventListener('click', (e) => {
    const opt = e.target.closest('.viewport-option');
    if (!opt) return;
    setViewport(opt.dataset.viewport);
    closeViewportMenu();
});

document.addEventListener('click', (e) => {
    if (!viewportWrap.contains(e.target)) closeViewportMenu();
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

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!viewportMenu.hidden) { closeViewportMenu(); return; }
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

syncFormatBtn(imagesBtn, saveImages);
syncFormatBtn(htmlBtn, saveHtml);
setViewport('1366x900', false);
loadConfig();
