import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant';
const src = fs.readFileSync(MAIN + '/electron/services/interviewerTurn.replay.test.ts', 'utf8');
const old = "const FIXTURES = path.resolve(process.cwd(), 'electron/test/golden/fixtures');";
const neu = "// Hangs off __dirname (this folder), not the cwd: vitest workers keep the caller's cwd, which is %TEMP% under the repo's test command, not --root.\nconst FIXTURES = path.resolve(__dirname, '../test/golden/fixtures');";
if (src.split(old).length !== 2) throw new Error('anchor not unique');
fs.writeFileSync(process.argv[2], src.replace(old, neu));
