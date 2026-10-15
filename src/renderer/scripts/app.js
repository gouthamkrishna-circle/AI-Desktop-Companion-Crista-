/**
 * CRISTA Desktop Companion HUD Controller
 * Controls Crista UI:
 * 1. Chibi Robot Roaming & Smooth Window Movement around desktop
 * 2. Silent Screen Observer invocation & active typing
 * 3. Priorities checklist & Quick Actions
 * 4. Compact Orb mode vs Expanded Assistant Panel
 */

class CristaHUDApp {
  constructor() {
    this.api = window.cristaAPI || window.mantisAPI;
    this.isAlwaysOnTop = true;
    this.isRoaming = false;
    this.roamInterval = null;
    this.currentMode = 'expanded';
    this.mantisEl = document.getElementById('mantis-roaming-character');
    this.avatarEl = document.getElementById('avatar-companion-btn');

    this.bindWindowControls();
    this.bindModeListener();
    this.bindTabs();
    this.bindActionTiles();
    this.bindPriorities();
    this.bindCommandBar();
    this.bindSpeechBubble();
  }

  bindModeListener() {
    if (this.api && this.api.onWindowModeChanged) {
      this.api.onWindowModeChanged((mode) => {
        this.currentMode = mode;
        document.body.classList.toggle('mode-orb', mode === 'orb');
      });
    }
  }

  // Cute Roaming Movement (Glides across the desktop like a cutie companion)
  async startRoaming() {
    this.pauseRoaming();
    if (!this.api) return;
    this.isRoaming = true;

    const cuteQuotes = [
      "Watching your screen, boss! (´｡• ᵕ •｡`)",
      "I'm right beside you! Keep crushing it ✨",
      "Silently taking care of things for you 🌸",
      "Hydration check! Drink some water 💧",
      "Say 'Hey Crista' anytime you need me~",
      "Exploring your desktop like a cutie! (｡♥‿♥｡)"
    ];

    let spotIndex = 0;
    this.roamInterval = setInterval(async () => {
      if (!this.isRoaming) return;

      try {
        const bounds = (await this.api.getScreenBounds()) || { width: 1536, height: 864 };
        const w = bounds.width || 1536;
        const h = bounds.height || 864;

        // Cute cozy safe zones around the desktop perimeter so we don't cover central apps
        const spots = [
          { x: w - 200, y: 30 },
          { x: 40, y: 30 },
          { x: Math.round(w / 2 - 80), y: 20 },
          { x: w - 200, y: Math.max(30, h - 220) },
          { x: 40, y: Math.max(30, h - 220) },
          { x: w - 200, y: Math.round(h / 2 - 90) }
        ];

        const target = spots[spotIndex % spots.length];
        spotIndex++;

        // Smooth glide with easing over 1.6s
        if (this.api.smoothMoveTo) {
          await this.api.smoothMoveTo(target.x, target.y, 1600);
        }

        // Show spontaneous cute cheer message
        if (Math.random() > 0.35) {
          const bubble = document.getElementById('mantis-speech-bubble');
          const bubbleText = document.getElementById('speech-bubble-text');
          if (bubble && bubbleText) {
            const randomQuote = cuteQuotes[Math.floor(Math.random() * cuteQuotes.length)];
            bubbleText.innerHTML = `<strong>Crista (´｡• ᵕ •｡`)</strong><br>${randomQuote}`;
            bubble.style.display = 'block';
            bubble.style.opacity = '1';
            setTimeout(() => {
              if (bubble) bubble.style.opacity = '0.35';
            }, 7000);
          }
        }
      } catch (e) {}
    }, 15000);
  }

  pauseRoaming() {
    this.isRoaming = false;
    if (this.roamInterval) {
      clearInterval(this.roamInterval);
      this.roamInterval = null;
    }
  }

  // Speech Bubble Auto-Hide & Dismiss
  bindSpeechBubble() {
    const dismissBtn = document.getElementById('btn-dismiss-speech');
    const bubble = document.getElementById('mantis-speech-bubble');

    if (dismissBtn && bubble) {
      dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bubble.style.opacity = '0';
        setTimeout(() => { bubble.style.display = 'none'; }, 300);
      });

      // Subtle fade after 25s so it stays clean
      setTimeout(() => {
        if (bubble) {
          bubble.style.transition = 'opacity 1s ease';
          bubble.style.opacity = '0.4';
        }
      }, 25000);
    }
  }

  // Window Controls & Cute Dragging
  bindWindowControls() {
    const btnRoam = document.getElementById('btn-toggle-roam');
    const btnPin = document.getElementById('btn-win-pin');
    const btnMin = document.getElementById('btn-win-minimize');
    const btnClose = document.getElementById('btn-win-close');

    if (btnRoam) {
      btnRoam.addEventListener('click', async () => {
        const nextMode = this.currentMode === 'expanded' ? 'orb' : 'expanded';
        this.currentMode = nextMode;
        document.body.classList.toggle('mode-orb', nextMode === 'orb');
        if (this.api && this.api.setWindowMode) {
          await this.api.setWindowMode(nextMode);
        }
        if (nextMode === 'orb') {
          this.startRoaming();
        } else {
          this.pauseRoaming();
        }
      });
    }

    if (btnPin) {
      btnPin.addEventListener('click', async () => {
        this.isAlwaysOnTop = !this.isAlwaysOnTop;
        if (this.api) await this.api.setAlwaysOnTop(this.isAlwaysOnTop);
        btnPin.style.color = this.isAlwaysOnTop ? '#ff2a44' : '#8e94a0';
      });
    }

    if (btnMin) {
      btnMin.addEventListener('click', () => {
        if (this.api) this.api.minimizeWindow();
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (this.api) this.api.hideWindow();
      });
    }

    const avatarBtn = document.getElementById('avatar-companion-btn');
    if (avatarBtn) {
      // Cutie mouse hover animations
      avatarBtn.addEventListener('mouseenter', () => {
        avatarBtn.classList.add('cutie-wiggle');
      });
      avatarBtn.addEventListener('mouseleave', () => {
        avatarBtn.classList.remove('cutie-wiggle');
      });

      // Drag Crista across desktop
      let isDragging = false;
      let startMouseX = 0;
      let startMouseY = 0;

      avatarBtn.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        startMouseX = e.screenX;
        startMouseY = e.screenY;
        this.pauseRoaming();

        const onMouseMove = (ev) => {
          if (!isDragging) return;
          const dx = ev.screenX - startMouseX;
          const dy = ev.screenY - startMouseY;
          startMouseX = ev.screenX;
          startMouseY = ev.screenY;
          if (this.api && this.api.moveWindowBy) {
            this.api.moveWindowBy(dx, dy);
          }
        };

        const onMouseUp = () => {
          isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (this.currentMode === 'orb') {
            setTimeout(() => this.startRoaming(), 8000);
          }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      avatarBtn.addEventListener('click', async (e) => {
        if (this.currentMode === 'orb') {
          // In compact pet mode, clicking expands full panel!
          this.currentMode = 'expanded';
          document.body.classList.remove('mode-orb');
          if (this.api && this.api.setWindowMode) {
            await this.api.setWindowMode('expanded');
          }
          this.pauseRoaming();
        } else if (window.voiceAssistant) {
          window.voiceAssistant.toggleCallMode();
        }
      });
    }
  }

  // 5. Panel Tabs
  bindTabs() {
    const tabs = document.querySelectorAll('.panel-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        document.querySelectorAll('.tab-view-pane').forEach(pane => {
          pane.classList.remove('active');
        });

        const targetPane = document.getElementById(`view-${target}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    const linkViewAll = document.getElementById('link-view-all-tasks');
    if (linkViewAll) {
      linkViewAll.addEventListener('click', () => {
        document.querySelector('.panel-tab[data-tab="tasks"]')?.click();
      });
    }
  }

  // 6. Action Tiles (Plan Day, Open App, YouTube, Focus)
  bindActionTiles() {
    document.getElementById('tile-plan-day')?.addEventListener('click', () => {
      document.querySelector('.panel-tab[data-tab="today"]')?.click();
    });

    document.getElementById('tile-open-app')?.addEventListener('click', () => {
      if (window.chatManager) {
        window.chatManager.sendPrompt('Show available apps to open');
      }
    });

    document.getElementById('tile-youtube')?.addEventListener('click', () => {
      document.querySelector('.panel-tab[data-tab="learning"]')?.click();
    });

    document.getElementById('tile-focus')?.addEventListener('click', () => {
      if (window.chatManager) {
        window.chatManager.sendPrompt('Start a 25-minute focus session');
      }
    });
  }

  // 7. Priorities Interactive Checklist
  bindPriorities() {
    const priorityItems = document.querySelectorAll('.priority-item');
    priorityItems.forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('checked');
        const indicator = item.querySelector('.radio-indicator');
        if (indicator) {
          indicator.classList.toggle('checked', item.classList.contains('checked'));
        }
      });
    });
  }

  // 8. Bottom Floating Command Bar
  bindCommandBar() {
    const input = document.getElementById('hud-command-input');
    const sendBtn = document.getElementById('btn-command-send');
    const voiceBtn = document.getElementById('btn-command-voice');

    const handleSend = () => {
      const text = (input?.value || '').trim();
      if (!text) return;
      input.value = '';

      document.querySelector('.panel-tab[data-tab="chat"]')?.click();
      if (window.chatManager) {
        window.chatManager.sendPrompt(text);
      }
    };

    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSend();
        }
      });
    }

    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        if (window.voiceAssistant) {
          window.voiceAssistant.toggleCallMode();
        }
      });
    }

    // Ctrl + Space hotkey focuses command input
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        input?.focus();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.cristaHUD = new CristaHUDApp();
  window.mantisHUD = window.cristaHUD;
});
