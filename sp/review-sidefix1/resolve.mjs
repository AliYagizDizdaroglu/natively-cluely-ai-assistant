// Read-only: mirrors vite-node's __dirname derivation (client.mjs 290-293) and the old/new FIXTURES expressions.
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const od = 'C:/Users/sotka/OneDrive';
const masa = fs.readdirSync(od).filter((n) => n.startsWith('Masa') && fs.existsSync(path.join(od, n, 'natively-cluely-ai-assistant', '.git')));
if (masa.length !== 1) throw new Error('expected one Masa* checkout, got ' + JSON.stringify(masa));
const main = path.join(od, masa[0], 'natively-cluely-ai-assistant');
const moduleId = (main + '/electron/services/interviewerTurn.replay.test.ts').replace(/\\/g, '/');
const href = pathToFileURL(moduleId).href;
const __filename = fileURLToPath(href);
const __dirname = dirname(__filename);
const NEW = path.resolve(__dirname, '../test/golden/fixtures');
const want = path.join(main, 'electron', 'test', 'golden', 'fixtures');
console.log('href has %C3%BC:', href.includes('%C3%BC'));
console.log('__dirname non-ASCII intact:', __dirname.includes('Masa\u00fcst\u00fc'));
console.log('NEW =', JSON.stringify(NEW));
console.log('NEW === old-from-root:', NEW === path.resolve(main, 'electron/test/golden/fixtures'), ' NEW === want:', NEW === want);
for (const f of ['2026-09-08T08-44-56-after9', '2026-09-09T15-00-55-s50a']) console.log(f, 'exists via NEW:', fs.existsSync(path.join(NEW, `${f}-turns.json`)));
// Calibration: the old expression from a temp cwd must NOT find the file.
const OLD_TEMP = path.resolve(process.cwd(), 'electron/test/golden/fixtures');
console.log('cwd =', process.cwd());
console.log('OLD from this cwd finds s50a:', fs.existsSync(path.join(OLD_TEMP, '2026-09-09T15-00-55-s50a-turns.json')));
