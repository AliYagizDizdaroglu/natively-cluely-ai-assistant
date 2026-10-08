// Calibration of smoke-rundir.mjs on a SYNTHETIC segment 1 (five clips, one distinct capture each, the app's own
// dispatch-line format). No app, no model. Known answers: clean -> keys == the five ids and each key holds ITS OWN
// capture (WHY kept in the timeline); WHY's timeline entry removed -> S1Q06F's key holds WHY's capture (the reason
// WHY's entry is kept); a missing capture -> FAIL; an existing out dir -> refuse; a missing input -> refuse.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const iso = (ms) => new Date(ms).toISOString();
const IDS = ['S1Q04', 'S1Q04F', 'S1Q06', 'S1Q06F', 'WHY'];
const OFFS = [0, 164_000, 340_000, 504_000, 560_000];
const T0 = Date.parse('2026-10-05T10:00:00.000Z');
const userOf = (id) => `synthetic user turn for ${id}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rdcal-'));
const dbg = [], caps = [], played = [];
IDS.forEach((id, i) => {
    const start = T0 + OFFS[i], at = start + 6000, q = `question ${id}`;
    played.push({ id, startedMs: start, endedMs: start + 3000 });
    dbg.push(`${iso(at)} [LOG] [Main] dispatch: answer source=whisper anchor=${JSON.stringify(q)} verdict=complete question=${JSON.stringify(q)}`);
    caps.push(JSON.stringify({ at: iso(at + 2000), system: 'sys', user: userOf(id), model: 'm' }));
});
const w = (n, s) => { const p = path.join(tmp, n); fs.writeFileSync(p, s); return p; };
const debugP = w('d.log', dbg.join('\n') + '\n'), playedP = w('p.json', JSON.stringify({ played }));
const capsP = w('c.log', caps.join('\n') + '\n'), caps4P = w('c4.log', caps.slice(0, 4).join('\n') + '\n');
const playedNoWhyP = w('pn.json', JSON.stringify({ played: played.slice(0, 4) }));
const run = (extra) => { const r = spawnSync(process.execPath, [path.join(HERE, 'smoke-rundir.mjs'), '--played', playedP, '--debug', debugP, '--prompts', capsP, ...extra], { encoding: 'utf8' }); return { status: r.status, out: r.stdout + r.stderr }; };
let n = 0, bad = 0;
const check = (name, ok, expected, actual) => { n++; if (!ok) bad++; console.log(`${ok ? 'OK  ' : 'BAD '} ${name}\n      expected ${expected}\n      actual   ${actual}`); };
const keysOf = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'interview60.prompts.json'), 'utf8'));
// 1 clean
const o1 = path.join(tmp, 'o1');
let r = run(['--out', o1]);
let pj = fs.existsSync(path.join(o1, 'interview60.prompts.json')) ? keysOf(o1) : {};
check('clean: keys are the five played ids, each with its own capture', r.status === 0 && IDS.every((id) => pj[id]?.user === userOf(id)) && Object.keys(pj).length === 5 && r.out.includes('SMOKE RUNDIR OK'), 'exit 0, 5 keys, each user == its own synthetic turn', `exit ${r.status}, keys ${Object.keys(pj).join(',')}, own-capture ${IDS.map((id) => pj[id]?.user === userOf(id) ? 'y' : 'n').join('')}; timeline items ${JSON.parse(fs.readFileSync(path.join(o1, 'interview60.timeline.json'), 'utf8')).items.length}`);
// 2 WHY's timeline entry removed (run through the same script with a played json that lacks WHY)
const o2 = path.join(tmp, 'o2');
r = spawnSync(process.execPath, [path.join(HERE, 'smoke-rundir.mjs'), '--played', playedNoWhyP, '--debug', debugP, '--prompts', capsP, '--out', o2], { encoding: 'utf8' });
pj = fs.existsSync(path.join(o2, 'interview60.prompts.json')) ? keysOf(o2) : {};
check('WHY entry dropped from the timeline: S1Q06F\'s window swallows WHY (why the entry is kept)', pj.S1Q06F?.user === userOf('WHY'), 'S1Q06F key holds WHY\'s capture (a wrong pairing)', `S1Q06F user sha ${pj.S1Q06F ? sha(pj.S1Q06F.user) : 'none'} vs WHY ${sha(userOf('WHY'))} vs S1Q06F ${sha(userOf('S1Q06F'))}`);
// 3 a missing capture
r = spawnSync(process.execPath, [path.join(HERE, 'smoke-rundir.mjs'), '--played', playedP, '--debug', debugP, '--prompts', caps4P, '--out', path.join(tmp, 'o3')], { encoding: 'utf8' });
check('a missing capture: keys != played ids', r.status === 1 && (r.stdout + r.stderr).includes('not exactly the played ids'), 'exit 1 naming the mismatch', `exit ${r.status}: ${(r.stdout.match(/SMOKE RUNDIR[^\n]*/g) ?? []).join(' / ')}`);
// 4 out dir exists
r = run(['--out', o1]);
check('an existing out dir is refused (built once)', r.status === 2 && r.out.includes('already exists'), 'exit 2', `exit ${r.status}`);
// 5 --force
r = run(['--out', o1, '--force']);
check('--force rebuilds', r.status === 0, 'exit 0', `exit ${r.status}`);
// 6 a missing input
r = spawnSync(process.execPath, [path.join(HERE, 'smoke-rundir.mjs'), '--played', path.join(tmp, 'nope.json'), '--debug', debugP, '--prompts', capsP, '--out', path.join(tmp, 'o6')], { encoding: 'utf8' });
check('a missing input is refused', r.status === 2 && (r.stdout + r.stderr).includes('missing'), 'exit 2', `exit ${r.status}`);
// 7 the script prints no prompt text
check('output carries no prompt text', !(run(['--out', path.join(tmp, 'o7')]).out.includes('synthetic user turn')), 'no "synthetic user turn" in the output', 'checked');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nCALIBRATION ${bad ? 'FAILED' : 'OK'}: ${n - bad}/${n} cases behaved as expected`);
process.exit(bad ? 1 : 0);
