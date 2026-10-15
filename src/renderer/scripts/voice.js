/**
 * MANTIS — Conversational AI Voice Engine
 * Features:
 * 1. Agora Live Call: Real-time, full-duplex, human-like voice conversation
 * 2. Instant Barge-In (<160ms interruption): If you speak while Mantis talks, Mantis immediately listens
 * 3. Continuous "Hey Mantis" Wake Word: Hands-free activation without touching mic buttons
 * 4. High-Definition Edge Neural Voice fallback for offline & chat queries
 */

class VoiceAssistant {
  constructor() {
    this.isCallMode = false;
    this.agoraClient = null;
    this.localAudioTrack = null;
    this.remoteAudioTrack = null;
    this.wakeWordRecognizer = null;
    this.currentAudio = null;
    this.preferredLanguage = 'en-IN';
    this.preferredVoice = 'en-US-JennyMultilingualNeural';

    // Fallback recorder & VAD for local mode
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.activeStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.vadAnimFrame = null;
    this.userHasSpoken = false;
    this.silenceStartTime = null;

    // UI elements
    this.orbMicBtn = document.getElementById('orb-mic-btn');
    this.mainMicBtn = document.getElementById('main-mic-btn');
    this.stopSpeechBtn = document.getElementById('btn-stop-speech');
    this.btnCallMode = document.getElementById('btn-call-mode');
    this.orbCallBtn = document.getElementById('orb-call-btn');

    this.bindEvents();
    this.initWakeWord();
  }

  setLanguage(lang) {
    this.preferredLanguage = lang || 'en-IN';
  }

  bindEvents() {
    const toggleMic = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.isCallMode) {
        this.stopAgoraCall();
      } else if (this.isRecording) {
        this.stopListening();
      } else {
        this.startListening();
      }
    };

    if (this.orbMicBtn) this.orbMicBtn.addEventListener('click', toggleMic);
    if (this.mainMicBtn) this.mainMicBtn.addEventListener('click', toggleMic);

    if (this.stopSpeechBtn) {
      this.stopSpeechBtn.addEventListener('click', () => this.stopSpeaking());
    }

    const toggleCall = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.toggleCallMode();
    };

    if (this.btnCallMode) this.btnCallMode.addEventListener('click', toggleCall);
    if (this.orbCallBtn) this.orbCallBtn.addEventListener('click', toggleCall);
  }

  // =========================================================================
  // 1. AGORA LIVE CALL ENGINE (ULTRA-REALISTIC HUMAN PHONE CALL)
  // =========================================================================

  async toggleCallMode() {
    if (this.isCallMode) {
      await this.stopAgoraCall();
    } else {
      await this.startAgoraCall();
    }
  }

  async startAgoraCall() {
    this.stopSpeaking();
    this.stopWakeWord();

    try {
      this.isCallMode = true;
      this.updateCallUI(true);
      window.companionOrb.setState('thinking', 'Connecting live call...');

      if (!window.AgoraRTC) {
        console.warn('[VoiceAssistant] AgoraRTC library not detected, falling back to local voice mode.');
        this.startListening();
        return;
      }

      // 1. Request main process to launch Agora Conversational AI Session
      const api = window.cristaAPI || window.mantisAPI;
      const callData = await api.startLiveCall();
      if (callData.error) {
        console.warn('[VoiceAssistant] Agora session error:', callData.error);
        const speechBubble = document.getElementById('speech-bubble-text');
        if (speechBubble) {
          speechBubble.innerHTML = `<strong>Crista</strong><br>Agora notice: switching smoothly to neural voice fallback.`;
        }
        this.isCallMode = false;
        this.updateCallUI(false);
        this.startListening();
        return;
      }

      console.log('[VoiceAssistant] Connected to Agora channel:', callData.channel);

      // 2. Initialize Agora WebRTC Client
      this.agoraClient = window.AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

      // Handle remote audio published by the AI Agent
      this.agoraClient.on('user-published', async (user, mediaType) => {
        await this.agoraClient.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          console.log('[VoiceAssistant] Agora Agent audio stream active!');
          this.remoteAudioTrack = user.audioTrack;
          user.audioTrack.play();
          window.companionOrb.setState('speaking', 'Crista is speaking...');

          // Monitor volume to animate companion orb
          this.monitorRemoteAudio(user.audioTrack);
        }
      });

      this.agoraClient.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'audio') {
          window.companionOrb.setState('listening', 'Crista is listening...');
        }
      });

      this.agoraClient.on('user-left', () => {
        console.log('[VoiceAssistant] Agent session ended.');
        this.stopAgoraCall();
      });

      // 3. Join the RTC channel
      await this.agoraClient.join(callData.appId, callData.channel, callData.token, callData.uid);

      // 4. Capture & publish microphone (configured to match Agora Conversational AI agent Opus format)
      this.localAudioTrack = await window.AgoraRTC.createMicrophoneAudioTrack({
        AEC: true, // Acoustic Echo Cancellation
        ANS: true, // Automatic Noise Suppression
        encoderConfig: {
          sampleRate: 48000,
          stereo: true,
          bitrate: 128
        }
      });

      await this.agoraClient.publish([this.localAudioTrack]);

      window.companionOrb.setState('listening', 'Crista is listening...');
      if (this.stopSpeechBtn) this.stopSpeechBtn.classList.remove('hidden');

      console.log('[VoiceAssistant] Live full-duplex call running. Speak naturally, interrupt anytime!');
    } catch (err) {
      console.error('[VoiceAssistant] Failed to start Agora call:', err);
      this.stopAgoraCall();
    }
  }

  monitorRemoteAudio(audioTrack) {
    const interval = setInterval(() => {
      if (!this.isCallMode || !this.remoteAudioTrack) {
        clearInterval(interval);
        return;
      }
      try {
        const level = audioTrack.getVolumeLevel();
        if (level > 0.05) {
          window.companionOrb.setState('speaking');
        } else {
          window.companionOrb.setState('listening');
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 120);
  }

  async stopAgoraCall() {
    this.isCallMode = false;
    this.updateCallUI(false);

    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
      } catch (e) {}
      this.localAudioTrack = null;
    }

    if (this.agoraClient) {
      try {
        await this.agoraClient.leave();
      } catch (e) {}
      this.agoraClient = null;
    }

    this.remoteAudioTrack = null;

    try {
      await window.mantisAPI.stopLiveCall();
    } catch (e) {}

    window.companionOrb.setState('idle');
    if (this.stopSpeechBtn) this.stopSpeechBtn.classList.add('hidden');

    // Resume wake-word detection when call ends
    this.initWakeWord();
    console.log('[VoiceAssistant] Live call ended. Crista is in standby.');
  }

  updateCallUI(active) {
    [this.btnCallMode, this.orbCallBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('active', active);
      btn.setAttribute('title', active ? 'End Live Call' : 'Start Live Voice Call (Full-Duplex Human Conversation)');
    });

    [this.orbMicBtn, this.mainMicBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('recording', active);
    });
  }

  // =========================================================================
  // =========================================================================
  // 2. HANDS-FREE "HEY CRISTA" WAKE WORD DETECTION
  // =========================================================================

  initWakeWord() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (this.wakeWordRecognizer) {
        this.wakeWordRecognizer.stop();
      }

      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';

      recognizer.onresult = (event) => {
        if (this.isCallMode || this.isRecording) return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const raw = (event.results[i][0].transcript || '').trim();
          const text = raw.toLowerCase();

          const isWake = text.includes('hey crista') || text.includes('crista') || text.includes('wake up') || text.includes('listen crista') || text.includes('hey mantis');

          if (isWake) {
            console.log('[VoiceAssistant] Wake phrase detected:', raw);

            if (text.includes('call') || text.includes('phone')) {
              this.startAgoraCall();
              break;
            }

            if (event.results[i].isFinal) {
              const cleanPrompt = raw.replace(/^(?:hey\s+)?(?:crista|mantis)[,\s]*/i, '').trim();
              if (window.chatManager) {
                window.chatManager.sendPrompt(cleanPrompt || 'Hey Crista');
              }
              break;
            } else if (/^(?:hey\s+)?(?:crista|mantis)[!\.\s]*$/i.test(text)) {
              if (window.chatManager) {
                window.chatManager.sendPrompt('Hey Crista');
              }
              break;
            }
          }
        }
      };

      recognizer.onend = () => {
        if (!this.isCallMode && !this.isRecording) {
          setTimeout(() => {
            try { recognizer.start(); } catch (e) {}
          }, 600);
        }
      };

      recognizer.onerror = (e) => {
        if (e.error !== 'no-speech') {
          console.warn('[WakeWord] Recognizer note:', e.error);
        }
      };

      recognizer.start();
      this.wakeWordRecognizer = recognizer;
      console.log('[VoiceAssistant] Hands-Free "Hey Crista" wake word is active.');
    } catch (err) {
      console.warn('[WakeWord] Init note:', err.message);
    }
  }

  stopWakeWord() {
    if (this.wakeWordRecognizer) {
      try {
        this.wakeWordRecognizer.stop();
      } catch (e) {}
      this.wakeWordRecognizer = null;
    }
  }

  // =========================================================================
  // 3. FAST PUSH-TO-TALK & NEURAL VOICE
  // =========================================================================

  async startListening() {
    this.stopSpeaking();
    this.stopWakeWord();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const directRecognizer = new SpeechRecognition();
        directRecognizer.continuous = false;
        directRecognizer.interimResults = false;
        directRecognizer.lang = this.preferredLanguage || 'en-US';

        this.isRecording = true;
        this.updateMicVisuals(true);
        window.companionOrb.setState('listening');

        directRecognizer.onresult = (event) => {
          const transcript = (event.results[0][0].transcript || '').trim();
          this.isRecording = false;
          this.updateMicVisuals(false);
          window.companionOrb.setState('idle');
          if (transcript && window.chatManager) {
            window.chatManager.sendPrompt(transcript);
          }
        };

        directRecognizer.onerror = (err) => {
          console.warn('[VoiceAssistant] Direct recognizer note:', err?.error, '— falling back to MediaRecorder');
          this.isRecording = false;
          this.startMediaRecorderListening();
        };

        directRecognizer.onend = () => {
          if (!this.isRecording) {
            this.updateMicVisuals(false);
            window.companionOrb.setState('idle');
            this.initWakeWord();
          }
        };

        directRecognizer.start();
        return;
      } catch (e) {
        console.warn('[VoiceAssistant] Direct recognizer init failed:', e);
      }
    }

    return this.startMediaRecorderListening();
  }

  async startMediaRecorderListening() {
    this.userHasSpoken = false;
    this.silenceStartTime = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.activeStream = stream;
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanupVAD();

        if (this.activeStream) {
          this.activeStream.getTracks().forEach(track => track.stop());
          this.activeStream = null;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result.split(',')[1];
          if (window.chatManager && base64Audio && this.userHasSpoken) {
            window.chatManager.handleUserAudioInput(base64Audio);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.updateMicVisuals(true);
      window.companionOrb.setState('listening');
      this.startVAD(stream);
    } catch (err) {
      console.warn('[VoiceAssistant] Microphone error:', err.message);
      this.isRecording = false;
      this.updateMicVisuals(false);
      window.companionOrb.setState('idle');
      this.initWakeWord();
    }
  }

  startVAD(stream) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const SPEECH_ENERGY_THRESHOLD = 16;
      const SILENCE_DURATION_MS = 1000;

      const checkEnergy = () => {
        if (!this.isRecording || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;

        if (avg > SPEECH_ENERGY_THRESHOLD) {
          this.userHasSpoken = true;
          this.silenceStartTime = null;
          window.companionOrb.setState('listening');
        } else if (this.userHasSpoken) {
          if (!this.silenceStartTime) {
            this.silenceStartTime = Date.now();
          } else if (Date.now() - this.silenceStartTime >= SILENCE_DURATION_MS) {
            this.stopListening();
            return;
          }
        }
        this.vadAnimFrame = requestAnimationFrame(checkEnergy);
      };

      this.vadAnimFrame = requestAnimationFrame(checkEnergy);
    } catch (e) {}
  }

  cleanupVAD() {
    if (this.vadAnimFrame) {
      cancelAnimationFrame(this.vadAnimFrame);
      this.vadAnimFrame = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
    }
    this.audioContext = null;
    this.analyser = null;
  }

  stopListening() {
    if (this.mediaRecorder && this.isRecording) {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    this.isRecording = false;
    this.updateMicVisuals(false);
    window.companionOrb.setState('idle');
  }

  updateMicVisuals(recording) {
    [this.orbMicBtn, this.mainMicBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('recording', recording);
    });
  }

  async speak(text, lang = null, customVoice = null) {
    // If in live Agora call, the agent speaks directly through WebRTC
    if (this.isCallMode) return;

    this.stopSpeaking();
    const targetLang = lang || this.preferredLanguage;
    const voiceToUse = customVoice || this.preferredVoice || 'en-US-BrianMultilingualNeural';

    if (window.mantisAPI && window.mantisAPI.speakNeural) {
      try {
        window.companionOrb.setState('speaking');
        if (this.stopSpeechBtn) this.stopSpeechBtn.classList.remove('hidden');

        const base64Audio = await window.mantisAPI.speakNeural(text, targetLang, voiceToUse);
        if (base64Audio) {
          const audio = new Audio('data:audio/mp3;base64,' + base64Audio);
          this.currentAudio = audio;

          const onFinished = () => {
            window.companionOrb.setState('idle');
            if (this.stopSpeechBtn) this.stopSpeechBtn.classList.add('hidden');
            this.currentAudio = null;
          };

          audio.onended = onFinished;
          audio.onerror = onFinished;
          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('[VoiceAssistant] Speech error:', err);
      }
    }
  }

  stopSpeaking() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    window.companionOrb.setState('idle');
    if (this.stopSpeechBtn) this.stopSpeechBtn.classList.add('hidden');
  }
}

window.voiceAssistant = new VoiceAssistant();
