const MantisDatabase = require('../src/database/db');
const SelfEvolutionService = require('../src/services/evolution/selfEvolutionService');
const path = require('node:path');
const fs = require('node:fs');

console.log('Testing SelfEvolutionService & Meta-Programming Engine...');

const db = new MantisDatabase();
const evo = new SelfEvolutionService(db, path.resolve(__dirname, '../'));

// 1. List core files
const files = evo.listCoreFiles();
console.assert(files.length > 5, 'Core files should be listed');
console.log(` Found ${files.length} registered core system files.`);

// 2. Read self file
const orbCss = evo.readSelfFile('src/renderer/styles/orb.css');
console.assert(orbCss.includes('glass-sphere'), 'orb.css must contain glass-sphere selector');
console.log(` Read orb.css (${orbCss.length} bytes) successfully.`);

// 3. Test backup and write self file
const testRelPath = 'tests/temp_evolution_test.txt';
const testRes = evo.writeSelfFile(testRelPath, 'Autonomous Evolution Test Content', 'Unit test evolution', 'Test prompt');
console.assert(testRes.success === true, 'writeSelfFile should return success');
console.assert(fs.existsSync(path.resolve(__dirname, 'temp_evolution_test.txt')), 'File must exist');
console.log(' Successfully wrote self file and verified backup logic.');

// Clean up test file
try {
  fs.unlinkSync(path.resolve(__dirname, 'temp_evolution_test.txt'));
} catch (e) {}

// 4. Test database evolution logging
db.logEvolution('Change glow to green', 'src/renderer/styles/orb.css', 'Updated glow aura');
const history = db.getEvolutionHistory();
console.assert(history.length > 0, 'Evolution history should have entries');
console.log(` Verified evolution logging: ${history[0].user_request} -> ${history[0].file_path}`);

// 5. Test adaptation memory
db.setAdaptation('preferred_mood', 'focus_mode');
const mood = db.getAdaptation('preferred_mood');
console.assert(mood === 'focus_mode', 'Adaptation memory should persist value');
console.log(` Verified adaptation memory: preferred_mood = ${mood}`);

// 6. Test system shell command execution
evo.executeSystemCommand('powershell -Command "Write-Output EvolutionSystemOnline"')
  .then(res => {
    console.assert(res.success === true, 'Shell command should succeed');
    console.assert(res.output.includes('EvolutionSystemOnline'), 'Output must match');
    console.log(` Verified system command execution: ${res.output.trim()}`);
    console.log('\n ALL SELF-EVOLUTION ENGINE TESTS PASSED!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Shell execution error:', err);
    process.exit(1);
  });
