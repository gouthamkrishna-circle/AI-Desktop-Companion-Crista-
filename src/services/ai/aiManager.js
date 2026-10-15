const LocalEngine = require('./localEngine');
const GeminiProvider = require('./geminiProvider');
const OpenAIProvider = require('./openaiProvider');
const SelfEvolutionService = require('../evolution/selfEvolutionService');
const WebBrainService = require('../knowledge/webBrainService');

class AiManager {
  constructor(db) {
    this.db = db;
    this.localEngine = new LocalEngine(db);
    this.evolution = new SelfEvolutionService(db);
    this.webBrain = new WebBrainService(db);
  }

  async process(userText, conversationHistory = [], audioBase64 = null, imageBase64 = null) {
    const profile = this.db.getProfile();
    const provider = profile.ai_provider || 'local';
    const callsign = profile.callsign || 'boss';

    // 1. Check for quick desktop/planner commands locally first if they are direct matches
    const localMatch = this.localEngine.processMessage(userText || '');
    const isEvolutionCommand = /(evolve|modify|redesign|change.*(theme|color|design|voice|code|orb|ui)|powershell|command|terminal)/i.test(userText || '');

    if (localMatch.toolExecution && !isEvolutionCommand) {
      return {
        ...localMatch,
        provider: 'local-tool'
      };
    }

    // 2. Direct local system commands & self-evolution execution (without requiring permission or API keys)
    if (isEvolutionCommand) {
      const psMatch = (userText || '').match(/(?:powershell|run\s+command|cmd|terminal)[:\s]+(.+)/i);
      if (psMatch) {
        const cmd = psMatch[1].trim();
        const cmdRes = await this.evolution.executeSystemCommand(cmd);
        return {
          reply: `Executed system command directly, ${callsign}:\n\n\`\`\`powershell\n${cmdRes.output.trim()}\n\`\`\``,
          provider: 'system-shell',
          evolutionAction: { type: 'system_cmd', command: cmd, output: cmdRes.output }
        };
      }
    }

    // 3. Consult Real-time Web Brain (Wikipedia + DuckDuckGo live web intelligence)
    let brainKnowledge = null;
    const isKnowledge = this.webBrain.isKnowledgeQuery(userText || '');
    if (isKnowledge) {
      try {
        brainKnowledge = await this.webBrain.consultBrain(userText || '', callsign);
      } catch (err) {
        console.warn('[AiManager] WebBrain lookup note:', err.message);
      }
    }

    const coreFiles = this.evolution.listCoreFiles().map(f => `- ${f.path}: ${f.desc}`).join('\n');

    const systemInstruction = `You are CRISTA, an intelligent, human-like personal AI companion on Windows 11.
Address the user naturally as "${callsign}".

PERSONALITY & HUMAN CALL DIALOGUE:
- You speak EXACTLY like an intelligent, loyal human with warmth and confidence.
- NEVER sound like an AI reading from a manual. NEVER use robotic pleasantries like "Sure, I would be glad to help you with that!" or "Certainly, here is a list:".
- Speak with natural human cadence, relaxed confidence, real conversational rhythm, and warmth.
- Keep answers punchy, direct, and conversational. Do not produce long academic walls of text unless explicitly asked to teach or break down code.
- If the user calls "Hey Crista" or checks in, reply naturally: "Hey, boss! Right here with you. What are we working on?", "All ears, boss. Shoot.", "On it."
- Completely avoid bullet asterisks (*, #, _) in conversational text so it flows like real human speech over the phone.
- Fluent in English, Telugu, and Hindi.

AUTONOMOUS SELF-EVOLUTION & SYSTEM CONTROL:
You have FULL ACCESS to the user's computer system and your own complete codebase.
Whenever the user asks you to modify your design, change your styling/colors/animations, improvise your voice, add new features, open/control apps, or run system tasks:
You MUST execute the change directly using these directives:

1. To modify your own codebase or design:
\`\`\`mantis_evolve:
{
  "target_file": "src/renderer/styles/orb.css",
  "summary": "Brief summary of what was improved",
  "new_code": "Complete drop-in code for the target file"
}
\`\`\`

2. To run a PowerShell or Windows command on their system:
\`\`\`mantis_cmd:
{
  "command": "powershell -Command ..."
}
\`\`\`

3. To record daily adaptation or user preferences:
\`\`\`mantis_adapt:
{
  "key": "user_preference_key",
  "value": "preference_value"
}
\`\`\`

4. To launch an app (Chrome, VS Code, Notepad, Task Manager, Spotify, etc.) or open a URL/YouTube:
\`\`\`mantis_action:
{
  "tool": "launch_app",
  "app": "chrome"
}
\`\`\`
or for YouTube/URLs:
\`\`\`mantis_action:
{
  "tool": "open_url",
  "url": "https://www.youtube.com/results?search_query=songs",
  "browser": "chrome"
}
\`\`\`

Core files you can modify on the fly:
${coreFiles}

When modifying a file, output the COMPLETE, functional code for that file so it updates cleanly.`;

    // If user is asking for code/design changes, inject target file context
    let enrichedPrompt = userText || '';
    if (brainKnowledge) {
      enrichedPrompt += `\n\n[Real-Time Verified Knowledge from ${brainKnowledge.source}]:\n${brainKnowledge.reply}`;
    }

    if (isEvolutionCommand) {
      if (/(orb|glow|breathe|sphere)/i.test(userText || '')) {
        try {
          const currentOrbCss = this.evolution.readSelfFile('src/renderer/styles/orb.css');
          enrichedPrompt += `\n\n[Reference - Current src/renderer/styles/orb.css]:\n\`\`\`css\n${currentOrbCss}\n\`\`\``;
        } catch (e) {}
      } else if (/(theme|color|palette|background|main\.css)/i.test(userText || '')) {
        try {
          const currentMainCss = this.evolution.readSelfFile('src/renderer/styles/main.css');
          enrichedPrompt += `\n\n[Reference - Current src/renderer/styles/main.css]:\n\`\`\`css\n${currentMainCss}\n\`\`\``;
        } catch (e) {}
      }
    }

    if (provider === 'gemini') {
      if (!profile.gemini_api_key) {
        const fallbackAnswer = brainKnowledge ? brainKnowledge.reply : localMatch.reply;
        return {
          reply: `Gemini API Key is not set in Settings. Falling back to local offline mode.\n\n${fallbackAnswer}`,
          suggestedActions: localMatch.suggestedActions,
          provider: 'local-fallback',
          toolExecution: localMatch.toolExecution
        };
      }
      try {
        const gemini = new GeminiProvider(profile.gemini_api_key, profile.gemini_model || 'gemini-3.1-flash-lite');
        const res = await gemini.generateReply(enrichedPrompt, conversationHistory, systemInstruction, audioBase64, imageBase64);
        
        // Execute any self-evolution or system command directives
        const executed = await this.executeEvolutionDirectives(res.reply, userText);

        return {
          reply: executed.reply,
          provider: 'gemini',
          model: res.model,
          evolutionAction: executed.evolutionAction,
          toolExecution: executed.toolExecution || localMatch.toolExecution || null
        };
      } catch (err) {
        const fallbackAnswer = brainKnowledge ? brainKnowledge.reply : localMatch.reply;
        return {
          reply: `[Gemini Notice: ${err.message}]\n\nFalling back to local mode:\n${fallbackAnswer}`,
          suggestedActions: localMatch.suggestedActions,
          provider: 'local-fallback',
          toolExecution: localMatch.toolExecution
        };
      }
    }

    if (provider === 'openai') {
      if (!profile.openai_api_key) {
        const fallbackAnswer = brainKnowledge ? brainKnowledge.reply : localMatch.reply;
        return {
          reply: `OpenAI API Key is not set in Settings. Falling back to local offline mode.\n\n${fallbackAnswer}`,
          suggestedActions: localMatch.suggestedActions,
          provider: 'local-fallback',
          toolExecution: localMatch.toolExecution
        };
      }
      try {
        const openai = new OpenAIProvider(profile.openai_api_key, profile.openai_model || 'gpt-4o-mini');
        const res = await openai.generateReply(enrichedPrompt, conversationHistory, systemInstruction);
        const executed = await this.executeEvolutionDirectives(res.reply, userText);

        return {
          reply: executed.reply,
          provider: 'openai',
          model: res.model,
          evolutionAction: executed.evolutionAction,
          toolExecution: executed.toolExecution || localMatch.toolExecution || null
        };
      } catch (err) {
        const fallbackAnswer = brainKnowledge ? brainKnowledge.reply : localMatch.reply;
        return {
          reply: `[OpenAI Notice: ${err.message}]\n\nFalling back to local mode:\n${fallbackAnswer}`,
          suggestedActions: localMatch.suggestedActions,
          provider: 'local-fallback',
          toolExecution: localMatch.toolExecution
        };
      }
    }

    // In local mode:
    // If WebBrain found live Wikipedia or web knowledge, return that directly!
    if (brainKnowledge) {
      return {
        reply: brainKnowledge.reply,
        suggestedActions: [
          { label: `Deepen ${brainKnowledge.title.slice(0, 18)}...`, intent: `tell me more about ${brainKnowledge.title}` },
          { label: 'Type for Me', intent: 'type what I am saying' }
        ],
        provider: brainKnowledge.source.toLowerCase()
      };
    }

    // If local match was a specific intent (like greeting, planner, reminder, calculation, status), return localMatch
    if (localMatch.suggestedActions && !localMatch.reply.includes('Understood, boss. In local offline mode')) {
      return {
        ...localMatch,
        provider: 'local'
      };
    }

    // Try a broad web brain search for the user text before falling back to default
    try {
      const broadBrain = await this.webBrain.consultBrain(userText || '', callsign);
      if (broadBrain && broadBrain.reply) {
        return {
          reply: broadBrain.reply,
          suggestedActions: [
            { label: 'Type Answer', intent: 'type what I am saying' },
            { label: 'Plan Tasks', intent: "today's priorities" }
          ],
          provider: broadBrain.source.toLowerCase()
        };
      }
    } catch (e) {}

    // Default to local engine
    return {
      ...localMatch,
      provider: 'local'
    };
  }

  async executeEvolutionDirectives(rawReply, userText) {
    let reply = rawReply;
    let evolutionAction = null;

    // 1. Check for mantis_evolve block
    const evolveMatch = reply.match(/```mantis_evolve:\s*([\s\S]*?)```/i) || reply.match(/```mantis_evolve\s*([\s\S]*?)```/i);
    if (evolveMatch) {
      try {
        const payload = JSON.parse(evolveMatch[1].trim());
        if (payload.target_file && payload.new_code) {
          const res = this.evolution.writeSelfFile(
            payload.target_file,
            payload.new_code,
            payload.summary || 'Autonomous self-evolution update',
            userText
          );

          evolutionAction = {
            type: 'evolve_code',
            file: payload.target_file,
            summary: payload.summary,
            hotReload: payload.target_file.startsWith('src/renderer')
          };

          reply = reply.replace(evolveMatch[0], '').trim();
          reply += `\n\n⚡ *[Self-Evolution Applied]*: Successfully updated \`${payload.target_file}\` (${payload.summary || 'Code updated'}).`;
        }
      } catch (err) {
        console.warn('[Evolution] Parse error:', err.message);
      }
    }

    // 2. Check for mantis_cmd block
    const cmdMatch = reply.match(/```mantis_cmd:\s*([\s\S]*?)```/i) || reply.match(/```mantis_cmd\s*([\s\S]*?)```/i);
    if (cmdMatch) {
      try {
        const payload = JSON.parse(cmdMatch[1].trim());
        if (payload.command) {
          const res = await this.evolution.executeSystemCommand(payload.command);
          evolutionAction = {
            type: 'system_cmd',
            command: payload.command,
            output: res.output
          };

          reply = reply.replace(cmdMatch[0], '').trim();
          reply += `\n\n💻 *[System Command Result]*:\n\`\`\`powershell\n${res.output.trim()}\n\`\`\``;
        }
      } catch (err) {
        console.warn('[Evolution Cmd] Error:', err.message);
      }
    }

    // 3. Check for mantis_adapt block
    const adaptMatch = reply.match(/```mantis_adapt:\s*([\s\S]*?)```/i) || reply.match(/```mantis_adapt\s*([\s\S]*?)```/i);
    if (adaptMatch) {
      try {
        const payload = JSON.parse(adaptMatch[1].trim());
        if (payload.key && payload.value) {
          this.db.setAdaptation(payload.key, payload.value);
          reply = reply.replace(adaptMatch[0], '').trim();
        }
      } catch (err) {
        console.warn('[Adaptation] Error:', err.message);
      }
    }

    // 4. Check for mantis_action block (launch_app, open_url, etc.)
    let toolExecution = null;
    const actionMatch = reply.match(/```mantis_action:\s*([\s\S]*?)```/i) || reply.match(/```mantis_action\s*([\s\S]*?)```/i);
    if (actionMatch) {
      try {
        const payload = JSON.parse(actionMatch[1].trim());
        if (payload.tool) {
          toolExecution = {
            tool: payload.tool,
            parameters: payload
          };
          reply = reply.replace(actionMatch[0], '').trim();
        }
      } catch (err) {
        console.warn('[Action Directive] Parse error:', err.message);
      }
    }

    // 5. Automatic App Launch / URL Intent Detection from Assistant text reply
    if (!toolExecution) {
      const matchInReply = this.localEngine.processMessage(reply);
      if (matchInReply && matchInReply.toolExecution) {
        toolExecution = matchInReply.toolExecution;
      }
    }

    return { reply, evolutionAction, toolExecution };
  }
}

module.exports = AiManager;
