const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('node:path');

let tray = null;

function createTray(mainWindow, proactiveEngine, options = {}) {
  const iconPath = path.join(__dirname, '../renderer/assets/icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);

  tray = new Tray(trayIcon);
  tray.setToolTip('CRISTA — AI Desktop Companion');

  const updateContextMenu = () => {
    const isVisible = mainWindow && mainWindow.isVisible();
    const contextMenu = Menu.buildFromTemplate([
      {
        label: isVisible ? 'Hide Companion' : 'Show Companion',
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
          updateContextMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Compact Widget Mode',
        click: () => {
          if (options.setMode) options.setMode('compact');
        }
      },
      {
        label: 'Expanded Assistant Panel',
        click: () => {
          if (options.setMode) options.setMode('expanded');
        }
      },
      { type: 'separator' },
      {
        label: 'Pause Suggestions',
        type: 'checkbox',
        checked: proactiveEngine ? proactiveEngine.isPaused : false,
        click: (item) => {
          if (proactiveEngine) proactiveEngine.setPaused(item.checked);
        }
      },
      {
        label: 'Focus Mode (25m)',
        type: 'checkbox',
        checked: proactiveEngine ? proactiveEngine.isFocusMode : false,
        click: (item) => {
          if (proactiveEngine) proactiveEngine.setFocusMode(item.checked);
        }
      },
      { type: 'separator' },
      {
        label: 'Quit CRISTA',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
  };

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    updateContextMenu();
  });

  updateContextMenu();
  return tray;
}

module.exports = { createTray };
