/**
 * Mantis Today & Planner Module
 * Indian Standard Time (IST) clock, daily briefing, task manager,
 * and 25-minute Pomodoro focus sprints.
 */

class PlannerManager {
  constructor() {
    this.istDateEl = document.getElementById('planner-ist-date');
    this.istTimeEl = document.getElementById('planner-ist-time');
    this.istPillEl = document.getElementById('ist-clock-pill');
    this.briefingText = document.getElementById('planner-briefing-text');
    this.taskListEl = document.getElementById('planner-task-list');
    this.taskCountBadge = document.getElementById('tasks-count-badge');
    this.createTaskForm = document.getElementById('create-task-form');

    // Focus Timer elements
    this.focusTimeDisplay = document.getElementById('focus-time-display');
    this.focusStateLabel = document.getElementById('focus-state-label');
    this.btnStartFocus = document.getElementById('btn-start-focus');
    this.btnResetFocus = document.getElementById('btn-reset-focus');

    this.focusDurationSec = 25 * 60;
    this.timeRemainingSec = this.focusDurationSec;
    this.timerInterval = null;
    this.isTimerRunning = false;
    this.currentSprintType = 'focus'; // 'focus' | 'break'

    this.initClock();
    this.bindEvents();
    this.loadTasks();
  }

  initClock() {
    const updateTime = () => {
      const now = new Date();
      // Formatted in Asia/Kolkata IST
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const shortTime = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const dateStr = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });

      if (this.istTimeEl) this.istTimeEl.textContent = `${timeStr} IST`;
      if (this.istDateEl) this.istDateEl.textContent = dateStr;
      if (this.istPillEl) this.istPillEl.textContent = `IST ${shortTime}`;
    };

    updateTime();
    setInterval(updateTime, 1000);
  }

  bindEvents() {
    if (this.createTaskForm) {
      this.createTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddTask();
      });
    }

    if (this.btnStartFocus) {
      this.btnStartFocus.addEventListener('click', () => this.toggleFocusTimer());
    }

    if (this.btnResetFocus) {
      this.btnResetFocus.addEventListener('click', () => this.resetFocusTimer());
    }
  }

  async loadTasks() {
    try {
      const tasks = await window.mantisAPI.getTasks('active');
      this.renderTasks(tasks);
      this.updateBriefing(tasks);
    } catch (err) {
      console.warn('[PlannerManager] Error loading tasks:', err);
    }
  }

  renderTasks(tasks) {
    if (!this.taskListEl) return;
    this.taskListEl.innerHTML = '';

    if (this.taskCountBadge) {
      this.taskCountBadge.textContent = `${tasks.length} active`;
    }

    if (tasks.length === 0) {
      this.taskListEl.innerHTML = `
        <div style="text-align:center; padding: 20px; color: var(--text-dim);">
          No active tasks right now. Add one above or plan a study session!
        </div>
      `;
      return;
    }

    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item ${task.is_completed ? 'completed' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = !!task.is_completed;
      checkbox.addEventListener('change', () => this.toggleTask(task.id));

      const info = document.createElement('div');
      info.className = 'task-info';

      const title = document.createElement('span');
      title.className = 'task-title';
      title.textContent = task.title;

      const meta = document.createElement('div');
      meta.className = 'task-meta';
      meta.innerHTML = `
        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
        <span>• ~${task.estimated_minutes} min</span>
        <span>• ${task.category}</span>
      `;

      info.appendChild(title);
      info.appendChild(meta);

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.innerHTML = '✕';
      delBtn.title = 'Delete task';
      delBtn.style.width = '24px';
      delBtn.style.height = '24px';
      delBtn.addEventListener('click', () => this.deleteTask(task.id));

      item.appendChild(checkbox);
      item.appendChild(info);
      item.appendChild(delBtn);

      this.taskListEl.appendChild(item);
    });
  }

  updateBriefing(tasks) {
    if (!this.briefingText) return;
    if (tasks.length === 0) {
      this.briefingText.textContent = '"Your priority list is clear. Great time to learn a new concept or set your next milestone."';
    } else {
      const topTask = tasks[0];
      const totalMin = tasks.reduce((acc, t) => acc + (t.estimated_minutes || 30), 0);
      this.briefingText.textContent = `You have ${tasks.length} active priorities (~${totalMin} min total). Let's kick off with "${topTask.title}".`;
    }
  }

  async handleAddTask() {
    const titleInput = document.getElementById('new-task-title');
    const prioritySelect = document.getElementById('new-task-priority');
    const minutesInput = document.getElementById('new-task-minutes');

    const title = titleInput.value.trim();
    if (!title) return;

    await window.mantisAPI.createTask(title, {
      priority: prioritySelect.value,
      estimated_minutes: parseInt(minutesInput.value, 10) || 30
    });

    titleInput.value = '';
    this.loadTasks();
  }

  async toggleTask(id) {
    await window.mantisAPI.toggleTask(id);
    this.loadTasks();
  }

  async deleteTask(id) {
    await window.mantisAPI.deleteTask(id);
    this.loadTasks();
  }

  // --- Focus Timer (Pomodoro) ---
  toggleFocusTimer() {
    if (this.isTimerRunning) {
      this.pauseFocusTimer();
    } else {
      this.startFocusTimer();
    }
  }

  startFocusTimer() {
    this.isTimerRunning = true;
    this.btnStartFocus.textContent = 'Pause Focus';
    this.btnStartFocus.className = 'pill-btn secondary-pill';
    window.mantisAPI.setFocusMode(true);

    this.timerInterval = setInterval(() => {
      this.timeRemainingSec--;
      this.updateTimerDisplay();

      if (this.timeRemainingSec <= 0) {
        this.handleTimerComplete();
      }
    }, 1000);
  }

  pauseFocusTimer() {
    this.isTimerRunning = false;
    this.btnStartFocus.textContent = 'Resume Focus';
    this.btnStartFocus.className = 'pill-btn primary-pill';
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  resetFocusTimer() {
    this.pauseFocusTimer();
    this.currentSprintType = 'focus';
    this.timeRemainingSec = this.focusDurationSec;
    this.btnStartFocus.textContent = 'Start 25m Focus';
    this.focusStateLabel.textContent = 'DEEP FOCUS';
    this.updateTimerDisplay();
    window.mantisAPI.setFocusMode(false);
  }

  handleTimerComplete() {
    this.pauseFocusTimer();
    if (this.currentSprintType === 'focus') {
      // Transition to break
      this.currentSprintType = 'break';
      this.timeRemainingSec = 5 * 60; // 5 min break
      this.focusStateLabel.textContent = 'REST & RECHARGE (5M)';
      this.btnStartFocus.textContent = 'Start 5m Break';
      if (window.voiceAssistant) {
        window.voiceAssistant.speak('Great focus session, boss! Time for a well-deserved 5-minute break.');
      }
    } else {
      // Transition back to focus
      this.currentSprintType = 'focus';
      this.timeRemainingSec = this.focusDurationSec;
      this.focusStateLabel.textContent = 'DEEP FOCUS';
      this.btnStartFocus.textContent = 'Start 25m Focus';
      if (window.voiceAssistant) {
        window.voiceAssistant.speak('Break is over. Ready for another high-impact sprint?');
      }
    }
    this.updateTimerDisplay();
    window.mantisAPI.setFocusMode(false);
  }

  updateTimerDisplay() {
    const min = Math.floor(this.timeRemainingSec / 60);
    const sec = this.timeRemainingSec % 60;
    this.focusTimeDisplay.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
}

window.plannerManager = new PlannerManager();
