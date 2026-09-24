const { Menu, app, dialog } = require('electron');

/**
 * Builds the native Windows application menu for the Receptionist desktop app.
 * @param {Electron.BrowserWindow} mainWindow
 * @param {string} frontendBaseUrl
 */
function createReceptionMenu(mainWindow, frontendBaseUrl = 'http://localhost:5173') {
  const navigateTo = (route) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    // Attempt React Router client-side navigation via IPC first
    mainWindow.webContents.send('menu:navigate', route);

    // Renderer client-side dispatch without hard reload
    mainWindow.webContents.executeJavaScript(`
      if (typeof window.__appNavigate === 'function') {
        window.__appNavigate('${route}');
      } else if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: '${route}' }));
      }
    `).catch(() => {});
  };

  const template = [
    {
      label: '&File',
      submenu: [
        {
          label: 'Print Folio / Receipt',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.print({ silent: false, printBackground: true });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reload Reception Desk',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.reload();
            }
          }
        },
        {
          label: 'Hard Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit Desk',
          accelerator: 'Alt+F4',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.close();
            } else {
              app.quit();
            }
          }
        }
      ]
    },
    {
      label: '&Reception Desk',
      submenu: [
        {
          label: 'Reception Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => navigateTo('/reception')
        },
        {
          label: 'Check-In Desk',
          accelerator: 'CmdOrCtrl+2',
          click: () => navigateTo('/reception/check-in')
        },
        {
          label: 'Check-Out Desk',
          accelerator: 'CmdOrCtrl+3',
          click: () => navigateTo('/reception/check-out')
        },
        {
          label: 'Room Assignment & Grid',
          accelerator: 'CmdOrCtrl+4',
          click: () => navigateTo('/reception/room-assignment')
        },
        {
          label: 'New Walk-In / Direct Booking',
          accelerator: 'CmdOrCtrl+5',
          click: () => navigateTo('/reception/new-booking')
        },
        {
          label: 'Guest Folio & Invoices',
          accelerator: 'CmdOrCtrl+6',
          click: () => navigateTo('/reception/folio')
        },
        {
          label: 'Guest Directory & Search',
          accelerator: 'CmdOrCtrl+7',
          click: () => navigateTo('/reception/guest-search')
        },
        {
          label: 'Payments & Billing Log',
          accelerator: 'CmdOrCtrl+8',
          click: () => navigateTo('/reception/payments')
        },
        {
          label: 'Front Desk Notifications',
          accelerator: 'CmdOrCtrl+9',
          click: () => navigateTo('/reception/notifications')
        }
      ]
    },
    {
      label: '&View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'Reception Desk Shortcuts',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'HourStay Receptionist Shortcuts',
              message: 'HourStay Front Desk Shortcuts',
              detail: [
                'Ctrl+1: Dashboard',
                'Ctrl+2: Check-In Desk',
                'Ctrl+3: Check-Out Desk',
                'Ctrl+4: Room Assignment',
                'Ctrl+5: New Booking',
                'Ctrl+6: Folio & Invoices',
                'Ctrl+7: Guest Search',
                'Ctrl+8: Payments',
                'Ctrl+9: Notifications',
                'Ctrl+P: Print Folio / Receipt',
                'Ctrl+R: Refresh Desk',
                'F11: Toggle Fullscreen'
              ].join('\n')
            });
          }
        },
        {
          label: 'About HourStay Reception Desk',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About HourStay HMS',
              message: 'HourStay Hotel Management System',
              detail: 'Receptionist Windows Desktop Edition\nVersion 1.0.0\nSecure Native Desktop Runtime'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

module.exports = {
  createReceptionMenu
};
