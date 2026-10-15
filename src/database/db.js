// Database initialization using Node 24 native node:sqlite
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

class MantisDatabase {
  constructor(dbPath) {
    if (!dbPath) {
      // Default to user data or local data directory
      const dataDir = path.join(process.env.APPDATA || process.env.HOME || '.', '.mantis');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      dbPath = path.join(dataDir, 'mantis.db');
    }
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      -- Settings & User Profile
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- User Profile / Preferences
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT DEFAULT 'Boss',
        callsign TEXT DEFAULT 'boss', -- 'boss' or 'buddy'
        preferred_language TEXT DEFAULT 'en-IN', -- 'en-IN', 'te-IN', 'hi-IN'
        voice_enabled INTEGER DEFAULT 1,
        always_on_top INTEGER DEFAULT 1,
        launch_on_startup INTEGER DEFAULT 0,
        proactive_enabled INTEGER DEFAULT 1,
        proactive_interval_min INTEGER DEFAULT 45,
        ai_provider TEXT DEFAULT 'local', -- 'local', 'gemini', 'openai'
        gemini_api_key TEXT DEFAULT '',
        gemini_model TEXT DEFAULT 'gemini-1.5-flash',
        openai_api_key TEXT DEFAULT '',
        openai_model TEXT DEFAULT 'gpt-4o-mini',
        focus_duration_min INTEGER DEFAULT 25,
        break_duration_min INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Tasks and Priorities
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
        category TEXT DEFAULT 'work', -- 'work', 'study', 'personal', 'project'
        estimated_minutes INTEGER DEFAULT 30,
        due_date TEXT,
        time_block TEXT,
        is_completed INTEGER DEFAULT 0,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Reminders
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        due_time DATETIME NOT NULL,
        recurring_type TEXT DEFAULT 'none', -- 'none', 'daily', 'weekdays'
        is_completed INTEGER DEFAULT 0,
        is_snoozed INTEGER DEFAULT 0,
        snoozed_until DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Memory Notes and Personal Knowledge
      CREATE TABLE IF NOT EXISTS memory_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL, -- 'preference', 'routine', 'goal', 'note'
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        pinned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Learning Lessons & YouTube Study
      CREATE TABLE IF NOT EXISTS learning_lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        source_url TEXT,
        video_id TEXT,
        summary TEXT,
        structured_notes TEXT,
        flashcards_json TEXT, -- array of {question, answer, difficulty}
        quiz_json TEXT,       -- array of {question, options, answer, explanation}
        assignments_json TEXT,-- array of {task, completed}
        mastery_level INTEGER DEFAULT 0, -- 0-100%
        next_revision_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Chat Messages History
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL, -- 'user', 'assistant', 'system'
        content TEXT NOT NULL,
        provider TEXT DEFAULT 'local',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Desktop Action History (Audit Log)
      CREATE TABLE IF NOT EXISTS action_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_name TEXT NOT NULL,
        parameters TEXT,
        result TEXT,
        status TEXT DEFAULT 'success', -- 'success', 'denied', 'failed'
        requires_approval INTEGER DEFAULT 0,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Self-Evolution History (Code Modifications & Improvements)
      CREATE TABLE IF NOT EXISTS evolution_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_request TEXT,
        file_path TEXT,
        summary TEXT,
        backup_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Circumstance Adaptation Memory (Daily learning & user preference tuning)
      CREATE TABLE IF NOT EXISTS adaptation_memory (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure default profile exists
    const profile = this.db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    if (!profile) {
      this.db.prepare(`
        INSERT INTO user_profile (id, name, callsign, preferred_language, ai_provider)
        VALUES (1, 'Boss', 'boss', 'en-IN', 'local')
      `).run();
    }
  }

  // --- Profile & Settings ---
  getProfile() {
    return this.db.prepare('SELECT * FROM user_profile WHERE id = 1').get() || {};
  }

  updateProfile(fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    this.db.prepare(`UPDATE user_profile SET ${sets} WHERE id = 1`).run(...values);
    return this.getProfile();
  }

  // --- Tasks ---
  getTasks(filter = 'active') {
    if (filter === 'active') {
      return this.db.prepare("SELECT * FROM tasks WHERE is_completed = 0 ORDER BY priority = 'high' DESC, priority = 'medium' DESC, id DESC").all();
    } else if (filter === 'completed') {
      return this.db.prepare('SELECT * FROM tasks WHERE is_completed = 1 ORDER BY completed_at DESC LIMIT 50').all();
    }
    return this.db.prepare('SELECT * FROM tasks ORDER BY id DESC').all();
  }

  createTask(title, { description = '', priority = 'medium', category = 'work', estimated_minutes = 30, due_date = null, time_block = null } = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (title, description, priority, category, estimated_minutes, due_date, time_block)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(title, description, priority, category, estimated_minutes, due_date, time_block);
    return this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  }

  toggleTask(id) {
    const task = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) return null;
    const newStatus = task.is_completed ? 0 : 1;
    const completedAt = newStatus ? new Date().toISOString() : null;
    this.db.prepare('UPDATE tasks SET is_completed = ?, completed_at = ? WHERE id = ?').run(newStatus, completedAt, id);
    return this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  }

  deleteTask(id) {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return { success: true, id };
  }

  // --- Reminders ---
  getReminders() {
    return this.db.prepare('SELECT * FROM reminders WHERE is_completed = 0 ORDER BY due_time ASC').all();
  }

  createReminder(title, due_time, recurring_type = 'none') {
    const stmt = this.db.prepare(`
      INSERT INTO reminders (title, due_time, recurring_type)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(title, due_time, recurring_type);
    return this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid);
  }

  completeReminder(id) {
    this.db.prepare('UPDATE reminders SET is_completed = 1 WHERE id = ?').run(id);
    return { success: true, id };
  }

  snoozeReminder(id, minutes = 10) {
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    this.db.prepare('UPDATE reminders SET is_snoozed = 1, snoozed_until = ? WHERE id = ?').run(snoozedUntil, id);
    return { success: true, id, snoozedUntil };
  }

  getDueReminders() {
    const nowIso = new Date().toISOString();
    return this.db.prepare(`
      SELECT * FROM reminders
      WHERE is_completed = 0
        AND ((is_snoozed = 0 AND due_time <= ?) OR (is_snoozed = 1 AND snoozed_until <= ?))
    `).all(nowIso, nowIso);
  }

  // --- Memory Notes ---
  getMemoryNotes(category = null) {
    if (category) {
      return this.db.prepare('SELECT * FROM memory_notes WHERE category = ? ORDER BY pinned DESC, id DESC').all(category);
    }
    return this.db.prepare('SELECT * FROM memory_notes ORDER BY pinned DESC, id DESC').all();
  }

  createMemoryNote(category, title, content, pinned = 0) {
    const stmt = this.db.prepare(`
      INSERT INTO memory_notes (category, title, content, pinned)
      VALUES (?, ?, ?, ?)
    `);
    const res = stmt.run(category, title, content, pinned ? 1 : 0);
    return this.db.prepare('SELECT * FROM memory_notes WHERE id = ?').get(res.lastInsertRowid);
  }

  deleteMemoryNote(id) {
    this.db.prepare('DELETE FROM memory_notes WHERE id = ?').run(id);
    return { success: true, id };
  }

  // --- Learning Lessons ---
  getLessons() {
    return this.db.prepare('SELECT * FROM learning_lessons ORDER BY id DESC').all();
  }

  getLesson(id) {
    return this.db.prepare('SELECT * FROM learning_lessons WHERE id = ?').get(id);
  }

  createLesson({ title, source_url, video_id, summary, structured_notes, flashcards_json, quiz_json, assignments_json }) {
    const stmt = this.db.prepare(`
      INSERT INTO learning_lessons (title, source_url, video_id, summary, structured_notes, flashcards_json, quiz_json, assignments_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      title,
      source_url || '',
      video_id || '',
      summary || '',
      structured_notes || '',
      typeof flashcards_json === 'string' ? flashcards_json : JSON.stringify(flashcards_json || []),
      typeof quiz_json === 'string' ? quiz_json : JSON.stringify(quiz_json || []),
      typeof assignments_json === 'string' ? assignments_json : JSON.stringify(assignments_json || [])
    );
    return this.getLesson(res.lastInsertRowid);
  }

  deleteLesson(id) {
    this.db.prepare('DELETE FROM learning_lessons WHERE id = ?').run(id);
    return { success: true, id };
  }

  // --- Chat History ---
  getChatHistory(limit = 40) {
    return this.db.prepare('SELECT * FROM chat_history ORDER BY id DESC LIMIT ?').all(limit).reverse();
  }

  addChatMessage(role, content, provider = 'local') {
    const stmt = this.db.prepare('INSERT INTO chat_history (role, content, provider) VALUES (?, ?, ?)');
    const res = stmt.run(role, content, provider);
    return this.db.prepare('SELECT * FROM chat_history WHERE id = ?').get(res.lastInsertRowid);
  }

  clearChatHistory() {
    this.db.prepare('DELETE FROM chat_history').run();
    return { success: true };
  }

  // --- Action History ---
  logAction(tool_name, parameters, result, status = 'success', requires_approval = 0) {
    const stmt = this.db.prepare(`
      INSERT INTO action_history (tool_name, parameters, result, status, requires_approval)
      VALUES (?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      tool_name,
      typeof parameters === 'string' ? parameters : JSON.stringify(parameters),
      typeof result === 'string' ? result : JSON.stringify(result),
      status,
      requires_approval ? 1 : 0
    );
    return this.db.prepare('SELECT * FROM action_history WHERE id = ?').get(res.lastInsertRowid);
  }

  getActionHistory(limit = 50) {
    return this.db.prepare('SELECT * FROM action_history ORDER BY id DESC LIMIT ?').all(limit);
  }

  // --- Self-Evolution Logs ---
  logEvolution(user_request, file_path, summary, backup_path = null) {
    const stmt = this.db.prepare(`
      INSERT INTO evolution_history (user_request, file_path, summary, backup_path)
      VALUES (?, ?, ?, ?)
    `);
    const res = stmt.run(user_request, file_path, summary, backup_path);
    return this.db.prepare('SELECT * FROM evolution_history WHERE id = ?').get(res.lastInsertRowid);
  }

  getEvolutionHistory(limit = 50) {
    return this.db.prepare('SELECT * FROM evolution_history ORDER BY id DESC LIMIT ?').all(limit);
  }

  // --- Adaptation Memory ---
  getAdaptation(key, defaultValue = null) {
    const row = this.db.prepare('SELECT value FROM adaptation_memory WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  }

  setAdaptation(key, value) {
    const stmt = this.db.prepare(`
      INSERT INTO adaptation_memory (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = MantisDatabase;
