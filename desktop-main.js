const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 1024,
        minHeight: 640,
        frame: false, // frameless window for that premium borderless cyberpunk HUD look!
        transparent: false,
        backgroundColor: '#020202', // deep pitch-black backplane
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'desktop-preload.js')
        }
    });

    // Load the live environment or fallback to production
    const startUrl = process.env.DESKTOP_URL || 'https://fatale-app.pages.dev';
    mainWindow.loadURL(startUrl);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for custom borderless window control buttons!
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow?.close());
