const { globalShortcut } = require('electron');

function registerShortcuts(mainWindow) {
  try {
    globalShortcut.unregisterAll();
    const toggleWindow = () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    };

    globalShortcut.register('CommandOrControl+Shift+C', toggleWindow);
    globalShortcut.register('CommandOrControl+Shift+M', toggleWindow);
    console.log('[Shortcuts] Registered global hotkeys: Ctrl+Shift+C and Ctrl+Shift+M');
  } catch (err) {
    console.error('[Shortcuts] Error registering shortcut:', err);
  }
}

function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}

module.exports = { registerShortcuts, unregisterShortcuts };
