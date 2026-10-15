const MantisDatabase = require('../src/database/db');
const AiManager = require('../src/services/ai/aiManager');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const testDbPath = path.join(__dirname, 'test_ai.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const db = new MantisDatabase(testDbPath);
const ai = new AiManager(db);

async function runTests() {
  console.log('Testing AiManager & LocalEngine...');

  // Test greeting
  const res1 = await ai.process('Hey Mantis');
  assert.ok(res1.reply.includes('boss') || res1.reply.includes('online'));
  console.log(' Greeting test passed:', res1.reply);

  // Test Telugu
  const resTe = await ai.process('Namaskaram, ela unnav?');
  assert.ok(resTe.reply.includes('Namaskaram'));
  console.log(' Telugu test passed:', resTe.reply);

  // Test Hindi
  const resHi = await ai.process('Namaste, kaise ho?');
  assert.ok(resHi.reply.includes('Namaste'));
  console.log(' Hindi test passed:', resHi.reply);

  // Test Task creation via voice/text intent
  const resTask = await ai.process('Add task Build Windows desktop companion');
  assert.strictEqual(resTask.toolExecution?.tool, 'create_task');
  assert.ok(resTask.toolExecution?.result?.title.includes('desktop companion'));
  console.log(' Task intent test passed:', resTask.toolExecution.result.title);

  // Test Reminder creation
  const resRemind = await ai.process('Remind me to drink water in 15 minutes');
  assert.strictEqual(resRemind.toolExecution?.tool, 'create_reminder');
  console.log(' Reminder intent test passed:', resRemind.toolExecution.result.title);

  // Test App launch
  const resApp = await ai.process('Open YouTube');
  assert.strictEqual(resApp.toolExecution?.tool, 'open_url');
  assert.strictEqual(resApp.toolExecution?.parameters?.url, 'https://youtube.com');
  console.log(' Open YouTube test passed:', resApp.toolExecution.parameters.url);

  // Test Fallback when API key is missing
  db.updateProfile({ ai_provider: 'gemini', gemini_api_key: '' });
  const resFallback = await ai.process('Explain quantum computing');
  assert.ok(resFallback.reply.includes('Falling back to local offline mode'));
  console.log(' Fallback test passed:', resFallback.reply.slice(0, 70));

  db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  console.log('\n ALL AI INTENT & ROUTING TESTS PASSED!\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
