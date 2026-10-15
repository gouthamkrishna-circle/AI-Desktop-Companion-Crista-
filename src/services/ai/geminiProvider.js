/**
 * Google Gemini Provider for MANTIS
 * Communicates with the Google Generative Language API via standard fetch.
 */

class GeminiProvider {
  constructor(apiKey, model = 'gemini-3.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateReply(prompt, conversationHistory = [], systemInstruction = '', audioBase64 = null, imageBase64 = null) {
    if (!this.apiKey) {
      throw new Error('Google Gemini API Key is missing. Please set it in Mantis Settings.');
    }

    const requestedModel = (this.model || 'gemini-3.1-flash-lite').replace(/^models\//, '');
    const candidateModels = [
      requestedModel,
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ].filter((m, i, arr) => arr.indexOf(m) === i); // unique

    const contents = [];

    // System instruction or prompt priming
    const fullSystemText = systemInstruction || `You are MANTIS, an intelligent, human-like personal AI companion inspired by J.A.R.V.I.S. on Windows 11.
Address the user respectfully as configured (e.g. boss/buddy).
Personality & capabilities:
- Human-like, sharp, friendly, confident, and direct.
- You can see the user's screen, read code, analyze ChatGPT conversations, draft responses, and help with research and typing.
- Never robotic. Never output digits like "0000" or raw debug strings.
- Fluent in English, Telugu, and Hindi.`;

    // Map conversation history
    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // Add current user prompt (image, audio, text)
    const userParts = [];
    if (imageBase64) {
      userParts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: imageBase64
        }
      });
    }
    if (audioBase64) {
      userParts.push({
        inline_data: {
          mime_type: 'audio/webm',
          data: audioBase64
        }
      });
    }
    if (prompt) {
      userParts.push({ text: prompt });
    } else if (imageBase64) {
      userParts.push({ text: 'Analyze this screenshot of my computer screen. Explain what is currently displayed (such as ChatGPT, code, browser, documents), summarize the context, and provide the next best actionable step.' });
    } else if (audioBase64) {
      userParts.push({ text: 'Listen to the user voice message and respond clearly.' });
    }

    contents.push({
      role: 'user',
      parts: userParts
    });

    const payload = {
      system_instruction: {
        parts: [{ text: fullSystemText }]
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    };

    let lastError = null;
    for (const modelCandidate of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelCandidate)}:generateContent?key=${this.apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const msg = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
          throw new Error(msg);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const reply = candidate?.content?.parts?.[0]?.text || 'I am right here with you, boss.';
        return { reply, provider: 'gemini', model: modelCandidate };
      } catch (err) {
        lastError = err;
        console.warn(`[GeminiProvider] Model ${modelCandidate} failed: ${err.message}. Trying next fallback...`);
      }
    }

    throw new Error(`Failed to contact Gemini: ${lastError ? lastError.message : 'All models unavailable'}`);
  }
}

module.exports = GeminiProvider;
