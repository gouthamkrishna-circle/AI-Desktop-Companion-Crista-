/**
 * Mantis Desktop Tools & Action Audit History
 * Safely launches allowlisted applications and audits executed operations.
 */

class AutomationManager {
  constructor() {
    this.historyList = document.getElementById('action-history-list');
    this.toolTiles = document.querySelectorAll('.tool-tile');

    this.bindEvents();
    this.loadHistory();
  }

  bindEvents() {
    this.toolTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        const appKey = tile.dataset.app;
        if (appKey === 'explorer') {
          this.openProjectFolder();
        } else {
          this.launchApp(appKey);
        }
      });
    });
  }

  async launchApp(appKey) {
    try {
      const res = await window.mantisAPI.launchApp(appKey, false);
      if (res.requiresApproval) {
        if (confirm(`${res.message}\nDo you authorize Mantis to proceed?`)) {
          await window.mantisAPI.launchApp(appKey, true);
        }
      }
      this.loadHistory();
    } catch (err) {
      alert(`Launch error: ${err.message}`);
      this.loadHistory();
    }
  }

  async openProjectFolder() {
    try {
      await window.mantisAPI.openFolder('.');
      this.loadHistory();
    } catch (err) {
      alert(`Error opening folder: ${err.message}`);
    }
  }

  async loadHistory() {
    try {
      const history = await window.mantisAPI.getActionHistory();
      if (!this.historyList) return;
      this.historyList.innerHTML = '';

      if (history.length === 0) {
        this.historyList.innerHTML = '<div style="color:var(--text-dim); font-size:11.5px; padding:8px;">No desktop actions logged yet.</div>';
        return;
      }

      history.slice(0, 15).forEach(item => {
        const row = document.createElement('div');
        row.className = 'history-item';

        const left = document.createElement('div');
        left.innerHTML = `<strong>${item.tool_name}</strong> <span style="color:var(--text-dim); margin-left:6px;">${new Date(item.executed_at).toLocaleTimeString()}</span>`;

        const statusBadge = document.createElement('span');
        statusBadge.style.fontWeight = '600';
        statusBadge.style.fontSize = '10px';
        statusBadge.style.textTransform = 'uppercase';
        statusBadge.style.color = item.status === 'success' ? 'var(--success)' : (item.status === 'denied' ? 'var(--warning)' : 'var(--danger)');
        statusBadge.textContent = item.status;

        row.appendChild(left);
        row.appendChild(statusBadge);
        this.historyList.appendChild(row);
      });
    } catch (err) {
      console.warn('[AutomationManager] Error loading history:', err);
    }
  }
}

window.automationManager = new AutomationManager();
