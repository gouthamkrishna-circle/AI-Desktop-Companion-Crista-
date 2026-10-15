/**
 * OpenAI Provider for MANTIS
 * Communicates with the OpenAI Chat Completions API via standard fetch.
 */

class OpenAIProvider {
  constructor(apiKey, model = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateReply(prompt, conversationHistory = [], systemInstruction = '') {
    if (!this.apiKey) {
      throw new Error('OpenAI API Key is missing. Please set it in Mantis Settings.');
    }

    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const defaultSystem = systemInstruction || `You are MANTIS, a friendly, intelligent, encouraging personal AI desktop companion on Windows 11.
Address the user respectfully as configured (e.g. boss/buddy).
You assist with daily planning, computer tasks, learning, and productivity.
Keep short answers direct and practical, and elaborate clearly when teaching or explaining complex concepts.
Support English, Telugu, and Hindi seamlessly when prompted.`;

    const messages = [{ role: 'system', content: defaultSystem }];

    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    }

    messages.push({ role: 'user', content: prompt });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`OpenAI API Error: ${msg}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'No response generated.';
      return { reply, provider: 'openai', model: this.model };
    } catch (err) {
      throw new Error(`Failed to contact OpenAI: ${err.message}`);
    }
  }
}

module.exports = OpenAIProvider;
