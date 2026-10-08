// Copies the staged record (record/) and the result note into MAIN with copy-to-main.mjs; writes the MAIN-relative
// path list (one per line) to commit-paths.txt for commit-main-paths.ps1.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const F = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const SP = path.dirname(F);
const REL = 'electron/test/golden/passes/2026-10-03-followup-questions';
const rels = fs.readFileSync(path.join(F, 'record-paths.txt'), 'utf8').trim().split('\n');
const jobs = rels.map((r) => `${path.join(F, 'record', r.slice(REL.length + 1))}=${r}`);
jobs.push(`${path.join(F, '2026-10-03-followup-questions-result.md')}=electron/test/golden/passes/2026-10-03-followup-questions-result.md`);
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
if (!fs.existsSync(path.join(MAIN, '.git'))) { console.log('MAIN does not resolve'); process.exit(1); }
fs.mkdirSync(path.join(MAIN, REL, 'blind'), { recursive: true }); // copy-to-main refuses a missing folder
const out = execFileSync('node', [path.join(SP, 'copy-to-main.mjs'), ...jobs], { encoding: 'utf8' });
console.log(out.trim().split('\n').slice(-3).join('\n'));
fs.writeFileSync(path.join(F, 'commit-paths.txt'), [...rels, 'electron/test/golden/passes/2026-10-03-followup-questions-result.md'].join('\n') + '\n');
console.log(`${jobs.length} files; commit-paths.txt written`);
