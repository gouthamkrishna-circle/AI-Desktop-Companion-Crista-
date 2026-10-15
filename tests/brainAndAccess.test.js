const MantisDatabase = require('../src/database/db');
const AiManager = require('../src/services/ai/aiManager');
const DesktopAutomation = require('../src/main/automation');
const WebBrainService = require('../src/services/knowledge/webBrainService');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const testDbPath = path.join(__dirname, 'test_brain.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const db = new MantisDatabase(testDbPath);
const brain = new WebBrainService(db);
const automation = new DesktopAutomation(db);
const ai = new AiManager(db);

async function runBrainTests() {
  console.log('Testing CRISTA Brain & System Autonomy...');

  // 1. Test Wikipedia direct lookup
  console.log('1. Testing Wikipedia query...');
  const wikiResult = await brain.queryWikipedia('Ada Lovelace');
  assert.ok(wikiResult && wikiResult.found, 'Wikipedia query should succeed');
  assert.ok(wikiResult.extract.includes('mathematician') || wikiResult.extract.includes('computer'), 'Extract must match topic');
  console.log('   Wikipedia OK:', wikiResult.title, '-', wikiResult.extract.slice(0, 80));

  // 2. Test DuckDuckGo live web search
  console.log('2. Testing DuckDuckGo web lookup...');
  const ddgResult = await brain.queryDuckDuckGo('Guido van Rossum');
  assert.ok(ddgResult && ddgResult.found, 'DuckDuckGo query should succeed');
  console.log('   DuckDuckGo OK:', ddgResult.heading, '-', (ddgResult.abstract || ddgResult.related[0] || '').slice(0, 80));

  // 3. Test Full Brain Synthesis via AiManager
  console.log('3. Testing AiManager WebBrain consultation...');
  const brainConsult = await ai.process('Who is Alan Turing?');
  assert.ok(brainConsult.reply.includes('Turing') || brainConsult.reply.includes('computer'), 'Brain reply should contain topic info');
  console.log('   Brain Synthesis OK:', brainConsult.reply.slice(0, 100));

  // 4. Test Unrestricted System Shell Execution (No permission prompt)
  console.log('4. Testing Unrestricted System Execution...');
  const shellRes = await automation.executeShell('echo CristaUnrestrictedAccess');
  assert.strictEqual(shellRes.success, true);
  assert.ok(shellRes.output.includes('CristaUnrestrictedAccess'));
  console.log('   Shell execution OK:', shellRes.output);

  // 5. Test Launch App without approval gates
  console.log('5. Testing Launch App without permission roadblock...');
  const launchRes = await automation.launchApp('notepad', true);
  assert.strictEqual(launchRes.success, true);
  assert.strictEqual(launchRes.app, 'Notepad');
  assert.strictEqual(launchRes.requiresApproval, undefined);
  console.log('   App launch OK: Launched', launchRes.app, 'without approval prompt');

  // 6. Test Direct Local Self-Evolution command
  console.log('6. Testing Autonomous Local Evolution Command...');
  const evoRes = await ai.process('powershell Get-Date');
  assert.ok(evoRes.evolutionAction && evoRes.evolutionAction.type === 'system_cmd');
  console.log('   Local evolution OK:', evoRes.evolutionAction.output.slice(0, 40));

  // 7. Test "hey crista open chrome" & "access chrome" & "access every app"
  console.log('7. Testing Chrome & Universal App Access intents...');
  const resChrome1 = await ai.process('hey crista open chrome');
  assert.strictEqual(resChrome1.toolExecution?.tool, 'launch_app');
  assert.strictEqual(resChrome1.toolExecution?.parameters?.app, 'chrome');
  console.log('   "hey crista open chrome" OK:', resChrome1.reply);

  const resChrome2 = await ai.process('access chrome');
  assert.strictEqual(resChrome2.toolExecution?.tool, 'launch_app');
  assert.strictEqual(resChrome2.toolExecution?.parameters?.app, 'chrome');
  console.log('   "access chrome" OK:', resChrome2.reply);

  const resAllApps = await ai.process('can you access chrome and every app');
  assert.strictEqual(resAllApps.toolExecution?.tool, 'launch_app');
  assert.ok(resAllApps.reply.includes('unrestricted access'));
  console.log('   "access chrome and every app" OK:', resAllApps.reply.slice(0, 80));

  const resTaskMgr = await ai.process('open task manager');
  assert.strictEqual(resTaskMgr.toolExecution?.tool, 'launch_app');
  assert.strictEqual(resTaskMgr.toolExecution?.parameters?.app, 'taskmgr');
  console.log('   "open task manager" OK:', resTaskMgr.reply);

  const resShowApps = await ai.process('Show available apps to open');
  assert.ok(resShowApps.suggestedActions?.length > 3);
  assert.ok(resShowApps.reply.includes('applications I can launch'));
  console.log('   "Show available apps to open" OK:', resShowApps.reply.slice(0, 60));

  // 8. Test troubleshooting "its not able to accces chrome and evry app what happened"
  console.log('8. Testing Troubleshooting "not able to accces chrome and evry app"...');
  const resTrouble = await ai.process('its not able to accces chrome and evry app what happened');
  assert.strictEqual(resTrouble.toolExecution?.tool, 'launch_app');
  assert.strictEqual(resTrouble.toolExecution?.parameters?.app, 'chrome');
  console.log('   Troubleshooting OK:', resTrouble.reply);

  // 9. Test compound Chrome + YouTube search intent
  console.log('9. Testing "open chrome and search my song in yt"...');
  const resCompound = await ai.process('open chrome and search my song in yt');
  assert.strictEqual(resCompound.toolExecution?.tool, 'open_url');
  assert.strictEqual(resCompound.toolExecution?.parameters?.browser, 'chrome');
  assert.ok(resCompound.toolExecution?.parameters?.url.includes('youtube.com/results?search_query=songs'));
  console.log('   Compound search OK:', resCompound.reply);

  // 10. Test that ambient screen capture imageBase64 does NOT block tool execution
  console.log('10. Testing that ambient screen capture DOES NOT block app launching...');
  const dummyScreenFrame = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
  const resAmbient = await ai.process('open chrome', [], null, dummyScreenFrame);
  assert.strictEqual(resAmbient.toolExecution?.tool, 'launch_app');
  assert.strictEqual(resAmbient.toolExecution?.parameters?.app, 'chrome');
  console.log('   Ambient screen non-blocking OK:', resAmbient.reply);

  db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  console.log('\n ALL BRAIN & UNRESTRICTED SYSTEM ACCESS TESTS PASSED!\n');
}

runBrainTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
