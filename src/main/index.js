const { app, BrowserWindow, ipcMain, screen, nativeTheme } = require('electron');
const path = require('node:path');
const MantisDatabase = require('../database/db');
const AiManager = require('../services/ai/aiManager');
const DesktopAutomation = require('./automation');
const ReminderEngine = require('./reminders');
const ProactiveEngine = require('./proactive');
const YouTubeLearningService = require('../services/learning/youtubeService');
const { createTray } = require('./tray');
const { registerShortcuts, unregisterShortcuts } = require('./shortcut');
const NeuralVoiceService = require('../services/voice/neuralVoice');
const AgoraVoiceAgentService = require('../services/voice/agoraVoiceAgent');
const AutonomousLoop = require('./autonomousLoop');

// Suppress internal Chromium network upload stream warnings
app.commandLine.appendSwitch('log-level', '3');
app.commandLine.appendSwitch('disable-logging');

app.setName('Crista');
try {
  const userDataPath = path.join(app.getPath('appData'), 'CristaCompanion');
  app.setPath('userData', userDataPath);
} catch (e) {
  // ignore
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let currentMode = 'expanded'; // Default to expanded card so user sees it immediately
let db = null;
let aiManager = null;
let automation = null;
let reminderEngine = null;
let proactiveEngine = null;
let learningService = null;
let neuralVoice = null;
let agoraVoice = null;
let autonomousLoop = null;
let ambientScreenTimer = null;

// Dimensions for window states
const ORB_WIDTH = 160;
const ORB_HEIGHT = 160;
const CARD_WIDTH = 440;

function createWindow() {
  nativeTheme.themeSource = 'dark';

  // Initialize DB & services
  db = new MantisDatabase();
  aiManager = new AiManager(db);
  automation = new DesktopAutomation(db);
  learningService = new YouTubeLearningService(db, aiManager);
  neuralVoice = new NeuralVoiceService();
  agoraVoice = new AgoraVoiceAgentService(db);

  const profile = db.getProfile();

  // Screen metrics for default placement (right dock)
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const cardHeight = Math.min(900, screenHeight - 40);

  const defaultX = Math.max(20, screenWidth - CARD_WIDTH - 20);
  const defaultY = 20;

  console.log(`[CRISTA MAIN] Creating window at ${defaultX}, ${defaultY} (${CARD_WIDTH}x${cardHeight}) on display (${screenWidth}x${screenHeight})`);

  mainWindow = new BrowserWindow({
    width: CARD_WIDTH,
    height: cardHeight,
    x: defaultX,
    y: defaultY,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: true,
    icon: path.join(__dirname, '../renderer/assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    console.log('[CRISTA MAIN] ready-to-show event fired!');
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  });

  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[CRISTA MAIN] did-finish-load fired!');
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[CRISTA MAIN] Page failed to load:', code, desc);
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--smoke-test')) {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('[SmokeTest] Renderer loaded successfully!');
      setTimeout(() => {
        console.log('[SmokeTest] Exiting cleanly with code 0.');
        app.isQuitting = true;
        app.quit();
      }, 1500);
    });
  }

  // Start background engines
  reminderEngine = new ReminderEngine(db, (reminder) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('reminder:due', reminder);
      // Ensure window is visible when critical reminder strikes
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
    }
  });
  reminderEngine.start();

  proactiveEngine = new ProactiveEngine(db, (suggestion) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('proactive:suggestion', suggestion);
    }
  });
  proactiveEngine.start();

  autonomousLoop = new AutonomousLoop(db, aiManager.evolution, aiManager);
  autonomousLoop.start();

  // Create Tray
  createTray(mainWindow, proactiveEngine, {
    setMode: (mode) => setWindowMode(mode)
  });

  // Global shortcut
  registerShortcuts(mainWindow);

  // Window close behavior (hide to tray instead of full exit unless quitting)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Second instance handler (focus and reveal existing window)
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      setWindowMode('expanded');
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });
}

function setWindowMode(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (currentMode === mode) return;

  const [currentX, currentY] = mainWindow.getPosition();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const cardHeight = Math.min(900, screenHeight - 40);

  if (mode === 'expanded') {
    currentMode = 'expanded';
    let newX = currentX - (CARD_WIDTH - ORB_WIDTH);
    let newY = currentY - (cardHeight - ORB_HEIGHT);

    if (newX < 10) newX = 10;
    if (newY < 10) newY = 10;
    if (newX + CARD_WIDTH > screenWidth) newX = screenWidth - CARD_WIDTH - 10;
    if (newY + cardHeight > screenHeight) newY = screenHeight - cardHeight - 10;

    mainWindow.setBounds({
      x: Math.round(newX),
      y: Math.round(newY),
      width: CARD_WIDTH,
      height: cardHeight
    });
  } else {
    currentMode = 'orb';
    let newX = currentX + (CARD_WIDTH - ORB_WIDTH);
    let newY = currentY + (cardHeight - ORB_HEIGHT);

    if (newX + ORB_WIDTH > screenWidth) newX = screenWidth - ORB_WIDTH - 20;
    if (newY + ORB_HEIGHT > screenHeight) newY = screenHeight - ORB_HEIGHT - 20;

    mainWindow.setBounds({
      x: Math.round(newX),
      y: Math.round(newY),
      width: ORB_WIDTH,
      height: ORB_HEIGHT
    });
  }

  mainWindow.webContents.send('window:modeChanged', currentMode);
}

// Setup IPC handlers
function setupIpc() {
  // Mode & Window Controls
  ipcMain.handle('window:setMode', (_e, mode) => {
    setWindowMode(mode);
    return currentMode;
  });

  ipcMain.handle('window:moveBy', (_e, dx, dy) => {
    if (!mainWindow) return;
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(Math.round(x + dx), Math.round(y + dy));
    return true;
  });

  let smoothMoveTimer = null;
  ipcMain.handle('window:smoothMoveTo', (_e, targetX, targetY, durationMs = 1200) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    if (smoothMoveTimer) clearInterval(smoothMoveTimer);

    const [startX, startY] = mainWindow.getPosition();
    const startTime = Date.now();
    const frameRate = 16;

    smoothMoveTimer = setInterval(() => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        clearInterval(smoothMoveTimer);
        smoothMoveTimer = null;
        return;
      }
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Smooth easeInOutCubic
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentX = Math.round(startX + (targetX - startX) * ease);
      const currentY = Math.round(startY + (targetY - startY) * ease);
      mainWindow.setPosition(currentX, currentY);

      if (progress >= 1) {
        clearInterval(smoothMoveTimer);
        smoothMoveTimer = null;
      }
    }, frameRate);

    return true;
  });

  ipcMain.handle('window:getScreenBounds', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    return primaryDisplay.workArea;
  });

  ipcMain.handle('window:getPosition', () => {
    return mainWindow ? mainWindow.getPosition() : [0, 0];
  });

  ipcMain.handle('window:setAlwaysOnTop', (_e, enabled) => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(!!enabled);
      db.updateProfile({ always_on_top: enabled ? 1 : 0 });
    }
    return !!enabled;
  });

  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:hide', () => {
    if (mainWindow) mainWindow.hide();
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.hide();
  });

  ipcMain.handle('app:quit', () => {
    app.isQuitting = true;
    app.quit();
  });

  ipcMain.handle('window:setIgnoreMouseEvents', (event, ignore) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(!!ignore, { forward: true });
    }
    return true;
  });

  // Settings & Startup
  ipcMain.handle('settings:setStartup', (_e, enabled) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: !!enabled,
        path: process.execPath
      });
      db.updateProfile({ launch_on_startup: enabled ? 1 : 0 });
      return { success: true, enabled: !!enabled };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Profile
  ipcMain.handle('profile:get', () => db.getProfile());
  ipcMain.handle('profile:update', (_e, fields) => db.updateProfile(fields));

  let latestScreenFrame = null;
  async function captureActiveScreen() {
    try {
      const { desktopCapturer } = require('electron');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 }
      });
      if (sources && sources.length > 0) {
        latestScreenFrame = sources[0].thumbnail.toJPEG(75).toString('base64');
        return latestScreenFrame;
      }
    } catch (err) {
      console.warn('[ScreenCapture] Error capturing screen:', err.message);
    }
    return latestScreenFrame;
  }

  // Continuous Ambient Screen Perception: Watch screen silently in the background
  ambientScreenTimer = setInterval(() => {
    captureActiveScreen().catch(() => {});
  }, 10 * 1000);

  // Initial capture on start
  setTimeout(() => {
    captureActiveScreen().catch(() => {});
  }, 2000);

  // Chat & AI (Supports Text, Audio, Silent Screen Vision & Active Typing)
  ipcMain.handle('chat:send', async (_e, text, history, audioBase64, imageBase64) => {
    let frameToUse = imageBase64 || latestScreenFrame;
    const cleanText = text || '';

    // If user explicitly asks about screen, capture freshest high-priority frame
    const isScreenQuery = /(screen|appearing|looking at|on my screen|see this|watch|chatgpt|window|desktop|what is on|explain this)/i.test(cleanText);
    if (isScreenQuery) {
      frameToUse = await captureActiveScreen();
    }

    // Auto-type what user says if requested: "type what I'm saying: ..." or "type ..."
    const typeMatch = cleanText.match(/type\s+(?:what\s+i(?:'m|\s+am)?\s+saying[:\s]*|this[:\s]*|into\s+(?:chatgpt|app)[:\s]*)(.+)/i);
    if (typeMatch && automation) {
      const textToType = typeMatch[1].trim();
      setTimeout(async () => {
        try {
          await automation.typeIntoActiveWindow(textToType, true);
        } catch (e) {}
      }, 300);
    }

    db.addChatMessage('user', text || (frameToUse ? '👁️ [Screen Analysis]' : '🎤 [Voice Query]'));
    const result = await aiManager.process(text, history || [], audioBase64, frameToUse);
    db.addChatMessage('assistant', result.reply, result.provider);

    // Direct main-process tool execution
    if (result && result.toolExecution) {
      const { tool, parameters } = result.toolExecution;
      if (tool === 'launch_app' && parameters?.app && automation) {
        try {
          await automation.launchApp(parameters.app, true);
        } catch (e) {
          console.warn('[Main] Direct launchApp error:', e.message);
        }
      } else if (tool === 'open_url' && parameters?.url && automation) {
        try {
          await automation.openUrl(parameters.url, parameters?.browser);
        } catch (e) {}
      } else if (tool === 'open_folder' && parameters?.path && automation) {
        try {
          await automation.openFolder(parameters.path);
        } catch (e) {}
      }
    }

    return result;
  });
  ipcMain.handle('chat:getHistory', () => db.getChatHistory());
  ipcMain.handle('chat:clearHistory', () => db.clearChatHistory());

  // Screen Vision Capture (On-demand freshest frame)
  ipcMain.handle('screen:capture', async () => {
    return await captureActiveScreen();
  });

  // Neural Voice (High-Definition 96kbps Human Voice)
  ipcMain.handle('voice:speakNeural', async (_e, text, lang, customVoice) => {
    if (!neuralVoice) return null;
    return await neuralVoice.generateSpeechBase64(text, lang, customVoice);
  });

  // Agora Conversational Voice Engine (Real-Time Bidirectional Full-Duplex Call)
  ipcMain.handle('agora:startCall', async () => {
    if (!agoraVoice) return { error: 'Agora voice service not initialized' };
    try {
      return await agoraVoice.startVoiceCall();
    } catch (err) {
      console.error('[AgoraIPC] Start call error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('agora:stopCall', async () => {
    if (!agoraVoice) return { success: true };
    try {
      return await agoraVoice.stopVoiceCall();
    } catch (err) {
      console.warn('[AgoraIPC] Stop call warning:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Tasks
  ipcMain.handle('tasks:get', (_e, filter) => db.getTasks(filter));
  ipcMain.handle('tasks:create', (_e, title, options) => db.createTask(title, options));
  ipcMain.handle('tasks:toggle', (_e, id) => db.toggleTask(id));
  ipcMain.handle('tasks:delete', (_e, id) => db.deleteTask(id));

  // Reminders
  ipcMain.handle('reminders:get', () => db.getReminders());
  ipcMain.handle('reminders:create', (_e, title, dueTime, recurring) => db.createReminder(title, dueTime, recurring));
  ipcMain.handle('reminders:complete', (_e, id) => db.completeReminder(id));
  ipcMain.handle('reminders:snooze', (_e, id, minutes) => db.snoozeReminder(id, minutes));

  // Memory
  ipcMain.handle('memory:get', (_e, category) => db.getMemoryNotes(category));
  ipcMain.handle('memory:create', (_e, category, title, content, pinned) => db.createMemoryNote(category, title, content, pinned));
  ipcMain.handle('memory:delete', (_e, id) => db.deleteMemoryNote(id));

  // Learning
  ipcMain.handle('learning:getLessons', () => db.getLessons());
  ipcMain.handle('learning:getLesson', (_e, id) => db.getLesson(id));
  ipcMain.handle('learning:generateLesson', (_e, data) => learningService.generateLesson(data));
  ipcMain.handle('learning:deleteLesson', (_e, id) => db.deleteLesson(id));
  ipcMain.handle('learning:convertAssignment', (_e, title, text) => learningService.convertAssignmentToTask(title, text));

  // Desktop Automation & Typing
  ipcMain.handle('automation:launchApp', (_e, appKey, userConfirmed) => automation.launchApp(appKey, userConfirmed));
  ipcMain.handle('automation:executeShell', (_e, command) => automation.executeShell(command));
  ipcMain.handle('automation:openUrl', (_e, url, browser) => automation.openUrl(url, browser));
  ipcMain.handle('automation:openFolder', (_e, folderPath) => automation.openFolder(folderPath));
  ipcMain.handle('automation:typeText', (_e, text, pressEnter) => automation.typeIntoActiveWindow(text, pressEnter));
  ipcMain.handle('automation:pressKey', (_e, key) => automation.pressKey(key));
  ipcMain.handle('automation:researchWeb', (_e, query) => automation.researchWeb(query));
  ipcMain.handle('automation:getAllowedApps', () => automation.getAllowedApps());
  ipcMain.handle('automation:getActionHistory', () => db.getActionHistory());

  // Self-Evolution & System Control
  ipcMain.handle('evolution:getHistory', () => db.getEvolutionHistory());
  ipcMain.handle('evolution:relaunch', () => {
    app.relaunch();
    app.exit(0);
  });

  // Proactive & Focus
  ipcMain.handle('proactive:setPaused', (_e, paused) => {
    if (proactiveEngine) proactiveEngine.setPaused(paused);
    return true;
  });
  ipcMain.handle('proactive:setFocusMode', (_e, enabled) => {
    if (proactiveEngine) proactiveEngine.setFocusMode(enabled);
    return true;
  });
}

// App lifecycle
app.whenReady().then(() => {
  setupIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  unregisterShortcuts();
  if (ambientScreenTimer) clearInterval(ambientScreenTimer);
  if (autonomousLoop) autonomousLoop.stop();
  if (reminderEngine) reminderEngine.stop();
  if (proactiveEngine) proactiveEngine.stop();
  if (db) db.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray unless explicit quit
    if (app.isQuitting) {
      app.quit();
    }
  }
});
