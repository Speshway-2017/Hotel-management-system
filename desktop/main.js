const { app, BrowserWindow, ipcMain, Notification, shell, nativeImage, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { createReceptionMenu } = require('./menu');

// Configure Windows App User Model ID for notifications & taskbar
if (process.platform === 'win32') {
  app.setAppUserModelId('com.hourstay.hms.receptionist');
}

// Ensure single instance lock for the desktop app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let isAppClosing = false;

const FRONTEND_DEV_URL = process.env.ELECTRON_START_URL || 'http://localhost:5173';
const RECEPTION_DEFAULT_PATH = '/reception';

/**
 * Checks if the local frontend Vite dev server is running and ready.
 */
function checkServerReady(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = http.get(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 80,
          path: '/',
          timeout: 2000
        },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Splash / Connecting HTML displayed while waiting for the Vite dev server
 */
function getConnectingHtml(targetUrl) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Connecting to HourStay HMS</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body {
          background: linear-gradient(135deg, #090d16 0%, #111827 100%);
          color: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
          user-select: none;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          backdrop-filter: blur(12px);
          max-width: 480px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 24px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        h1 {
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #ffffff;
        }
        p {
          font-size: 14px;
          color: #9ca3af;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .badge {
          display: inline-block;
          font-size: 12px;
          background: rgba(56, 189, 248, 0.12);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.3);
          padding: 4px 12px;
          border-radius: 9999px;
          font-mono: true;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h1>HourStay Receptionist Desk</h1>
        <p>Connecting to hotel workspace server...</p>
        <div class="badge">${targetUrl}</div>
      </div>
    </body>
    </html>
  `;
}

let activeDialogWin = null;

/**
 * Displays the custom Hour Stay close confirmation modal dialog
 */
function showCustomCloseConfirmation(parentWin) {
  return new Promise((resolve) => {
    if (activeDialogWin && !activeDialogWin.isDestroyed()) {
      activeDialogWin.focus();
      return;
    }

    activeDialogWin = new BrowserWindow({
      width: 440,
      height: 350,
      parent: parentWin && !parentWin.isDestroyed() ? parentWin : null,
      modal: true,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      center: true,
      show: false,
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'dialog-preload.js')
      }
    });

    activeDialogWin.loadFile(path.join(__dirname, 'close-dialog.html'));

    activeDialogWin.once('ready-to-show', () => {
      if (activeDialogWin && !activeDialogWin.isDestroyed()) {
        activeDialogWin.show();
      }
    });

    let resolved = false;
    const cleanup = (shouldClose) => {
      if (resolved) return;
      resolved = true;
      ipcMain.removeListener('close-dialog:action', handleAction);
      if (activeDialogWin && !activeDialogWin.isDestroyed()) {
        activeDialogWin.destroy();
      }
      activeDialogWin = null;
      resolve(shouldClose);
    };

    const handleAction = (_event, action) => {
      cleanup(action === 'close');
    };

    ipcMain.on('close-dialog:action', handleAction);

    activeDialogWin.on('closed', () => {
      cleanup(false);
    });
  });
}

/**
 * Creates and initializes the primary Receptionist desktop window
 */
function createMainWindow() {
  const iconPath = path.join(__dirname, 'icon.ico');
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'HourStay HMS - Receptionist Desk',
    icon: appIcon.isEmpty() ? iconPath : appIcon,
    backgroundColor: '#090d16',
    show: false, // reveal gracefully on ready-to-show
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: true
    }
  });

  if (process.platform === 'win32' && !appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon);
  }

  // Attach Receptionist desktop menu bar
  createReceptionMenu(mainWindow, FRONTEND_DEV_URL);

  // Intercept external links to open safely in OS default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes('localhost:') && !url.includes('127.0.0.1')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  // Load dev server with retry/wait logic
  loadFrontendApp(mainWindow, FRONTEND_DEV_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Intercept window close to show custom Hour Stay confirmation dialog
  mainWindow.on('close', async (event) => {
    if (isAppClosing) {
      return;
    }

    event.preventDefault();

    try {
      const shouldClose = await showCustomCloseConfirmation(mainWindow);
      if (shouldClose) {
        isAppClosing = true;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.close();
        }
      }
    } catch (err) {
      isAppClosing = true;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Polls until the dev server is active, then navigates to the receptionist workspace.
 */
async function loadFrontendApp(win, baseUrl) {
  const isReady = await checkServerReady(baseUrl);

  if (isReady) {
    win.loadURL(`${baseUrl}${RECEPTION_DEFAULT_PATH}`).catch(() => {
      win.loadURL(baseUrl);
    });
  } else {
    // Show connecting screen and poll
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getConnectingHtml(baseUrl))}`);

    const retryInterval = setInterval(async () => {
      if (!win || win.isDestroyed()) {
        clearInterval(retryInterval);
        return;
      }

      const ready = await checkServerReady(baseUrl);
      if (ready) {
        clearInterval(retryInterval);
        win.loadURL(`${baseUrl}${RECEPTION_DEFAULT_PATH}`).catch(() => {
          win.loadURL(baseUrl);
        });
      }
    }, 1500);
  }
}

// Focus existing window if secondary instance attempts to launch
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// App Lifecycle
app.whenReady().then(() => {
  // Setup IPC Handlers
  ipcMain.handle('app:print', async (_event, options = {}) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    return new Promise((resolve) => {
      mainWindow.webContents.print(
        {
          silent: options.silent || false,
          printBackground: options.printBackground !== false,
          deviceName: options.deviceName || ''
        },
        (success, failureReason) => {
          resolve({ success, failureReason });
        }
      );
    });
  });

  ipcMain.handle('app:notify', (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({
        title: title || 'HourStay HMS',
        body: body || '',
        icon: path.join(__dirname, 'icon.ico')
      }).show();
      return true;
    }
    return false;
  });

  ipcMain.on('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
