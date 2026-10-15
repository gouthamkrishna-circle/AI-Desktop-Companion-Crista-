/**
 * Mantis Settings & Preferences Manager
 * Synchronizes user configuration with local SQLite database.
 */

class SettingsManager {
  constructor() {
    this.form = document.getElementById('settings-form');
    this.providerSelect = document.getElementById('setting-provider');
    this.geminiGroup = document.getElementById('group-gemini-config');
    this.geminiKeyInput = document.getElementById('setting-gemini-key');
    this.geminiModelInput = document.getElementById('setting-gemini-model');
    this.openaiGroup = document.getElementById('group-openai-config');
    this.openaiKeyInput = document.getElementById('setting-openai-key');
    this.openaiModelInput = document.getElementById('setting-openai-model');

    this.nameInput = document.getElementById('setting-name');
    this.callsignSelect = document.getElementById('setting-callsign');
    this.langSelect = document.getElementById('setting-language');
    this.voiceModelSelect = document.getElementById('setting-voice-model');
    this.testVoiceBtn = document.getElementById('btn-test-voice');
    this.alwaysOnTopCheck = document.getElementById('setting-always-ontop');
    this.startupCheck = document.getElementById('setting-startup');
    this.proactiveCheck = document.getElementById('setting-proactive');

    this.bindEvents();
    this.loadSettings();
  }

  bindEvents() {
    if (this.testVoiceBtn) {
      this.testVoiceBtn.addEventListener('click', () => {
        const voice = this.voiceModelSelect?.value || 'en-US-BrianMultilingualNeural';
        if (window.voiceAssistant) {
          window.voiceAssistant.speak('Hello boss. All systems are fully operational, and my voice channels are crystal clear.', null, voice);
        }
      });
    }
    if (this.providerSelect) {
      this.providerSelect.addEventListener('change', () => this.updateProviderVisibility());
    }

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }

    if (this.alwaysOnTopCheck) {
      this.alwaysOnTopCheck.addEventListener('change', () => {
        window.mantisAPI.setAlwaysOnTop(this.alwaysOnTopCheck.checked);
      });
    }

    if (this.startupCheck) {
      this.startupCheck.addEventListener('change', () => {
        window.mantisAPI.setStartup(this.startupCheck.checked);
      });
    }
  }

  updateProviderVisibility() {
    const val = this.providerSelect.value;
    if (this.geminiGroup) this.geminiGroup.classList.toggle('hidden', val !== 'gemini');
    if (this.openaiGroup) this.openaiGroup.classList.toggle('hidden', val !== 'openai');
  }

  async loadSettings() {
    try {
      const p = await window.mantisAPI.getProfile();
      if (!p) return;

      if (this.providerSelect) this.providerSelect.value = p.ai_provider || 'local';
      this.updateProviderVisibility();

      if (this.geminiKeyInput) this.geminiKeyInput.value = p.gemini_api_key || '';
      if (this.geminiModelInput) this.geminiModelInput.value = p.gemini_model || 'gemini-1.5-flash';

      if (this.openaiKeyInput) this.openaiKeyInput.value = p.openai_api_key || '';
      if (this.openaiModelInput) this.openaiModelInput.value = p.openai_model || 'gpt-4o-mini';

      if (this.nameInput) this.nameInput.value = p.name || 'Boss';
      if (this.callsignSelect) this.callsignSelect.value = p.callsign || 'boss';
      if (this.langSelect) this.langSelect.value = p.preferred_language || 'en-IN';

      if (this.alwaysOnTopCheck) this.alwaysOnTopCheck.checked = !!p.always_on_top;
      if (this.startupCheck) this.startupCheck.checked = !!p.launch_on_startup;
      if (this.proactiveCheck) this.proactiveCheck.checked = !!p.proactive_enabled;

      // Update calls in UI
      this.updateCallsignLabels(p.callsign || 'boss');
      if (window.voiceAssistant) {
        window.voiceAssistant.setLanguage(p.preferred_language || 'en-IN');
      }
    } catch (err) {
      console.warn('[SettingsManager] Error loading settings:', err);
    }
  }

  updateCallsignLabels(callsign) {
    document.querySelectorAll('.user-callsign-display').forEach(el => {
      el.textContent = callsign;
    });
  }

  async saveSettings() {
    const fields = {
      ai_provider: this.providerSelect.value,
      gemini_api_key: (this.geminiKeyInput.value || '').trim(),
      gemini_model: (this.geminiModelInput.value || 'gemini-1.5-flash').trim(),
      openai_api_key: (this.openaiKeyInput.value || '').trim(),
      openai_model: (this.openaiModelInput.value || 'gpt-4o-mini').trim(),
      name: (this.nameInput.value || 'Boss').trim(),
      callsign: this.callsignSelect.value,
      preferred_language: this.langSelect.value,
      always_on_top: this.alwaysOnTopCheck.checked ? 1 : 0,
      launch_on_startup: this.startupCheck.checked ? 1 : 0,
      proactive_enabled: this.proactiveCheck.checked ? 1 : 0
    };

    try {
      await window.mantisAPI.updateProfile(fields);
      await window.mantisAPI.setStartup(fields.launch_on_startup);
      await window.mantisAPI.setAlwaysOnTop(fields.always_on_top);

      this.updateCallsignLabels(fields.callsign);
      if (window.voiceAssistant) {
        window.voiceAssistant.setLanguage(fields.preferred_language);
      }

      alert('Settings saved successfully!');
    } catch (err) {
      alert(`Error saving settings: ${err.message}`);
    }
  }
}

window.settingsManager = new SettingsManager();
