const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
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

function createWindow() {
    const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
    mainWindow = new BrowserWindow({
        width: 720,
        height: 640,
        minWidth: 640,
        minHeight: 560,
        title: 'LinkSnap',
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
}

function sendProgress(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('capture-progress', payload);
    }
}

ipcMain.handle('select-folder', async () => {
    const config = readConfig();
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        defaultPath: resolveOutputDir(config),
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

ipcMain.handle('start-capture', async (_, { urls, saveHtml }) => {
    cancelRequested = false;
    const config = readConfig();
    const outputDir = resolveOutputDir(config);

    const result = await capture({
        urls,
        outputDir,
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
