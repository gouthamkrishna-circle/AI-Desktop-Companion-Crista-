const MantisDatabase = require('../src/database/db');
const AiManager = require('../src/services/ai/aiManager');
const YouTubeLearningService = require('../src/services/learning/youtubeService');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const testDbPath = path.join(__dirname, 'test_learning.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const db = new MantisDatabase(testDbPath);
const ai = new AiManager(db);
const learning = new YouTubeLearningService(db, ai);

async function run() {
  console.log('Testing YouTubeLearningService...');

  // Test Video ID extraction
  const url1 = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const id1 = learning.extractVideoId(url1);
  assert.strictEqual(id1, 'dQw4w9WgXcQ');

  const url2 = 'https://youtu.be/M7lc1UVf-VE?t=42';
  const id2 = learning.extractVideoId(url2);
  assert.strictEqual(id2, 'M7lc1UVf-VE');
  console.log(' Video ID extraction verified:', id1, id2);

  // Test local lesson generation
  const lesson = await learning.generateLesson({
    title: 'Modern Asynchronous JavaScript',
    url: 'https://youtube.com/watch?v=M7lc1UVf-VE',
    topic: 'Promises, Async/Await and Event Loop'
  });

  assert.ok(lesson.id);
  assert.strictEqual(lesson.title, 'Modern Asynchronous JavaScript');
  const flashcards = JSON.parse(lesson.flashcards_json);
  assert.ok(flashcards.length >= 3);
  console.log(' Flashcards generated:', flashcards.length);

  const quiz = JSON.parse(lesson.quiz_json);
  assert.ok(quiz.length >= 2);
  console.log(' Quiz generated:', quiz.length);

  // Test converting assignment to real planner task
  const task = learning.convertAssignmentToTask(lesson.title, 'Build a fetch wrapper');
  assert.ok(task.id);
  assert.ok(task.title.includes('Modern Asynchronous JavaScript'));
  console.log(' Converted assignment to task:', task.title);

  db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  console.log('\n ALL LEARNING SERVICE TESTS PASSED!\n');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
