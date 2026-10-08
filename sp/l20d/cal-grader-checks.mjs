// Rule-8 calibration of the grader checks that run before the key is read (Opus review M10 e): grader-models.mjs,
// grader-independence.mjs, validate-verdicts.mjs, writer-model.mjs, on graders whose answers are already known.
//   - grader-models.mjs on L20c's eight graders must reproduce l20c/grader-models.out.txt line for line (seven OK, one
//     PROBLEM: the C-g2 agent's transcript names three verdict files, a known case);
//   - grader-independence.mjs: A-g1 has 0 mentions of another grader's file, C-g2 has 1 (l20c/grader-independence.out.txt);
//   - validate-verdicts.mjs, run in a temp folder holding ET38's eight real packet/verdict pairs: all VALID; then with a key
//     deleted, a score of 3, an empty reason, an extra key and a missing file: each INVALID/MISSING (nonzero exit);
//   - writer-model.mjs on ET38's eight graders: all written by claude-opus-5-5; with an id that belongs to another packet's
//     grader: NOT SHOWN.
// Prints counts and ids only; no verdict reason and no answer.
//   node cal-grader-checks.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const L = `${SP}/l20d`, D = `${L}/cal-grader-checks`;
fs.rmSync(D, { recursive: true, force: true });
fs.mkdirSync(`${D}/blind`, { recursive: true });
let ok = true;
const check = (name, cond, extra = '') => { if (!cond) ok = false; console.log(`${cond ? 'OK ' : 'BAD'} ${name}${cond ? '' : `  ${String(extra).slice(0, 400)}`}`); };
const node = (args, cwd) => { const r = spawnSync(process.execPath, args, { encoding: 'utf8', cwd }); return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }; };

// ---- grader-models / grader-independence on L20c's graders ------------------------------------------------------------
const l20cIds = ['a02528bae24bf0c18', 'a8c57050941fd4f4c', 'a53f6def4949b9338', 'a221bf315c54b496d', 'afbc14011dd534b19', 'aee2a973128edb430', 'acf0bc86b1f2c7ac7', 'a2e4935e2c3ea0be8'];
let r = node([`${L}/grader-models.mjs`, 'a02528bae24bf0c18', 'a221bf315c54b496d', 'a53f6def4949b9338', 'a8c57050941fd4f4c', 'aee2a973128edb430', 'afbc14011dd534b19', 'a2e4935e2c3ea0be8', 'acf0bc86b1f2c7ac7']);
const known = fs.readFileSync(`${SP}/l20c/grader-models.out.txt`, 'utf8').trim();
check('grader-models on L20c\'s eight graders reproduces l20c/grader-models.out.txt exactly (7 OK, 1 PROBLEM, exit 1)', r.out.trim() === known && r.code === 1, r.out);
r = node([`${L}/grader-models.mjs`, 'a02528bae24bf0c18']);
check('grader-models on one clean grader (A-g1): one verdict file, claude-opus-5-5 only, exit 0', r.code === 0 && /verdicts-A-g1\.json\s+claude-opus-5-5 x\d+\s+OK/.test(r.out), r.out);
r = node([`${L}/grader-models.mjs`, 'a00000000000deadbeef']);
check('grader-models on an unknown agent id: "no transcript", exit 1', r.code === 1 && /no transcript/.test(r.out), r.out);
r = node([`${L}/grader-independence.mjs`, 'a02528bae24bf0c18', 'A-g1']);
check('grader-independence A-g1: 0 mention(s)', /^0 mention\(s\) of another grader's verdict file in a02528bae24bf0c18 \(A-g1\)/m.test(r.out), r.out);
r = node([`${L}/grader-independence.mjs`, 'aee2a973128edb430', 'C-g2']);
check('grader-independence C-g2 (the known case): 1 mention, a tool result of an `ls`', /^1 mention\(s\) of another grader's verdict file in aee2a973128edb430 \(C-g2\)/m.test(r.out) && /TOOL RESULT mentions/.test(r.out), r.out);
r = node([`${L}/grader-independence.mjs`, 'a02528bae24bf0c18', 'B-g1']);
check('grader-independence with a WRONG own label (A-g1\'s transcript read as B-g1): it must find mentions of "another" file (A-g1\'s own)', !/^0 mention/m.test(r.out.split('\n').at(-2) ?? r.out), r.out.split('\n').slice(-3).join(' | '));

// ---- validate-verdicts on ET38's real files in a temp folder ------------------------------------------------------------
fs.copyFileSync(`${L}/validate-verdicts.mjs`, `${D}/validate-verdicts.mjs`);
const SEATS = ['A-g1', 'A-g2', 'B-g1', 'B-g2', 'C-g1', 'C-g2', 'D-g1', 'D-g2'];
for (const p of ['A', 'B', 'C', 'D']) fs.copyFileSync(`${SP}/et38/blind/packet-${p}.json`, `${D}/blind/packet-${p}.json`);
for (const s of SEATS) fs.copyFileSync(`${SP}/et38/blind/verdicts-${s}.json`, `${D}/blind/verdicts-${s}.json`);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const val = (slots) => node([`${D}/validate-verdicts.mjs`, ...slots]);
r = val(SEATS);
check('validate-verdicts on ET38\'s eight real verdict files: all VALID, exit 0', r.code === 0 && (r.out.match(/: VALID /g) ?? []).length === 8, r.out);
const f = (s) => `${D}/blind/verdicts-${s}.json`;
const edit = (s, fn) => { const v = J(f(s)); fn(v); fs.writeFileSync(f(s), JSON.stringify(v)); };
edit('A-g1', (v) => { delete v[Object.keys(v)[0]]; });
edit('A-g2', (v) => { v[Object.keys(v)[0]].correctness = 3; });
edit('B-g1', (v) => { v[Object.keys(v)[0]].reason = ''; });
edit('B-g2', (v) => { v['S9Q99#1'] = { correctness: 2, on_topic: 2, delivery: 2, reason: 'x' }; });
fs.rmSync(f('C-g1'));
fs.writeFileSync(f('C-g2'), '{not json');
r = val(SEATS);
const has = (re) => re.test(r.out);
check('validate-verdicts: a key deleted -> INVALID missing 1; a score of 3 -> malformed 1; an empty reason -> malformed 1; an extra key -> extra 1; a file absent -> MISSING; broken JSON -> DOES NOT PARSE; the two untouched files stay VALID; exit 1',
    r.code === 1 && has(/A-g1: INVALID .*missing 1 /) && has(/A-g2: INVALID .*malformed 1 /) && has(/B-g1: INVALID .*malformed 1 /) && has(/B-g2: INVALID .*extra 1 /) && has(/C-g1: MISSING/) && has(/C-g2: DOES NOT PARSE/) && has(/D-g1: VALID/) && has(/D-g2: VALID/), r.out);

// ---- writer-model on ET38's graders ---------------------------------------------------------------------------------------
const et = Object.fromEntries(fs.readFileSync(`${SP}/et38/grader-agents.txt`, 'utf8').split('\n').map((l) => l.match(/^([A-D]-g[12]) ([0-9a-f]{17})$/)).filter(Boolean).map((m) => [m[1], m[2]]));
check('cal setup: ET38\'s eight grader ids read from grader-agents.txt', Object.keys(et).length === 8, JSON.stringify(Object.keys(et)));
r = node([`${L}/writer-model.mjs`, ...SEATS.map((s) => `${s}=${et[s]}`)]);
check('writer-model on ET38\'s eight graders as first dispatched: seven written by claude-opus-5-5, the first C-g2 (stopped at the session limit before it wrote anything) NOT SHOWN, "NOT ALL SHOWN"', /^NOT ALL SHOWN/m.test(r.out) && (r.out.match(/GRADED BY claude-opus-5-5/g) ?? []).length === 7 && /^C-g2: .*NOT SHOWN/m.test(r.out), r.out);
r = node([`${L}/writer-model.mjs`, ...SEATS.filter((s) => s !== 'C-g2').map((s) => `${s}=${et[s]}`), 'C-g2=a08f90b7f0db125f8']);
check('writer-model with the C-g2 re-run (a08f90b7f0db125f8, grader-agents.txt) in its place: all eight written by claude-opus-5-5, "ALL"', /^ALL: the verdicts were written by claude-opus-5-5/m.test(r.out) && (r.out.match(/GRADED BY claude-opus-5-5/g) ?? []).length === 8, r.out);
r = node([`${L}/writer-model.mjs`, `A-g1=${et['B-g1']}`]);
check('writer-model with another packet\'s grader id under the label A-g1 -> NOT SHOWN (it never wrote verdicts-A-g1.json)', /NOT SHOWN/.test(r.out) && !/GRADED BY/.test(r.out), r.out);
console.log(ok ? 'GRADER CHECKS CALIBRATION OK' : 'GRADER CHECKS CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
