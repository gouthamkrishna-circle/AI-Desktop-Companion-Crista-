/**
 * Proactive Suggestions Engine for MANTIS
 * Periodically offers gentle, contextual suggestions based on active tasks and focus state.
 * Fully configurable: Pause, Focus Mode, Do Not Disturb, and frequency settings.
 */

class ProactiveEngine {
  constructor(db, onSuggestion = null) {
    this.db = db;
    this.onSuggestion = onSuggestion;
    this.timer = null;
    this.isPaused = false;
    this.isFocusMode = false;
    this.isDnd = false;
  }

  start() {
    this.scheduleNextCheck();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  setPaused(paused) {
    this.isPaused = !!paused;
    console.log(`[ProactiveEngine] Suggestions paused: ${this.isPaused}`);
  }

  setFocusMode(enabled) {
    this.isFocusMode = !!enabled;
    console.log(`[ProactiveEngine] Focus mode: ${this.isFocusMode}`);
  }

  setDnd(enabled) {
    this.isDnd = !!enabled;
    console.log(`[ProactiveEngine] Do Not Disturb: ${this.isDnd}`);
  }

  scheduleNextCheck() {
    const profile = this.db.getProfile();
    const intervalMin = profile.proactive_interval_min || 45;
    // Check every 30 minutes in normal operation
    const delayMs = intervalMin * 60 * 1000;

    this.timer = setTimeout(() => {
      this.evaluateSuggestions();
      this.scheduleNextCheck();
    }, delayMs);
  }

  evaluateSuggestions() {
    const profile = this.db.getProfile();
    if (!profile.proactive_enabled || this.isPaused || this.isFocusMode || this.isDnd) {
      return;
    }

    const callsign = profile.callsign || 'boss';
    const activeTasks = this.db.getTasks('active');

    let suggestion = null;

    if (activeTasks.length > 0) {
      const topTask = activeTasks[0];
      suggestion = {
        title: `Priority Check-in`,
        message: `${callsign}, would you like to start a focused 25-minute sprint on "${topTask.title}"?`,
        actions: [
          { label: 'Start 25m Focus', action: 'start_focus' },
          { label: 'Snooze 30m', action: 'snooze_proactive' }
        ]
      };
    } else {
      suggestion = {
        title: `Plan & Learning Check-in`,
        message: `${callsign}, your priority list is clear. Shall we add your next goal or study a lesson?`,
        actions: [
          { label: 'Open Planner', action: 'open_planner' },
          { label: 'Study Lesson', action: 'open_learning' }
        ]
      };
    }

    if (suggestion && typeof this.onSuggestion === 'function') {
      this.onSuggestion(suggestion);
    }
  }
}

module.exports = ProactiveEngine;
