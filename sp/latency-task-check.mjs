// latency-task-check.mjs — run ONCE by a throwaway scheduled task in exactly the form the three
// window tasks use: cmd /c, the same node, --env-file=.env, a script path relative to the task's
// working directory, output redirected into the runs folder. It proves that form works from the
// task context before any window depends on it. It never prints a key, only whether one arrived.
import fs from 'node:fs';
import path from 'node:path';

const DAY = '2026-09-23';   // the windows' UTC date: 10:15 / 15:00 / 21:00 local are 07:15 / 12:00 / 18:00 UTC
const checks = [];
const check = (name, pass, detail = '') => checks.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);

const cwd = process.cwd();
check('working directory is the main checkout, not a worktree', /natively-cluely-ai-assistant$/.test(cwd.replace(/[\\/]+$/, '')), cwd);
check('GEMINI_API_KEY reached the process through --env-file', !!process.env.GEMINI_API_KEY?.trim(), process.env.GEMINI_API_KEY?.trim() ? 'present' : 'MISSING');
check('probe script found relative to the working directory', fs.existsSync(path.join(cwd, 'electron/test/golden/paired-latency.probe.mjs')));
let n = 0;
try { n = Object.keys(JSON.parse(fs.readFileSync(path.join(cwd, 'electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json'), 'utf8'))).length; } catch { /* reported below */ }
check("s50m's captured prompts readable", n === 39, `${n} prompts`);
const dir = path.join(cwd, 'electron/test/golden/interview60.runs/latency-probe');
let writable = false;
try { const t = path.join(dir, '.write-test'); fs.writeFileSync(t, 'x'); fs.unlinkSync(t); writable = true; } catch { /* reported below */ }
check('output folder writable', writable, dir);
for (const w of ['W1', 'W2', 'W3']) check(`no ${DAY}-${w}.json yet`, !fs.existsSync(path.join(dir, `${DAY}-${w}.json`)));
check('node version', true, process.version);

const all = checks.every((c) => c.startsWith('PASS'));
console.log(checks.join('\n'));
console.log(all ? 'GUARDS_ALL_PASSED' : 'GUARDS_FAILED');
process.exit(all ? 0 : 1);
