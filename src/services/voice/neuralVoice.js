/**
 * Neural Human Female Voice Service for CRISTA
 * Generates natural, human conversational female speech.
 * Zero robotic artifacts, warm intonation, realistic breathing.
 */

const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

class NeuralVoiceService {
  constructor() {
    this.tts = new MsEdgeTTS();
    // Default: Top-tier natural, conversational female voice
    this.currentVoice = 'en-US-JennyMultilingualNeural';
  }

  setVoice(voiceId) {
    if (voiceId) {
      this.currentVoice = voiceId;
    }
  }

  getVoiceForLang(lang = 'en-IN') {
    const l = (lang || '').toLowerCase();
    if (l.startsWith('te')) {
      return 'te-IN-ShrutiNeural'; // Natural Telugu Female
    }
    if (l.startsWith('hi')) {
      return 'hi-IN-SwaraNeural'; // Natural Hindi Female
    }
    if (l.includes('gb') || l.includes('uk')) {
      return 'en-GB-SoniaNeural'; // Elegant British Female
    }
    return this.currentVoice || 'en-US-JennyMultilingualNeural';
  }

  async generateSpeechBase64(text, lang = 'en-IN', customVoice = null) {
    const cleanText = (text || '')
      .replace(/[*#`_~\[\]\(\)\{\}\<\>]/g, ' ')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/```[\s\S]*?```/g, 'here is the code block')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return null;

    const voice = customVoice || this.getVoiceForLang(lang);

    try {
      await this.tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = this.tts.toStream(cleanText);

      return new Promise((resolve, reject) => {
        const chunks = [];
        audioStream.on('data', chunk => chunks.push(chunk));
        audioStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('base64'));
        });
        audioStream.on('error', err => reject(err));
      });
    } catch (err) {
      console.warn('[CristaVoice] Error generating speech:', err.message);
      return null;
    }
  }
}

module.exports = NeuralVoiceService;
