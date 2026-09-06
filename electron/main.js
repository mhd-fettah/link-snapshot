const { app, BrowserWindow, dialog, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { capture } = require('../src/capture');

const CONFIG_FILE = () => path.join(app.getPath('userData'), 'config.json');
const DEFAULT_CONFIG = { outputDir: null, theme: 'light', viewport: '1366x900' };

let mainWindow = null;
let cancelRequested = false;

function readConfig() {
    try {
        const data = JSON.parse(fs.readFileSync(CONFIG_FILE(), 'utf8'));
        return { ...DEFAULT_CONFIG, ...data };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

function writeConfig(partial) {
    const config = { ...readConfig(), ...partial };
    fs.mkdirSync(path.dirname(CONFIG_FILE()), { recursive: true });
    fs.writeFileSync(CONFIG_FILE(), JSON.stringify(config, null, 2));
    return config;
}

function resolveOutputDir(config) {
    return config.outputDir || app.getPath('downloads');
}

function defaultLinksFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `links-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.txt`;
}

function createWindow() {
    const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
    mainWindow = new BrowserWindow({
        width: 504,
        height: 420,
        minWidth: 504,
        maxWidth: 504,
        minHeight: 420,
        maxHeight: 420,
        resizable: false,
        title: 'LinkSnap',
        icon: iconPath,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    Menu.setApplicationMenu(null);
    mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
}

function sendProgress(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('capture-progress', payload);
    }
}

ipcMain.handle('save-links', async (event, { urls }) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (!win || win.isDestroyed() || !urls?.length) return { ok: false };
    win.focus();
    const config = readConfig();
    const result = await dialog.showSaveDialog(win, {
        defaultPath: path.join(resolveOutputDir(config), defaultLinksFilename()),
        filters: [{ name: 'Text Files', extensions: ['txt'] }, { name: 'All Files', extensions: ['*'] }],
        title: 'Save Links',
    });
    if (result.canceled || !result.filePath) return { ok: false };
    fs.writeFileSync(result.filePath, urls.join('\n') + '\n', 'utf8');
    return { ok: true, filePath: result.filePath };
});

ipcMain.handle('load-links', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (!win || win.isDestroyed()) return { ok: false };
    win.focus();
    const config = readConfig();
    const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        defaultPath: resolveOutputDir(config),
        filters: [{ name: 'Text Files', extensions: ['txt'] }, { name: 'All Files', extensions: ['*'] }],
        title: 'Load Links',
    });
    if (result.canceled || !result.filePaths.length) return { ok: false };
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    return { ok: true, content };
});

ipcMain.handle('select-folder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (!win || win.isDestroyed()) return null;
    win.focus();
    const config = readConfig();
    const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory'],
        defaultPath: resolveOutputDir(config),
        title: 'Choose save folder',
    });
    if (result.canceled || !result.filePaths.length) return null;
    const folder = result.filePaths[0];
    writeConfig({ outputDir: folder });
    return folder;
});

ipcMain.handle('get-config', () => {
    const config = readConfig();
    return {
        ...config,
        outputDir: resolveOutputDir(config),
        isDefaultFolder: config.outputDir === null,
    };
});

ipcMain.handle('set-config', (_, partial) => {
    const config = writeConfig(partial);
    return { ...config, outputDir: resolveOutputDir(config) };
});

ipcMain.handle('start-capture', async (_, { urls, saveImages, saveHtml }) => {
    cancelRequested = false;
    const config = readConfig();
    const outputDir = resolveOutputDir(config);

    const result = await capture({
        urls,
        outputDir,
        saveImages,
        saveHtml,
        viewport: config.viewport,
        onProgress: (e) => sendProgress(e),
        shouldCancel: () => cancelRequested,
    });

    if (result.saved > 0) shell.openPath(outputDir);
    return { ...result, outputDir };
});

ipcMain.handle('cancel-capture', () => {
    cancelRequested = true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
