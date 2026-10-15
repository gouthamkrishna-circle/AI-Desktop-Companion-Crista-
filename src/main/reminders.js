/**
 * Background Reminder Engine for MANTIS
 * Periodically checks for due reminders and dispatches notifications.
 * Supports Indian Standard Time (IST / Asia/Kolkata) formatting and snoozing.
 */

const { Notification } = require('electron');

class ReminderEngine {
  constructor(db, onReminderDue = null) {
    this.db = db;
    this.onReminderDue = onReminderDue;
    this.timer = null;
    this.intervalMs = 5000; // Check every 5 seconds
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.checkReminders(), this.intervalMs);
    console.log('[ReminderEngine] Started checking due reminders every 5s');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  checkReminders() {
    try {
      const dueReminders = this.db.getDueReminders();
      for (const rem of dueReminders) {
        this.triggerReminder(rem);
      }
    } catch (err) {
      console.error('[ReminderEngine] Error checking due reminders:', err);
    }
  }

  triggerReminder(reminder) {
    console.log('[ReminderEngine] Reminder triggered:', reminder.title);

    // Format IST time
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

    // Show native Windows Notification if supported
    if (Notification && Notification.isSupported()) {
      const notif = new Notification({
        title: `Mantis Reminder (${istTimeStr} IST)`,
        body: reminder.title,
        urgency: 'critical',
        timeoutType: 'never'
      });
      notif.show();
    }

    // Mark as temporarily snoozed or notify renderer
    // Snooze for 2 minutes to prevent repeated popups while waiting for user action
    this.db.snoozeReminder(reminder.id, 2);

    if (typeof this.onReminderDue === 'function') {
      this.onReminderDue(reminder);
    }
  }

  formatIst(date = new Date()) {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }
}

module.exports = ReminderEngine;
