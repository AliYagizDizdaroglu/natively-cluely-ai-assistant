// Throwaway (flight-eq AMENDMENT-A3 A3.1a / FR-I2): builds the ONE smoke run dir E\smoke-run-tmp\ from the
// smoke's segment 1, so eq-b4-cal.mjs and the n5 accept-path call share one prompts map:
//   1. copy segment 1's two logs in as natively_debug.log and verbal-prompts.log;
//   2. write interview60.timeline.json = { items: played.map(p => ({ id, kind: 'spoken', playedAt: startedMs })) }
//      (WHY's entry is KEPT, so S1Q06F's window ends at WHY's start);
//   3. run MAIN's interview60.prompts.mjs on the dir (cwd MAIN) -> interview60.prompts.json.
// Prints keys and counts only, never a prompt. Exit 1 unless the prompts keys are exactly the played ids.
// The dir is deleted by the controller after the two readings of A3 final-list step 5 (never committed).
//
//   node smoke-rundir.mjs [--out <dir>] [--played <json>] [--debug <log>] [--prompts <log>] [--force]
// Defaults: the launcher's segment 1 files under MAIN's interview60.runs, out = E\smoke-run-tmp.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const RUNS = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs');
const F = path.dirname(path.dirname(fileURLToPath(import.meta.url)));   // F\smoke\ -> F
const E = path.join(path.dirname(F), 'flight-eq');                       // L\flight-eq
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const out = opt('--out', path.join(E, 'smoke-run-tmp'));
const playedPath = opt('--played', path.join(RUNS, 'smoke-eq-on.played.json'));
const debugPath = opt('--debug', path.join(RUNS, 'smoke-eq-on.natively_debug.log'));
const promptsPath = opt('--prompts', path.join(RUNS, 'smoke-eq-on.verbal-prompts.log'));
const die = (m, code = 1) => { console.log(`SMOKE RUNDIR FAIL: ${m}`); process.exit(code); };
for (const p of [playedPath, debugPath, promptsPath]) if (!fs.existsSync(p)) die(`missing ${p}`, 2);
if (fs.existsSync(out) && !argv.includes('--force')) die(`${out} already exists (built ONCE; delete it or pass --force)`, 2);
const played = JSON.parse(fs.readFileSync(playedPath, 'utf8')).played;
if (!Array.isArray(played) || !played.length || played.some((p) => typeof p.id !== 'string' || !Number.isFinite(p.startedMs))) die('the played json has no usable {id, startedMs} list');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(debugPath, path.join(out, 'natively_debug.log'));
fs.copyFileSync(promptsPath, path.join(out, 'verbal-prompts.log'));
fs.writeFileSync(path.join(out, 'interview60.timeline.json'), JSON.stringify({ items: played.map((p) => ({ id: p.id, kind: 'spoken', playedAt: p.startedMs })) }, null, 1));
const r = spawnSync(process.execPath, [path.join('electron', 'test', 'golden', 'interview60.prompts.mjs'), out], { cwd: MAIN, encoding: 'utf8' });
const lines = (r.stdout + r.stderr).split('\n').filter(Boolean);
for (const l of lines) console.log(`  ${/^PROMPTS /.test(l) ? l.replace(/→.*$/, '→ <out>\\interview60.prompts.json') : l.slice(0, 200)}`);   // the script prints counts and a path only
if (r.status !== 0) die(`interview60.prompts.mjs exited ${r.status}`);
const keys = Object.keys(JSON.parse(fs.readFileSync(path.join(out, 'interview60.prompts.json'), 'utf8')));
const want = played.map((p) => p.id);
const same = keys.length === want.length && want.every((id) => keys.includes(id));
console.log(`SMOKE RUNDIR: prompts keys [${keys.join(', ')}] ${keys.length} of ${want.length} played ids [${want.join(', ')}]`);
if (!same) die('the prompts keys are not exactly the played ids');
console.log(`SMOKE RUNDIR OK: ${out}`);
