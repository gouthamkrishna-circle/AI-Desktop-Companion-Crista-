const MantisDatabase = require('../src/database/db');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const testDbPath = path.join(__dirname, 'test_mantis.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

console.log('Testing MantisDatabase initialization...');
const db = new MantisDatabase(testDbPath);

// Test Profile
const profile = db.getProfile();
assert.strictEqual(profile.callsign, 'boss', 'Default callsign should be boss');
console.log(' Profile loaded:', profile.name, profile.callsign);

db.updateProfile({ callsign: 'buddy', name: 'Commander' });
const updatedProfile = db.getProfile();
assert.strictEqual(updatedProfile.callsign, 'buddy');
assert.strictEqual(updatedProfile.name, 'Commander');
console.log(' Profile updated:', updatedProfile.name, updatedProfile.callsign);

// Test Tasks
const task1 = db.createTask('Complete Mantis Phase 1', { priority: 'high', category: 'work', estimated_minutes: 45 });
assert.ok(task1.id, 'Task should have ID');
assert.strictEqual(task1.title, 'Complete Mantis Phase 1');
console.log(' Task created:', task1.title, 'ID:', task1.id);

const activeTasks = db.getTasks('active');
assert.strictEqual(activeTasks.length, 1);

const toggled = db.toggleTask(task1.id);
assert.strictEqual(toggled.is_completed, 1);
console.log(' Task toggled completed:', toggled.is_completed);

// Test Reminders
const dueSoon = new Date(Date.now() + 5000).toISOString();
const reminder = db.createReminder('Check desktop widgets', dueSoon);
assert.ok(reminder.id);
console.log(' Reminder created:', reminder.title);

// Test Memory
const note = db.createMemoryNote('routine', 'Morning Routine', 'Wake up at 6:30 AM, drink water, plan tasks', 1);
assert.ok(note.id);
const notes = db.getMemoryNotes();
assert.strictEqual(notes.length, 1);
console.log(' Memory note created:', note.title);

// Test Lessons
const lesson = db.createLesson({
  title: 'Introduction to AI Agents',
  source_url: 'https://youtube.com/watch?v=example',
  summary: 'AI agents perceive and act in an environment.',
  flashcards_json: [{ question: 'What is an agent?', answer: 'An autonomous entity' }]
});
assert.ok(lesson.id);
console.log(' Lesson created:', lesson.title);

// Test Action History
const action = db.logAction('open_url', { url: 'https://youtube.com' }, { opened: true }, 'success');
assert.ok(action.id);
console.log(' Action logged:', action.tool_name);

// Cleanup
db.close();
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
console.log('\n ALL DATABASE TESTS PASSED!\n');
