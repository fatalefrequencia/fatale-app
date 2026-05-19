const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');

// Prevent Chromium from background-throttling timers and audio streams when hidden/minimized
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

let mainWindow;
let tray = null;
let isQuitting = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 1024,
        minHeight: 640,
        frame: false, // frameless window for that premium borderless cyberpunk HUD look!
        transparent: false,
        backgroundColor: '#020202', // deep pitch-black backplane
        icon: path.join(__dirname, 'dist', 'app-icon.png'), // Premium custom app taskbar & window icon!
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'desktop-preload.js')
        }
    });

    // Load the live environment or fallback to production
    const startUrl = process.env.DESKTOP_URL || 'https://fatale-app.pages.dev';
    mainWindow.loadURL(startUrl);

    // Prevent destruction on close, hide to tray instead
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // Create System Tray Icon
    try {
        const trayIconPath = path.join(__dirname, 'public', 'app-icon.png'); // fallback to public if dist isn't built
        tray = new Tray(trayIconPath);
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Show Fatale', click: () => mainWindow?.show() },
            { type: 'separator' },
            { label: 'Quit', click: () => {
                isQuitting = true;
                app.quit();
            }}
        ]);
        tray.setToolTip('Fatale Frequencia');
        tray.setContextMenu(contextMenu);
        tray.on('click', () => {
            mainWindow?.show();
        });
    } catch (e) {
        console.warn('Failed to create tray icon (safe to ignore if running headless):', e.message);
    }

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
ipcMain.on('window-close', () => {
    if (mainWindow) {
        mainWindow.hide();
    }
});
