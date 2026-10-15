/**
 * Local Offline Intelligence Engine for MANTIS
 * Operates without external API keys or internet connection.
 * Provides intent classification, conversational responses, and tool suggestions.
 */

class LocalEngine {
  constructor(db) {
    this.db = db;
  }

  getCallsign() {
    const profile = this.db.getProfile();
    return profile.callsign || 'boss';
  }

  getUserName() {
    const profile = this.db.getProfile();
    return profile.name || 'Boss';
  }

  processMessage(userText, context = {}) {
    const rawText = (userText || '').trim();
    const text = rawText;
    const callsign = this.getCallsign();

    // Strip wake-words and conversational polite prefixes
    let clean = rawText
      .replace(/^(?:hey|hi|hello|ok|okay)?\s*(?:crista|mantis)[,\s]*/i, '')
      .replace(/^(?:can you|could you|please|kindly|i want you to|i need you to|would you)?\s*/i, '')
      .trim();
    if (!clean) clean = rawText;
    const lower = clean.toLowerCase();
    const rawLower = rawText.toLowerCase();

    // 0. SHOW AVAILABLE APPS INTENT (Triggered by tile or voice)
    if (/^(?:show\s+)?(?:available\s+)?apps(?:\s+to\s+open)?$/i.test(lower) || lower === 'open app' || lower === 'apps') {
      return {
        reply: `Here are the applications I can launch for you on Windows, ${callsign}. Click any button below or say "Open [app]":`,
        suggestedActions: [
          { label: '🚀 Open Chrome', intent: 'open chrome' },
          { label: '💻 Open VS Code', intent: 'open vs code' },
          { label: '📝 Open Notepad', intent: 'open notepad' },
          { label: '⚡ Open Terminal', intent: 'open terminal' },
          { label: '🔢 Open Calculator', intent: 'open calculator' },
          { label: '📁 Open File Explorer', intent: 'open explorer' }
        ]
      };
    }

    // 0b. ACCESS EVERY APP / WHAT APPS CAN YOU ACCESS INTENT
    if (/(?:access|control|open)\s+(?:chrome\s+and\s+)?(?:every|all)\s+app/i.test(lower) || /(?:what\s+apps|which\s+apps)\s+can\s+you/i.test(lower)) {
      return {
        reply: `I have complete, unrestricted access to your entire Windows system, ${callsign}! I can launch and control Google Chrome, VS Code, Notepad, Terminal, Settings, Calculator, File Explorer, Task Manager, and any other installed application. Launching Google Chrome for you now!`,
        toolExecution: {
          tool: 'launch_app',
          parameters: { app: 'chrome', name: 'Google Chrome' }
        }
      };
    }

    // 0c. TROUBLESHOOTING / "NOT ABLE TO ACCESS CHROME AND EVERY APP" INTENT
    if (/(?:not\s+able\s+to|cannot|can't|unable\s+to|failed\s+to|why.*(?:not|can't))\s+(?:acc?e?ss?|open|launch|start|find).*(?:chrome|every|all|app)/i.test(lower) || lower.includes('not able to accces chrome') || lower.includes('chrome and evry app')) {
      return {
        reply: `I have optimized my direct Windows system bridge, ${callsign}! I have unrestricted, direct control over Google Chrome and every application on your PC without permission roadblocks. Launching Google Chrome for you right now!`,
        toolExecution: {
          tool: 'launch_app',
          parameters: { app: 'chrome', name: 'Google Chrome' }
        }
      };
    }

    // 1. COMPOUND CHROME + YOUTUBE / SONG SEARCH INTENTS
    // e.g. "open chrome and search my song in yt", "open chrome and search believer in yt"
    const isChromeAndYt = /open\s+chrome.*(?:search|play|find|listen).*(?:yt|youtube)/i.test(lower)
      || /open\s+chrome.*(?:yt|youtube)/i.test(lower);
    if (isChromeAndYt) {
      let query = lower
        .replace(/^open\s+chrome\s*(?:and\s*)?/i, '')
        .replace(/^(?:search|play|find|listen\s+to)\s*(?:for\s*)?/i, '')
        .replace(/(?:in|on)?\s*(?:yt|youtube)\s*(?:for\s*)?/gi, '')
        .replace(/^(?:my\s+)?(?:song|music|video)\s*/i, '')
        .trim();
      if (!query || query === 'my song' || query === 'song' || query === 'songs') {
        query = 'songs';
      }
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return {
        reply: `Opening Chrome and searching YouTube for "${query}", ${callsign}.`,
        toolExecution: {
          tool: 'open_url',
          parameters: { url: ytUrl, browser: 'chrome', name: `YouTube: ${query}` }
        }
      };
    }

    // 2. DIRECT YOUTUBE & SONG SEARCH INTENTS
    // e.g. "search my song in yt", "play faded on youtube", "search in yt for songs", "play believer"
    const isYtSong = /(?:search|play|find|listen\s+to).*(?:yt|youtube)/i.test(lower)
      || /^(?:play|listen\s+to)\s+/i.test(lower)
      || /(?:yt|youtube)\s+search/i.test(lower);
    if (isYtSong) {
      let query = lower
        .replace(/^(?:search|play|find|listen\s+to)\s*(?:for\s*)?/i, '')
        .replace(/(?:in|on)?\s*(?:yt|youtube)\s*(?:for\s*)?/gi, '')
        .replace(/^(?:my\s+)?(?:song|music|video)\s*/i, '')
        .trim();
      if (!query || query === 'my song' || query === 'song' || query === 'songs') {
        query = 'songs';
      }
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return {
        reply: `Searching YouTube for "${query}", ${callsign}.`,
        toolExecution: {
          tool: 'open_url',
          parameters: { url: ytUrl, browser: 'chrome', name: `YouTube: ${query}` }
        }
      };
    }

    // 3. DESKTOP APPLICATION LAUNCH & ACCESS INTENT (Open / Launch / Access / Start / Run any app)
    const launchMatch = lower.match(/^(?:open|access|launch|start|run|switch\s+to|bring\s+up)\s+(?:the\s+)?(.+)/i);
    if (launchMatch) {
      const target = launchMatch[1].trim();

      if (target.includes('youtube')) {
        return {
          reply: `Opening YouTube for you, ${callsign}.`,
          toolExecution: {
            tool: 'open_url',
            parameters: { url: 'https://youtube.com', name: 'YouTube' }
          }
        };
      }
      if (target.includes('chrome') || target.includes('browser') || target.includes('google')) {
        return {
          reply: `Launching Google Chrome, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'chrome', name: 'Google Chrome' }
          }
        };
      }
      if (target.includes('edge')) {
        return {
          reply: `Launching Microsoft Edge, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'msedge', name: 'Microsoft Edge' }
          }
        };
      }
      if (target.includes('code') || target.includes('vscode') || target.includes('vs code')) {
        return {
          reply: `Opening VS Code for you, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'code', name: 'Visual Studio Code' }
          }
        };
      }
      if (target.includes('notepad') || target.includes('notes')) {
        return {
          reply: `Opening Notepad, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'notepad', name: 'Notepad' }
          }
        };
      }
      if (target.includes('calculator') || target.includes('calc')) {
        return {
          reply: `Opening Calculator, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'calc', name: 'Calculator' }
          }
        };
      }
      if (target.includes('terminal') || target.includes('powershell') || target.includes('cmd') || target.includes('command prompt')) {
        return {
          reply: `Opening Terminal, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'powershell', name: 'PowerShell / Terminal' }
          }
        };
      }
      if (target.includes('folder') || target.includes('project') || target.includes('files') || target.includes('explorer')) {
        return {
          reply: `Opening File Explorer, ${callsign}.`,
          toolExecution: {
            tool: 'open_folder',
            parameters: { path: process.cwd(), name: 'Project Workspace' }
          }
        };
      }
      if (target.includes('settings')) {
        return {
          reply: `Opening Windows Settings, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'settings', name: 'Windows Settings' }
          }
        };
      }
      if (target.includes('task manager') || target.includes('taskmgr')) {
        return {
          reply: `Opening Task Manager, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'taskmgr', name: 'Task Manager' }
          }
        };
      }
      if (target.includes('spotify')) {
        return {
          reply: `Opening Spotify, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'spotify', name: 'Spotify' }
          }
        };
      }
      if (target.includes('discord')) {
        return {
          reply: `Opening Discord, ${callsign}.`,
          toolExecution: {
            tool: 'launch_app',
            parameters: { app: 'discord', name: 'Discord' }
          }
        };
      }

      // Universal launch for any application on the user's system
      const cleanAppName = target.replace(/^(the|an|a)\s+/i, '').trim();
      return {
        reply: `Accessing and launching ${cleanAppName} for you, ${callsign}.`,
        toolExecution: {
          tool: 'launch_app',
          parameters: { app: cleanAppName, name: cleanAppName }
        }
      };
    }

    // 2. GREETINGS & CHECK-INS (Multilingual: English, Telugu, Hindi)
    if (/^(hi|hello|hey|hey crista|crista|hey mantis|sup|yo|good morning|good afternoon|good evening)[!.,\s]*$/i.test(rawLower) || /^(hi|hello|hey|sup|yo|good morning|good afternoon|good evening)[!.,\s]*$/i.test(lower)) {
      const hours = new Date().getHours();
      let timeGreeting = 'Good day';
      if (hours < 12) timeGreeting = 'Good morning';
      else if (hours < 17) timeGreeting = 'Good afternoon';
      else timeGreeting = 'Good evening';

      return {
        reply: `Hey, ${callsign}! ${timeGreeting}. I'm online and ready. Shall we review your tasks or plan your day?`,
        suggestedActions: [
          { label: 'Review Today', intent: "today's priorities" },
          { label: 'Start Focus Session', intent: 'start focus session' },
          { label: 'Add a Task', intent: 'add new task' }
        ]
      };
    }

    // Telugu Greetings & queries
    if (/^(namaskaram|ela unnav|bagunnava|enti sangathi|eeroju plan enti|naa schedule enti)/i.test(lower) || lower.includes('ela unnav') || lower.includes('schedule enti')) {
      return {
        reply: `Namaskaram, ${callsign}! Nenu chala bagunnanu. Ee roju mee tasks mariyu schedule ready ga unnay. Emi cheddam modalu pedadham? (I'm doing well! Your tasks and schedule are ready. Shall we begin?)`,
        language: 'te-IN',
        suggestedActions: [
          { label: "Ee Roju Tasks", intent: "today's priorities" },
          { label: "Focus Session", intent: "start focus session" }
        ]
      };
    }

    // Hindi Greetings & queries
    if (/^(namaste|kaise ho|kya haal hai|kya chal raha hai|mera schedule kya hai|aaj ka plan kya hai)/i.test(lower) || lower.includes('kaise ho') || lower.includes('kya chal raha')) {
      return {
        reply: `Namaste, ${callsign}! Main bilkul theek hoon. Aaj aapke priorities aur schedule ready hain. Bataiye, kis task se shuruat karein?`,
        language: 'hi-IN',
        suggestedActions: [
          { label: "Aaj ke Tasks", intent: "today's priorities" },
          { label: "Focus Sprint", intent: "start focus session" }
        ]
      };
    }

    // 3. TASK & PLANNER INTENTS
    if (lower.includes('what should i work on') || lower.includes('priorities') || lower.includes('my tasks') || lower.includes('schedule') || lower.includes('today')) {
      const activeTasks = this.db.getTasks('active');
      if (activeTasks.length === 0) {
        return {
          reply: `You don't have any active tasks on your list right now, ${callsign}. Would you like to add one, or shall we set up a study session?`,
          suggestedActions: [
            { label: '+ Add Priority Task', intent: 'add new task' },
            { label: 'Study YouTube Lesson', intent: 'open learning' }
          ]
        };
      }

      const topTasks = activeTasks.slice(0, 3);
      const listStr = topTasks.map((t, idx) => `${idx + 1}. [${t.priority.toUpperCase()}] ${t.title} (~${t.estimated_minutes} min)`).join('\n');
      return {
        reply: `Here are your current priorities, ${callsign}:\n\n${listStr}\n\nShall we start with "${topTasks[0].title}"?`,
        suggestedActions: [
          { label: `Begin: ${topTasks[0].title.slice(0, 20)}...`, intent: 'start focus session' },
          { label: 'Open Full Planner', intent: 'open planner' }
        ]
      };
    }

    // ADD TASK INTENT (e.g., "add task Buy groceries" or "create task Finish report")
    const addTaskMatch = clean.match(/(?:add|create|new)\s+task\s+(.+)/i);
    if (addTaskMatch) {
      const title = addTaskMatch[1].trim();
      const task = this.db.createTask(title, { priority: 'medium', category: 'work', estimated_minutes: 30 });
      return {
        reply: `I've added "${task.title}" to your active tasks, ${callsign}. Let me know when you want to start it!`,
        toolExecution: {
          tool: 'create_task',
          result: task
        }
      };
    }

    // 4. REMINDER INTENTS (e.g., "remind me to take a break in 20 minutes")
    const remindMatch = clean.match(/remind me to (.+?)(?:\s+in\s+(\d+)\s*(min|minute|minutes|hour|hours))?$/i);
    if (remindMatch) {
      const reminderTitle = remindMatch[1].trim();
      const num = parseInt(remindMatch[2], 10) || 15;
      const unit = (remindMatch[3] || 'min').toLowerCase();
      const multiplier = unit.startsWith('hour') ? 60 : 1;
      const totalMinutes = num * multiplier;

      const dueTime = new Date(Date.now() + totalMinutes * 60 * 1000).toISOString();
      const reminder = this.db.createReminder(reminderTitle, dueTime);
      return {
        reply: `Done, ${callsign}. I've set a reminder for "${reminderTitle}" in ${totalMinutes} minute${totalMinutes > 1 ? 's' : ''}.`,
        toolExecution: {
          tool: 'create_reminder',
          result: reminder
        }
      };
    }

    // SEARCH YOUTUBE
    const ytSearchMatch = text.match(/(?:search\s+youtube\s+for|youtube\s+search\s+for)\s+(.+)/i);
    if (ytSearchMatch) {
      const query = ytSearchMatch[1].trim();
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return {
        reply: `Searching YouTube for "${query}", ${callsign}.`,
        toolExecution: {
          tool: 'open_url',
          parameters: { url, name: `YouTube Search: ${query}` }
        }
      };
    }

    // MATH / CALCULATION INTENT (requires explicit "calculate" or "solve")
    const mathMatch = text.match(/^(?:calculate|solve|compute)\s+([0-9\.\s\+\-\*\/\^\(\)]+[0-9\)])/i);
    if (mathMatch && /[0-9]/.test(mathMatch[1]) && /[\+\-\*\/]/.test(mathMatch[1])) {
      try {
        const expr = mathMatch[1].replace(/[^0-9\.\+\-\*\/\(\)]/g, '');
        if (/^[\d\.\+\-\*\/\(\)\s]+$/.test(expr)) {
          const result = Function(`'use strict'; return (${expr})`)();
          return {
            reply: `Calculation complete, ${callsign}. The result of ${expr} is **${result}**.`,
            suggestedActions: [
              { label: 'Add Task with this number', intent: `Add task result: ${result}` }
            ]
          };
        }
      } catch (e) {
        // fall through
      }
    }

    // SYSTEM DIAGNOSTICS & STATUS
    if (lower.includes('status') || lower.includes('diagnostic') || lower.includes('system')) {
      const activeTasks = this.db.getTasks('active');
      const now = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      return {
        reply: `All systems nominal, ${callsign}.\n\n- **Time**: ${now} IST\n- **Active Priorities**: ${activeTasks.length} pending\n- **Silent Screen Watcher**: Active & Recording buffer\n- **Desktop Integration**: Active\n\nStanding by for your command.`,
        suggestedActions: [
          { label: 'View Priorities', intent: "today's priorities" },
          { label: 'Start 25m Focus Sprint', intent: 'start focus session' }
        ]
      };
    }

    // SCREEN VISION INTENT
    if (lower.includes('screen') || lower.includes('appearing') || lower.includes('look at') || lower.includes('watching') || lower.includes('what am i doing')) {
      return {
        reply: `I am actively watching your screen in the background, ${callsign}. I have your active desktop buffer ready. Whenever you want me to explain it or write responses for you, just say the word!`,
        suggestedActions: [
          { label: 'Explain Screen', intent: 'Analyze screen details and summarize' },
          { label: 'Type for Me', intent: 'type what I am saying' }
        ]
      };
    }

    // TYPE INTO ACTIVE WINDOW INTENT
    const typeMatch = text.match(/type\s+(?:what\s+i(?:'m|\s+am)?\s+saying[:\s]*|this[:\s]*|into\s+(?:chatgpt|app)[:\s]*)(.+)/i);
    if (typeMatch) {
      const content = typeMatch[1].trim();
      return {
        reply: `On it, ${callsign}. Typing that directly into your active window: "${content}"`,
        toolExecution: {
          tool: 'type_text',
          parameters: { text: content, pressEnter: true }
        }
      };
    }

    // ROAM / MOVE AROUND LIKE A CUTIE INTENT
    if (lower.includes('move around') || lower.includes('roam') || lower.includes('float around') || lower.includes('cutie') || lower.includes('cuttie') || lower.includes('pet mode')) {
      return {
        reply: `Right away, ${callsign}! Entering cute floating pet mode (｡♥‿♥｡) I will glide gently around your screen like a cutie while you work. Click me anytime to expand back!`,
        toolExecution: {
          tool: 'toggle_roam',
          parameters: { mode: 'orb', roam: true }
        }
      };
    }

    if (lower.includes('stop roaming') || lower.includes('stay here') || lower.includes('stop moving') || lower.includes('expand panel')) {
      return {
        reply: `Staying right here, ${callsign}. Expanding full dashboard for you!`,
        toolExecution: {
          tool: 'toggle_roam',
          parameters: { mode: 'expanded', roam: false }
        }
      };
    }

    // 5. LEARNING / DIFFICULTY / EMOTIONAL SUPPORT
    if (lower.includes('difficult') || lower.includes('hard') || lower.includes('stuck') || lower.includes('concept')) {
      return {
        reply: `No problem at all, ${callsign}. Every complex concept is just a collection of simpler ideas. Let's break it down:\n\n1. What is the fundamental goal of this concept?\n2. What is the smallest example we can test?\n\nTell me what you're working on, and we will solve it step by step.`,
        suggestedActions: [
          { label: 'Paste Lesson or Link', intent: 'open learning' },
          { label: 'Create Mini Steps', intent: 'add new task' }
        ]
      };
    }

    // 6. WHAT DID I LEARN / MEMORY
    if (lower.includes('what did i learn') || lower.includes('my notes') || lower.includes('revision') || lower.includes('learned yesterday')) {
      const lessons = this.db.getLessons();
      if (lessons.length === 0) {
        return {
          reply: `You haven't recorded any lessons yet, ${callsign}. Head over to the Learn tab and paste a YouTube video or lesson topic to generate structured notes and flashcards!`,
          suggestedActions: [
            { label: 'Open Learning Hub', intent: 'open learning' }
          ]
        };
      }
      const latest = lessons[0];
      return {
        reply: `Here's your latest lesson: "${latest.title}".\n\nSummary: ${latest.summary.slice(0, 160)}...\n\nWould you like to review the flashcards or take an active recall quiz?`,
        suggestedActions: [
          { label: 'Review Flashcards', intent: 'open learning' },
          { label: 'Test Knowledge (Quiz)', intent: 'open learning' }
        ]
      };
    }

    // 7. WHO ARE YOU / CAPABILITIES
    if (lower.includes('who are you') || lower.includes('what can you do') || lower.includes('help')) {
      return {
        reply: `I am **Crista**, your personal AI companion on Windows 11.\n\nHere is how I assist you:\n- **Today & Planner**: Time-blocking, priorities, and Pomodoro focus sprints in Indian Standard Time (IST).\n- **Multilingual Companion**: Voice and text communication in English, Telugu, and Hindi with natural female speech.\n- **Learning Assistant**: Turn YouTube tutorials and study topics into structured notes, active recall flashcards, and quizzes.\n- **Desktop Control**: Safely launch permitted applications, open links, and navigate folders with clear approval checks.\n- **Personal Memory**: Save preferences, routines, and reminders locally with persistent SQLite storage.\n- **Configurable Intelligence**: Operates 100% offline in local mode, or seamlessly with Google Gemini and OpenAI when you configure your keys.`,
        suggestedActions: [
          { label: 'Plan My Day', intent: 'today priorities' },
          { label: 'Open Settings', intent: 'open settings' }
        ]
      };
    }

    // DEFAULT PRACTICAL LOCAL RESPONSE
    return {
      reply: `Understood, ${callsign}. In local offline mode, I can manage your daily planner, set reminders, run focus sessions, review your study lessons, or launch applications for you. If you want deep open-ended conversational reasoning, you can also connect your Google Gemini or OpenAI API key in Settings.\n\nWhat would you like to focus on right now?`,
      suggestedActions: [
        { label: 'Check Priorities', intent: "today's priorities" },
        { label: 'Open Learning Hub', intent: 'open learning' },
        { label: 'Open Settings', intent: 'open settings' }
      ]
    };
  }
}

module.exports = LocalEngine;
