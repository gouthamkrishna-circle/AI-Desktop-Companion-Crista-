/**
 * Mantis Chat Manager
 * Handles conversation rendering, user input, quick suggestion chips,
 * and sensitive tool permission requests.
 */

class ChatManager {
  constructor() {
    this.container = document.getElementById('chat-messages-container');
    this.inputText = document.getElementById('chat-input-text');
    this.sendBtn = document.getElementById('btn-send-message');
    this.visionBtn = document.getElementById('btn-screen-vision');
    this.orbVisionBtn = document.getElementById('orb-vision-btn');
    this.typePromptBtn = document.getElementById('btn-type-prompt');
    this.confirmCard = document.getElementById('action-confirm-card');
    this.confirmTitle = document.getElementById('confirm-card-title');
    this.confirmDesc = document.getElementById('confirm-card-desc');
    this.confirmBtn = document.getElementById('btn-confirm-action');
    this.cancelBtn = document.getElementById('btn-cancel-action');

    this.pendingAction = null;
    this.history = [];
    this.lastAssistantReply = '';

    this.bindEvents();
    this.loadHistory();
  }

  bindEvents() {
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.handleSend());
    }

    if (this.visionBtn) {
      this.visionBtn.addEventListener('click', () => this.handleScreenVision());
    }

    if (this.orbVisionBtn) {
      this.orbVisionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleScreenVision();
      });
    }

    if (this.typePromptBtn) {
      this.typePromptBtn.addEventListener('click', () => this.handleTypeIntoActiveApp());
    }

    if (this.inputText) {
      this.inputText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
    }

    // Quick suggestion chips inside container
    if (this.container) {
      this.container.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (chip && chip.dataset.intent) {
          if (chip.dataset.intent === 'inspect_screen') {
            this.handleScreenVision();
          } else if (chip.dataset.intent === 'type_last_response') {
            this.handleTypeIntoActiveApp();
          } else if (chip.dataset.intent === 'research_screen_topic') {
            this.sendPrompt('Research this topic further and explain interesting facts about it.');
          } else {
            this.sendPrompt(chip.dataset.intent);
          }
        }
      });
    }

    // Action Confirmation
    if (this.confirmBtn) {
      this.confirmBtn.addEventListener('click', () => this.approvePendingAction());
    }
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.denyPendingAction());
    }
  }

  async loadHistory() {
    try {
      const messages = await window.mantisAPI.getChatHistory();
      if (messages && messages.length > 0) {
        this.container.innerHTML = '';
        messages.forEach(msg => {
          this.appendBubble(msg.role, msg.content, msg.provider);
          this.history.push({ role: msg.role, content: msg.content });
        });
      }
    } catch (err) {
      console.warn('[ChatManager] Error loading history:', err);
    }
  }

  handleUserVoiceInput(transcript) {
    if (this.inputText) {
      this.inputText.value = transcript;
    }
    this.handleSend();
  }

  async handleUserAudioInput(base64Audio) {
    this.appendBubble('user', '🎤 [Voice message]');
    window.companionOrb.setState('thinking');

    try {
      const response = await window.mantisAPI.sendMessage('', this.history, base64Audio);
      window.companionOrb.setState('idle');

      this.appendBubble('assistant', response.reply, response.provider, response.suggestedActions);
      this.history.push({ role: 'assistant', content: response.reply });

      if (window.voiceAssistant) {
        window.voiceAssistant.speak(response.reply, response.language);
      }

      if (response.toolExecution) {
        this.handleToolExecution(response.toolExecution);
      }

      if (response.evolutionAction && response.evolutionAction.hotReload) {
        setTimeout(() => {
          window.location.reload();
        }, 1800);
      }
    } catch (err) {
      window.companionOrb.setState('idle');
      this.appendBubble('assistant', `Encountered an error: ${err.message}`, 'error');
    }
  }

  async handleSend() {
    const text = (this.inputText.value || '').trim();
    if (!text) return;

    this.inputText.value = '';
    this.sendPrompt(text);
  }

  async sendPrompt(text) {
    this.appendBubble('user', text);
    this.history.push({ role: 'user', content: text });

    window.companionOrb.setState('thinking', 'Thinking...');

    try {
      const response = await window.mantisAPI.sendMessage(text, this.history);
      window.companionOrb.setState('idle');

      this.lastAssistantReply = response.reply;
      this.appendBubble('assistant', response.reply, response.provider, response.suggestedActions);
      this.history.push({ role: 'assistant', content: response.reply });

      // Speak response with natural human voice
      if (window.voiceAssistant) {
        window.voiceAssistant.speak(response.reply, response.language);
      }

      // Check if tool execution was requested
      if (response.toolExecution) {
        this.handleToolExecution(response.toolExecution);
      }

      // Check if autonomous self-evolution took place!
      if (response.evolutionAction && response.evolutionAction.hotReload) {
        console.log('[ChatManager] Self-evolution applied to codebase. Hot reloading interface...');
        setTimeout(() => {
          window.location.reload();
        }, 1800);
      }
    } catch (err) {
      window.companionOrb.setState('idle');
      this.appendBubble('assistant', `Encountered an error: ${err.message}`, 'error');
    }
  }

  async handleScreenVision(customPrompt = '') {
    const prompt = (customPrompt || this.inputText.value || '').trim() || 'Look at my active screen. What application or content is open (such as ChatGPT, code, browser), explain it clearly, and suggest the best response or action.';
    this.inputText.value = '';

    this.appendBubble('user', `👁️ [Screen Inspection] ${prompt}`);
    this.history.push({ role: 'user', content: `[Screen Image Attached] ${prompt}` });

    window.companionOrb.setState('thinking', 'Scanning your screen...');

    try {
      const screenBase64 = await window.mantisAPI.captureScreen();
      if (!screenBase64) {
        throw new Error('Screen capture was unavailable.');
      }

      const response = await window.mantisAPI.sendMessage(prompt, this.history, null, screenBase64);
      window.companionOrb.setState('idle');

      this.lastAssistantReply = response.reply;
      this.appendBubble('assistant', response.reply, response.provider, [
        { label: '✍️ Type Answer into Active Window', intent: 'type_last_response' },
        { label: '🔍 Research Topic Deeper', intent: 'research_screen_topic' }
      ]);
      this.history.push({ role: 'assistant', content: response.reply });

      if (window.voiceAssistant) {
        window.voiceAssistant.speak(response.reply, response.language);
      }

      if (response.evolutionAction && response.evolutionAction.hotReload) {
        setTimeout(() => {
          window.location.reload();
        }, 1800);
      }
    } catch (err) {
      window.companionOrb.setState('idle');
      this.appendBubble('assistant', `Screen Vision Error: ${err.message}`, 'error');
    }
  }

  async handleTypeIntoActiveApp(text = null) {
    const textToType = text || this.lastAssistantReply || (this.inputText.value || '').trim();
    if (!textToType) {
      alert('No text available to type. Ask Crista a question first or write in the prompt box.');
      return;
    }

    this.appendBubble('assistant', '✍️ Typing your response into your active window now (ChatGPT/Editor)...', 'system');
    
    // Quick 300ms delay so target window receives input focus cleanly
    setTimeout(async () => {
      try {
        await window.mantisAPI.typeText(textToType, true);
      } catch (e) {
        console.warn('Type error:', e);
      }
    }, 300);
  }

  handleToolExecution(toolExec) {
    const { tool, parameters } = toolExec;
    console.log('[ChatManager] Executing tool:', tool, parameters);

    const api = window.cristaAPI || window.mantisAPI;

    if (tool === 'toggle_roam') {
      const mode = parameters?.mode || 'orb';
      const roam = parameters?.roam !== false;
      document.body.classList.toggle('mode-orb', mode === 'orb');
      if (api && api.setWindowMode) {
        api.setWindowMode(mode);
      }
      if (window.cristaHUD) {
        if (roam) window.cristaHUD.startRoaming();
        else window.cristaHUD.pauseRoaming();
      }
    } else if (tool === 'open_url' && parameters?.url) {
      if (api) api.openUrl(parameters.url, parameters?.browser);
    } else if (tool === 'launch_app' && parameters?.app) {
      if (api) {
        api.launchApp(parameters.app, true);
      }
    } else if ((tool === 'execute_shell' || tool === 'execute_command') && parameters?.command) {
      if (api && api.executeShell) {
        api.executeShell(parameters.command);
      }
    } else if (tool === 'open_folder' && parameters?.path) {
      if (api) api.openFolder(parameters.path);
    } else if (tool === 'create_task') {
      if (window.plannerManager) window.plannerManager.loadTasks();
    }
  }

  promptApproval(actionData) {
    this.pendingAction = actionData;
    this.confirmTitle.textContent = `Permission Requested: ${actionData.name}`;
    this.confirmDesc.textContent = actionData.message || 'Crista requires your approval to proceed with this desktop operation.';
    this.confirmCard.classList.remove('hidden');
  }

  async approvePendingAction() {
    if (!this.pendingAction) return;
    this.confirmCard.classList.add('hidden');
    const act = this.pendingAction;
    this.pendingAction = null;

    try {
      await window.mantisAPI.launchApp(act.appKey, true);
      this.appendBubble('assistant', `Launched ${act.name} with your permission.`, 'system');
      if (window.automationManager) window.automationManager.loadHistory();
    } catch (err) {
      this.appendBubble('assistant', `Failed to execute: ${err.message}`, 'error');
    }
  }

  denyPendingAction() {
    this.confirmCard.classList.add('hidden');
    const act = this.pendingAction;
    this.pendingAction = null;
    this.appendBubble('assistant', `Action for ${act?.name || 'tool'} was denied by user.`, 'system');
  }

  appendBubble(role, content, provider = 'local', suggestedActions = []) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;

    const header = document.createElement('div');
    header.className = 'bubble-header';

    const avatar = document.createElement('span');
    avatar.className = 'avatar-badge';
    avatar.textContent = role === 'user' ? 'You' : 'Crista';

    const badge = document.createElement('span');
    badge.className = 'provider-badge';
    badge.textContent = provider.toUpperCase();

    header.appendChild(avatar);
    header.appendChild(badge);
    bubble.appendChild(header);

    const body = document.createElement('div');
    body.className = 'bubble-text';
    body.textContent = content;
    bubble.appendChild(body);

    if (suggestedActions && suggestedActions.length > 0) {
      const chipContainer = document.createElement('div');
      chipContainer.className = 'quick-chips';
      suggestedActions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.textContent = act.label;
        btn.dataset.intent = act.intent;
        chipContainer.appendChild(btn);
      });
      bubble.appendChild(chipContainer);
    }

    this.container.appendChild(bubble);
    this.container.scrollTop = this.container.scrollHeight;
  }
}

window.chatManager = new ChatManager();
