const { contextBridge, ipcRenderer } = require('electron');

const apiBridge = {
  // --- Profile & Preferences ---
  getProfile: () => ipcRenderer.invoke('profile:get'),
  updateProfile: (fields) => ipcRenderer.invoke('profile:update', fields),
  setStartup: (enabled) => ipcRenderer.invoke('settings:setStartup', enabled),

  // --- Chat & AI ---
  sendMessage: (text, history, audioBase64, imageBase64) => ipcRenderer.invoke('chat:send', text, history, audioBase64, imageBase64),
  getChatHistory: () => ipcRenderer.invoke('chat:getHistory'),
  clearChatHistory: () => ipcRenderer.invoke('chat:clearHistory'),
  captureScreen: () => ipcRenderer.invoke('screen:capture'),
  speakNeural: (text, lang, customVoice) => ipcRenderer.invoke('voice:speakNeural', text, lang, customVoice),
  startLiveCall: () => ipcRenderer.invoke('agora:startCall'),
  stopLiveCall: () => ipcRenderer.invoke('agora:stopCall'),

  // --- Tasks & Priorities ---
  getTasks: (filter) => ipcRenderer.invoke('tasks:get', filter),
  createTask: (title, options) => ipcRenderer.invoke('tasks:create', title, options),
  toggleTask: (id) => ipcRenderer.invoke('tasks:toggle', id),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),

  // --- Reminders ---
  getReminders: () => ipcRenderer.invoke('reminders:get'),
  createReminder: (title, dueTime, recurring) => ipcRenderer.invoke('reminders:create', title, dueTime, recurring),
  completeReminder: (id) => ipcRenderer.invoke('reminders:complete', id),
  snoozeReminder: (id, minutes) => ipcRenderer.invoke('reminders:snooze', id, minutes),

  // --- Memory Notes ---
  getMemoryNotes: (category) => ipcRenderer.invoke('memory:get', category),
  createMemoryNote: (category, title, content, pinned) => ipcRenderer.invoke('memory:create', category, title, content, pinned),
  deleteMemoryNote: (id) => ipcRenderer.invoke('memory:delete', id),

  // --- Learning Hub & YouTube ---
  getLessons: () => ipcRenderer.invoke('learning:getLessons'),
  getLesson: (id) => ipcRenderer.invoke('learning:getLesson', id),
  generateLesson: (data) => ipcRenderer.invoke('learning:generateLesson', data),
  deleteLesson: (id) => ipcRenderer.invoke('learning:deleteLesson', id),
  convertAssignmentToTask: (title, text) => ipcRenderer.invoke('learning:convertAssignment', title, text),

  // --- Desktop Automation & Full System Access ---
  launchApp: (appKey, userConfirmed) => ipcRenderer.invoke('automation:launchApp', appKey, userConfirmed),
  executeShell: (command) => ipcRenderer.invoke('automation:executeShell', command),
  openUrl: (url, browser) => ipcRenderer.invoke('automation:openUrl', url, browser),
  openFolder: (folderPath) => ipcRenderer.invoke('automation:openFolder', folderPath),
  typeText: (text, pressEnter) => ipcRenderer.invoke('automation:typeText', text, pressEnter),
  pressKey: (key) => ipcRenderer.invoke('automation:pressKey', key),
  researchWeb: (query) => ipcRenderer.invoke('automation:researchWeb', query),
  getAllowedApps: () => ipcRenderer.invoke('automation:getAllowedApps'),
  getActionHistory: () => ipcRenderer.invoke('automation:getActionHistory'),

  // --- Window Controls & Modes ---
  setWindowMode: (mode) => ipcRenderer.invoke('window:setMode', mode), // 'orb' | 'expanded'
  moveWindowBy: (dx, dy) => ipcRenderer.invoke('window:moveBy', dx, dy),
  smoothMoveTo: (x, y, durationMs) => ipcRenderer.invoke('window:smoothMoveTo', x, y, durationMs),
  getScreenBounds: () => ipcRenderer.invoke('window:getScreenBounds'),
  getWindowPosition: () => ipcRenderer.invoke('window:getPosition'),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('window:setAlwaysOnTop', enabled),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  setIgnoreMouseEvents: (ignore) => ipcRenderer.invoke('window:setIgnoreMouseEvents', ignore),

  // --- Proactive & Focus ---
  setProactivePaused: (paused) => ipcRenderer.invoke('proactive:setPaused', paused),
  setFocusMode: (enabled) => ipcRenderer.invoke('proactive:setFocusMode', enabled),

  // --- Self-Evolution & System Shell ---
  getEvolutionHistory: () => ipcRenderer.invoke('evolution:getHistory'),
  relaunchApp: () => ipcRenderer.invoke('evolution:relaunch'),

  // --- Event Subscriptions ---
  onReminderDue: (callback) => {
    const handler = (_event, reminder) => callback(reminder);
    ipcRenderer.on('reminder:due', handler);
    return () => ipcRenderer.removeListener('reminder:due', handler);
  },
  onProactiveSuggestion: (callback) => {
    const handler = (_event, suggestion) => callback(suggestion);
    ipcRenderer.on('proactive:suggestion', handler);
    return () => ipcRenderer.removeListener('proactive:suggestion', handler);
  },
  onWindowModeChanged: (callback) => {
    const handler = (_event, mode) => callback(mode);
    ipcRenderer.on('window:modeChanged', handler);
    return () => ipcRenderer.removeListener('window:modeChanged', handler);
  }
};

contextBridge.exposeInMainWorld('cristaAPI', apiBridge);
contextBridge.exposeInMainWorld('mantisAPI', apiBridge);
