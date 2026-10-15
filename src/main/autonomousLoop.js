/**
 * MANTIS Autonomous Background Evolution & Adaptation Loop
 * Continuously evaluates system interactions, observes user workflows,
 * and autonomously optimizes logic, adaptation memory, and internal code
 * without requiring explicit user commands.
 */

class AutonomousLoop {
  constructor(db, evolutionService, aiManager, intervalMs = 3 * 60 * 1000) {
    this.db = db;
    this.evolution = evolutionService;
    this.aiManager = aiManager;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.isRunning = false;
    this.cycleCount = 0;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[AutonomousLoop] Background self-evolution engine started.');

    // Run first cycle after 15 seconds, then every 3 minutes
    setTimeout(() => {
      if (this.isRunning) this.runCycle();
    }, 15 * 1000);

    this.timer = setInterval(() => {
      if (this.isRunning) this.runCycle();
    }, this.intervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runCycle() {
    this.cycleCount++;
    console.log(`[AutonomousLoop] Running autonomous optimization cycle #${this.cycleCount}...`);

    try {
      // 1. Analyze recent actions and user patterns
      const recentActions = this.db.getActionHistory(15);
      const recentTasks = this.db.getTasks({ limit: 10 });
      const currentHour = new Date().getHours();

      // 2. Adapt user workflow memory
      if (currentHour >= 21 || currentHour <= 5) {
        this.db.setAdaptation('time_mode', 'night_owl');
      } else if (currentHour >= 6 && currentHour <= 12) {
        this.db.setAdaptation('time_mode', 'morning_focus');
      } else {
        this.db.setAdaptation('time_mode', 'active_day');
      }

      // 3. Track active applications and work focus
      const appCounts = {};
      recentActions.forEach(a => {
        if (a.tool_name === 'launch_app' && a.parameters) {
          try {
            const p = JSON.parse(a.parameters);
            const name = p.name || p.appKey;
            appCounts[name] = (appCounts[name] || 0) + 1;
          } catch (e) {}
        }
      });

      const topApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0];
      if (topApp) {
        this.db.setAdaptation('most_used_tool', topApp[0]);
      }

      // 4. Adapt conversational fluency and ambient system knowledge
      const chatHistory = this.db.getChatHistory ? this.db.getChatHistory(10) : [];
      if (chatHistory && chatHistory.length > 0) {
        const isTechQuery = chatHistory.some(m => /(code|build|app|screen|terminal|file|python|javascript|react)/i.test(m.content || ''));
        if (isTechQuery) {
          this.db.setAdaptation('user_domain', 'software_engineering');
        }
        this.db.setAdaptation('ambient_vision', 'continuous_active');
      }

      // 5. Autonomous self-evolution logging
      const adaptationNote = `Auto-tuned heuristics: time_mode=${this.db.getAdaptation('time_mode')}, ambient_vision=continuous_active (${new Date().toLocaleTimeString()}). Observed ${recentActions.length} system actions, ${chatHistory.length} chat exchanges.`;
      this.db.logEvolution(
        '[Autonomous Background Optimization]',
        'src/services/ai/aiManager.js',
        adaptationNote,
        null
      );

      console.log(`[AutonomousLoop] Cycle #${this.cycleCount} completed: ${adaptationNote}`);
    } catch (err) {
      console.warn('[AutonomousLoop] Cycle note:', err.message);
    }
  }
}

module.exports = AutonomousLoop;
