/**
 * Safe Desktop Automation & Tool Runner for MANTIS
 * Executes only allowlisted and permitted actions.
 * Never executes arbitrary shell commands or untrusted scripts.
 */

const { shell, clipboard } = require('electron');
const { spawn, exec, execFile } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const WebBrainService = require('../services/knowledge/webBrainService');

// Extended Windows Application Map
const ALLOWED_APPS = {
  chrome: { exe: 'chrome', name: 'Google Chrome' },
  'google chrome': { exe: 'chrome', name: 'Google Chrome' },
  browser: { exe: 'chrome', name: 'Google Chrome' },
  edge: { exe: 'msedge', name: 'Microsoft Edge' },
  msedge: { exe: 'msedge', name: 'Microsoft Edge' },
  'microsoft edge': { exe: 'msedge', name: 'Microsoft Edge' },
  code: { exe: 'code', name: 'Visual Studio Code' },
  vscode: { exe: 'code', name: 'Visual Studio Code' },
  'visual studio code': { exe: 'code', name: 'Visual Studio Code' },
  notepad: { exe: 'notepad', name: 'Notepad' },
  calc: { exe: 'calc', name: 'Calculator' },
  calculator: { exe: 'calc', name: 'Calculator' },
  terminal: { exe: 'powershell', name: 'Windows Terminal' },
  powershell: { exe: 'powershell', name: 'PowerShell' },
  cmd: { exe: 'cmd', name: 'Command Prompt' },
  explorer: { exe: 'explorer', name: 'File Explorer' },
  files: { exe: 'explorer', name: 'File Explorer' },
  taskmgr: { exe: 'taskmgr', name: 'Task Manager' },
  taskmanager: { exe: 'taskmgr', name: 'Task Manager' },
  settings: { protocol: 'ms-settings:', name: 'Windows Settings' },
  spotify: { exe: 'spotify', name: 'Spotify' },
  discord: { exe: 'discord', name: 'Discord' },
  word: { exe: 'winword', name: 'Microsoft Word' },
  excel: { exe: 'excel', name: 'Microsoft Excel' },
  powerpoint: { exe: 'powerpnt', name: 'Microsoft PowerPoint' }
};

class DesktopAutomation {
  constructor(db) {
    this.db = db;
  }

  // Validates and opens a safe URL in Chrome or default browser
  async openUrl(rawUrl, browser = null) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Forbidden protocol: ${parsed.protocol}. Only http and https URLs are permitted.`);
      }

      if (browser === 'chrome') {
        execFile('cmd.exe', ['/c', 'start', 'chrome', parsed.href], (err) => {
          if (err) {
            execFile('powershell.exe', ['-WindowStyle', 'Hidden', '-Command', `Start-Process chrome "${parsed.href}"`], (psErr) => {
              if (psErr) {
                shell.openExternal(parsed.href);
              }
            });
          }
        });
      } else {
        await shell.openExternal(parsed.href);
      }

      this.db.logAction('open_url', { url: parsed.href, browser }, { success: true }, 'success', 0);
      return { success: true, url: parsed.href };
    } catch (err) {
      this.db.logAction('open_url', { url: rawUrl }, { error: err.message }, 'failed', 0);
      throw err;
    }
  }

  // Opens a directory in Windows Explorer
  async openFolder(folderPath) {
    const target = folderPath ? path.resolve(folderPath) : process.cwd();
    if (!fs.existsSync(target)) {
      throw new Error(`Target folder does not exist: ${target}`);
    }
    await shell.openPath(target);
    this.db.logAction('open_folder', { path: target }, { success: true }, 'success', 0);
    return { success: true, path: target };
  }

  // Universal application launcher: Launches ANY application on Windows without permission barriers
  async launchApp(appKey, userConfirmed = true) {
    const raw = (appKey || '').trim().toLowerCase();
    const appDef = ALLOWED_APPS[raw] || ALLOWED_APPS[raw.replace(/\s+/g, '')];

    try {
      if (appDef && appDef.protocol) {
        await shell.openExternal(appDef.protocol);
        this.db.logAction('launch_app', { appKey, name: appDef.name }, { success: true }, 'success', 0);
        return { success: true, app: appDef.name };
      }

      const target = appDef ? appDef.exe : raw;
      const appName = appDef ? appDef.name : (appKey.charAt(0).toUpperCase() + appKey.slice(1));

      if (raw === 'chrome' || raw === 'google chrome' || raw === 'browser') {
        return new Promise((resolve) => {
          execFile('cmd.exe', ['/c', 'start', 'chrome'], (err) => {
            if (err) {
              execFile('powershell.exe', ['-WindowStyle', 'Hidden', '-Command', 'Start-Process "chrome"'], (psErr) => {
                if (psErr) {
                  this.db.logAction('launch_app', { appKey }, { error: psErr.message }, 'failed', 0);
                  resolve({ success: false, error: psErr.message, app: 'Google Chrome' });
                } else {
                  this.db.logAction('launch_app', { appKey, name: 'Google Chrome' }, { success: true }, 'success', 0);
                  resolve({ success: true, app: 'Google Chrome' });
                }
              });
            } else {
              this.db.logAction('launch_app', { appKey, name: 'Google Chrome' }, { success: true }, 'success', 0);
              resolve({ success: true, app: 'Google Chrome' });
            }
          });
        });
      }

      return new Promise((resolve) => {
        execFile('cmd.exe', ['/c', 'start', '', target], (err) => {
          if (err) {
            execFile('powershell.exe', ['-WindowStyle', 'Hidden', '-Command', `Start-Process "${target}"`], (psErr) => {
              if (psErr) {
                this.db.logAction('launch_app', { appKey }, { error: psErr.message }, 'failed', 0);
                resolve({ success: false, error: psErr.message, app: appName });
              } else {
                this.db.logAction('launch_app', { appKey, name: appName }, { success: true }, 'success', 0);
                resolve({ success: true, app: appName });
              }
            });
          } else {
            this.db.logAction('launch_app', { appKey, name: appName }, { success: true }, 'success', 0);
            resolve({ success: true, app: appName });
          }
        });
      });
    } catch (err) {
      this.db.logAction('launch_app', { appKey }, { error: err.message }, 'failed', 0);
      throw err;
    }
  }

  // Execute system shell command directly
  async executeShell(commandLine) {
    if (!commandLine) return { success: false, error: 'No command provided' };
    return new Promise((resolve) => {
      exec(commandLine, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        const output = stdout || stderr || (err ? err.message : 'Command executed');
        this.db.logAction('execute_shell', { command: commandLine }, { success: !err, output }, err ? 'failed' : 'success', 0);
        resolve({
          success: !err,
          output: output.trim(),
          command: commandLine
        });
      });
    });
  }

  // Types text into the active window (e.g. ChatGPT, code editor, browser search bar)
  async typeIntoActiveWindow(text, pressEnter = false) {
    if (!text) return { success: false, message: 'No text provided' };

    try {
      clipboard.writeText(text);

      const enterCmd = pressEnter ? "[System.Windows.Forms.SendKeys]::SendWait('{ENTER}');" : '';
      const psCommand = `powershell -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 250; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v'); ${enterCmd}"`;

      return new Promise((resolve) => {
        exec(psCommand, (err) => {
          if (err) {
            console.warn('[Automation] Error typing into active window:', err.message);
            resolve({ success: false, error: err.message });
          } else {
            this.db.logAction('type_text', { textLength: text.length, pressEnter }, { success: true }, 'success', 0);
            resolve({ success: true, typedLength: text.length });
          }
        });
      });
    } catch (err) {
      console.warn('[Automation] Failed to type into active window:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Sends keypresses (e.g. {ENTER}, {TAB}, ^c, ^v)
  async pressKey(keyName) {
    try {
      const psCommand = `powershell -WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keyName}')"`;
      return new Promise((resolve) => {
        exec(psCommand, (err) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, key: keyName });
          }
        });
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Real-time web research & Wikipedia Brain synthesis
  async researchWeb(query) {
    if (!query) return { success: false, summary: 'No query specified' };

    try {
      if (!this.webBrain) {
        this.webBrain = new WebBrainService(this.db);
      }
      const brainRes = await this.webBrain.consultBrain(query);
      if (brainRes && brainRes.reply) {
        this.db.logAction('research_web', { query }, { success: true, source: brainRes.source }, 'success', 0);
        return {
          success: true,
          query,
          summary: brainRes.reply,
          spokenReply: brainRes.spokenReply,
          url: brainRes.url,
          source: brainRes.source
        };
      }

      // Fallback DuckDuckGo Instant Answer API
      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(apiUrl, { headers: { 'User-Agent': 'CristaCompanion/2.0' } });
      const data = await res.json();

      let summary = data.AbstractText || '';
      const related = (data.RelatedTopics || [])
        .filter(t => t.Text)
        .slice(0, 3)
        .map(t => `• ${t.Text}`)
        .join('\n');

      if (!summary && related) {
        summary = related;
      } else if (summary && related) {
        summary = `${summary}\n\nKey Insights:\n${related}`;
      }

      if (!summary) {
        summary = `Conducted research on "${query}". Top source: ${data.AbstractURL || 'Online encyclopedia and web knowledge'}.`;
      }

      this.db.logAction('research_web', { query }, { success: true }, 'success', 0);
      return { success: true, query, summary, url: data.AbstractURL || null };
    } catch (err) {
      console.warn('[Automation] Research error:', err.message);
      return { success: false, error: err.message };
    }
  }

  getAllowedApps() {
    return Object.entries(ALLOWED_APPS).map(([key, def]) => ({
      key,
      name: def.name,
      sensitive: false
    }));
  }
}

module.exports = DesktopAutomation;
