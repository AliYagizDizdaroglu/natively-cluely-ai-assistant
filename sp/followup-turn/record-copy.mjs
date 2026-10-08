// Copies the staged record (record/) and the result note into MAIN with copy-to-main.mjs; writes the MAIN-relative
// path list (one per line) to commit-paths.txt. Mirrors followup-questions-s50l/copy-record.mjs.
// Run only after F/2026-10-04-turn-followup-result.md exists. Normalises nothing: a source with a CR byte is REPORTED and
// the run stops before anything is copied (copy-to-main refuses CR files). With --skip-cr the CR files are left out
// (reported, and absent from commit-paths.txt) and the rest is copied.
//   node record-copy.mjs [--skip-cr]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const F = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(F);
const REL = 'electron/test/golden/passes/2026-10-04-turn-followup';
const NOTE_SRC = path.join(F, '2026-10-04-turn-followup-result.md');
const NOTE_REL = 'electron/test/golden/passes/2026-10-04-turn-followup-result.md';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const skipCr = process.argv.includes('--skip-cr');

if (!fs.existsSync(path.join(MAIN, '.git'))) { console.log('MAIN does not resolve'); process.exit(1); }
if (!fs.existsSync(NOTE_SRC)) { console.log(`REFUSED: the result note does not exist yet: ${NOTE_SRC}`); process.exit(1); }
const rels = fs.readFileSync(path.join(F, 'record-paths.txt'), 'utf8').trim().split('\n');
let jobs = rels.map((r) => ({ src: path.join(F, 'record', r.slice(REL.length + 1)), rel: r }));
jobs.push({ src: NOTE_SRC, rel: NOTE_REL });

const missing = jobs.filter((j) => !fs.existsSync(j.src));
if (missing.length) { missing.forEach((j) => console.log(`MISSING source ${j.rel}`)); process.exit(1); }
const cr = jobs.filter((j) => fs.readFileSync(j.src).includes(13));
if (cr.length) {
    cr.forEach((j) => console.log(`CR bytes: ${j.rel}`));
    if (!skipCr) { console.log('REFUSED: CR file(s) above; nothing copied (re-run with --skip-cr to leave them out)'); process.exit(2); }
    jobs = jobs.filter((j) => !cr.includes(j));
}
const exists = jobs.filter((j) => fs.existsSync(path.join(MAIN, j.rel)));
if (exists.length) { exists.forEach((j) => console.log(`EXISTS in MAIN: ${j.rel}`)); console.log('REFUSED: nothing copied'); process.exit(2); }

for (const d of new Set(jobs.map((j) => path.dirname(j.rel)))) fs.mkdirSync(path.join(MAIN, d), { recursive: true }); // copy-to-main refuses a missing folder

// the Windows command line holds ~32k chars: copy-to-main is called in chunks; every pre-check above already ran for all files
const chunks = [];
let cur = [], len = 0;
for (const j of jobs) {
    const arg = `${j.src}=${j.rel}`;
    if (len + arg.length + 1 > 20000 && cur.length) { chunks.push(cur); cur = []; len = 0; }
    cur.push(arg); len += arg.length + 1;
}
if (cur.length) chunks.push(cur);
let copied = 0;
for (const c of chunks) {
    const out = execFileSync('node', [path.join(SP, 'copy-to-main.mjs'), ...c], { encoding: 'utf8' });
    const bad = out.split('\n').filter((l) => /^(REFUSED|COPY MISMATCH|nothing copied)/.test(l));
    if (bad.length) { console.log(bad.join('\n')); process.exit(3); }
    copied += c.length;
}
fs.writeFileSync(path.join(F, 'commit-paths.txt'), jobs.map((j) => j.rel).join('\n') + '\n');
console.log(`${copied} files copied in ${chunks.length} call(s); commit-paths.txt written (${jobs.length} paths)${cr.length ? `; ${cr.length} CR file(s) left out` : ''}`);
