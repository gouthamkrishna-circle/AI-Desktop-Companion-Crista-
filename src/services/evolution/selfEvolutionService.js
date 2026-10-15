/**
 * MANTIS Self-Evolution & Autonomous Meta-Programming Engine
 * Grants MANTIS complete read/write access to its own codebase and system shell,
 * enabling live self-modification of UI, styling, voice, logic, and features.
 */

const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');

class SelfEvolutionService {
  constructor(db, projectRoot = null) {
    this.db = db;
    this.projectRoot = projectRoot || path.resolve(__dirname, '../../../');
    this.backupDir = path.join(this.projectRoot, '.mantis', 'backups');
    
    if (!fs.existsSync(this.backupDir)) {
      try {
        fs.mkdirSync(this.backupDir, { recursive: true });
      } catch (e) {}
    }
  }

  // Get project root
  getRoot() {
    return this.projectRoot;
  }

  // Resolves a relative path safely to the project root
  resolvePath(relPath) {
    const cleanRel = (relPath || '').replace(/^[\\\/]+/, '');
    return path.join(this.projectRoot, cleanRel);
  }

  // Read any file within the codebase
  readSelfFile(relPath) {
    const fullPath = this.resolvePath(relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File does not exist: ${relPath}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
  }

  // Backup and write a modified file within the codebase
  writeSelfFile(relPath, newContent, summary = 'Autonomous evolution update', userRequest = '') {
    const fullPath = this.resolvePath(relPath);

    // 1. Create timestamped backup if file exists
    let backupPath = null;
    if (fs.existsSync(fullPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${path.basename(relPath)}.${timestamp}.bak`;
      backupPath = path.join(this.backupDir, backupFilename);
      try {
        fs.copyFileSync(fullPath, backupPath);
      } catch (e) {
        console.warn('[Evolution] Backup note:', e.message);
      }
    }

    // 2. Ensure parent directory exists and write file
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, newContent, 'utf8');

    // 3. Log evolution in database
    if (this.db && this.db.logEvolution) {
      this.db.logEvolution(userRequest, relPath, summary, backupPath);
    }

    console.log(`[Evolution] Updated file: ${relPath} (${summary})`);
    return {
      success: true,
      file: relPath,
      backup: backupPath,
      summary
    };
  }

  // Execute system commands directly (PowerShell / Windows CMD)
  async executeSystemCommand(commandLine) {
    if (!commandLine) throw new Error('No command provided.');

    return new Promise((resolve, reject) => {
      exec(commandLine, { cwd: this.projectRoot, maxBuffer: 10 * 1024 * 1024, shell: 'powershell.exe' }, (err, stdout, stderr) => {
        if (err) {
          resolve({
            success: false,
            exitCode: err.code || 1,
            output: stderr || err.message,
            command: commandLine
          });
        } else {
          resolve({
            success: true,
            exitCode: 0,
            output: stdout || stderr || 'Command executed successfully.',
            command: commandLine
          });
        }
      });
    });
  }

  // Lists all core files Mantis can modify
  listCoreFiles() {
    return [
      { path: 'src/renderer/styles/orb.css', desc: 'Visual glass orb design, lighting, breathing animations, glowing aura' },
      { path: 'src/renderer/styles/main.css', desc: 'Core UI styling, colors, glassmorphism, typography, layout' },
      { path: 'src/renderer/index.html', desc: 'Desktop companion markup, widgets, tabs, cards, controls' },
      { path: 'src/renderer/scripts/app.js', desc: 'Window controls, tab switching, drag physics, layout' },
      { path: 'src/renderer/scripts/chat.js', desc: 'Chat experience, vision buttons, auto-typing, quick chips' },
      { path: 'src/renderer/scripts/voice.js', desc: 'Speech recognition, audio recording, microphone controls' },
      { path: 'src/services/voice/neuralVoice.js', desc: 'Studio human neural voice generation, voices, bitrates' },
      { path: 'src/services/ai/geminiProvider.js', desc: 'AI persona, vision integration, model prompts' },
      { path: 'src/main/automation.js', desc: 'Computer control, keystroke typing, app launching, web research' },
      { path: 'src/main/index.js', desc: 'Electron main process, window creation, hotkeys, system integration' }
    ];
  }
}

module.exports = SelfEvolutionService;
