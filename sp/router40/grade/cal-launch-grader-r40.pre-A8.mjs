// Known-answer cases of P6 (launch-grader-r40.mjs), A3.6. No Claude call: dry runs, refusals, and ONE full launch against the stand-in for the claude binary (cal-fake-claude.mjs via
// TURN_FAKE_CLAUDE; the launcher in --calibration refuses to start without it). Prints booleans and counts only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { calRun } from '../cal-util.mjs';
import { R40, SP, MAIN, readJson, TONIGHT_LINE } from '../r40-common.mjs';

const C = calRun('launch-grader-r40');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r40-cal-p6-'));
const ROOT = path.join(TMP, 'grade'); fs.mkdirSync(path.join(ROOT, 'blind'), { recursive: true });
const FAKE = `${R40}/grade/cal-fake-claude.mjs`, LAUNCH = `${R40}/grade/launch-grader-r40.mjs`;
const items = [1, 2, 3].map((i) => ({ key: `q0${i}`, id: `q0${i}`, kind: 'spoken', level: null, topic: null, question: `A synthetic question number ${i}?`, heard: 'x', source: 'answers-pass', answer: `A synthetic answer ${i}.` }));
for (const n of [1, 2]) fs.writeFileSync(path.join(ROOT, 'blind', `pairs.blind-${n}.json`), JSON.stringify({ model: 'm', rubric: 'r', items }));
const wf = (name, text) => { const p = path.join(TMP, name); fs.writeFileSync(p, text, 'utf8'); return p; };
const RUL = wf('rul.txt', `${fs.readFileSync(`${R40}/USER-RULINGS.txt`, 'utf8')}\nF 2026-10-06: 0 — G sitting: none today — stub\n`);
// tonight's bundle (A5.5 + A7 m5): the tonight line, a clock inside the window, both arms complete (a stub)
const RUL_T = wf('rul-t.txt', `${fs.readFileSync(`${R40}/USER-RULINGS.txt`, 'utf8').split(/\r?\n/).filter((l) => !l.trim().startsWith('TONIGHT ')).join('\n')}\n${TONIGHT_LINE}\n`);
const PROCS = wf('procs.json', JSON.stringify([{ name: 'explorer.exe', pid: 1, cmd: '' }]));
const TASKS = wf('tasks.json', '[]');
const BUNDLE = ['--now', '2026-10-06T10:01', '--stub-rulings', RUL, '--stub-procs', PROCS, '--stub-tasks', TASKS, '--stub-gsitting', path.join(TMP, 'no-gsitting.log')];
const run = (args, env = {}) => spawnSync(process.execPath, [LAUNCH, ...args], { encoding: 'utf8', env: { ...process.env, TURN_FAKE_CLAUDE: FAKE, TURN_PROJECTS: path.join(TMP, 'projects'), ...env }, maxBuffer: 64 << 20 });
const runReal = (args) => { const e = { ...process.env }; for (const k of ['TURN_FAKE_CLAUDE', 'TURN_PROJECTS', 'TURN_GRADING_DIR']) delete e[k]; return spawnSync(process.execPath, [LAUNCH, ...args], { encoding: 'utf8', env: e }); };
const bundleT = (now, arms = 'R,L', procs = PROCS) => ['--now', now, '--stub-rulings', RUL_T, '--stub-procs', procs, '--stub-tasks', TASKS, '--stub-gsitting', path.join(TMP, 'no-gsitting.log'), '--stub-arms', arms];
const G = (tag) => path.join(TMP, 'g', tag); // a grading dir per case (fresh)

// 1. dry-run, a grader slot, full stub bundle
let r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('1'), ...BUNDLE]);
const facts = /facts: model (\S+); tools (\S+); --add-dir count (\d+); Bash in argv (\w+); cwd outside MAIN and the worktree (\w+)/.exec(r.stdout) ?? [];
const rules = (/permission rules: (.+)/.exec(r.stdout)?.[1] ?? '').split(' | ');
const norm = (p) => p.replace(/\\/g, '/').toLowerCase();
C.check('P6-1', '--dry-run blind-1.g1: the argv', 'exit 0; model claude-opus-5-5; tools Read,Write,Edit; zero --add-dir; no Bash; cwd outside MAIN and the worktree, fresh', `exit ${r.status}; model ${facts[1]}; tools ${facts[2]}; add-dir ${facts[3]}; Bash ${facts[4]}; outside ${facts[5]}; fresh ${/\(fresh\)/.test(r.stdout)}`,
    r.status === 0 && facts[1] === 'claude-opus-5-5' && facts[2] === 'Read,Write,Edit' && facts[3] === '0' && facts[4] === 'false' && facts[5] === 'true' && /\(fresh\)/.test(r.stdout));
C.check('P6-1b', 'the model flag: exactly one --model, no `opus` alias left in the argv line', '1 occurrence, 0 aliases', `${(r.stdout.match(/--model /g) ?? []).length} occurrence(s); alias present ${/--model opus\b/.test(r.stdout)}`, (r.stdout.match(/--model /g) ?? []).length === 1 && !/--model opus\b/.test(r.stdout));
C.check('P6-1c', 'permission rules: Read of the own pairs file, Read of the rubric, Edit of the own verdicts file, nothing else', '3 rules: Read(pairs.blind-1), Read(rubric), Edit(verdicts.blind-1.g1)', `${rules.length} rules; ${rules.map((x) => x.split('(')[0] + ':' + path.basename(x.replace(/\)$/, ''))).join(' ')}`, rules.length === 3 && /^Read\(.*pairs\.blind-1\.json\)$/.test(rules[0]) && /^Read\(.*interview60\.grader-prompt\.md\)$/.test(rules[1]) && /^Edit\(.*verdicts\.blind-1\.g1\.json\)$/.test(rules[2]) && norm(rules[0]).includes(norm(ROOT).slice(2)));
// 2. an existing cwd -> REFUSED
fs.mkdirSync(path.join(G('2'), 'blind-1.g1-a1'), { recursive: true });
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('2'), ...BUNDLE]);
C.check('P6-2', 'the cwd already exists', 'REFUSED (exit 2)', `exit ${r.status}; ${/REFUSED/.test(r.stdout)}`, r.status === 2 && /already exists/.test(r.stdout));
// 3. a live FR slot -> REFUSED (m7)
const slots = path.join(TMP, 'frslots'); fs.mkdirSync(path.join(slots, 'slot-1'), { recursive: true }); fs.writeFileSync(path.join(slots, 'slot-1', 'pid'), String(process.pid));
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('3'), '--stub-fr-slots', slots, ...BUNDLE]);
C.check('P6-3', 'a stub FR grader slot holding a live pid (this process)', 'REFUSED (exit 2)', `exit ${r.status}; ${/FR grader slot/.test(r.stdout)}`, r.status === 2 && /FR grader slot/.test(r.stdout));
fs.writeFileSync(path.join(slots, 'slot-1', 'pid'), '2147483000');
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('3b'), '--stub-fr-slots', slots, ...BUNDLE]);
C.check('P6-3b', 'negative control: the same slot with a dead pid', 'not refused: exit 0', `exit ${r.status}`, r.status === 0);
// 4. the classifier mode
r = run(['--classify', 'c3', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('4'), ...BUNDLE]);
const f4 = /facts: model (\S+); tools (\S+); --add-dir count (\d+); Bash in argv (\w+); cwd outside MAIN and the worktree (\w+)/.exec(r.stdout) ?? [];
const rules4 = (/permission rules: (.+)/.exec(r.stdout)?.[1] ?? '').split(' | ');
const OUT3 = path.join(ROOT, 'classify', 'verdicts.c3.json');
const win = (p) => path.resolve(p).replace(/\//g, '\\');
const expPrompt = fs.readFileSync(`${R40}/l38base-dispatch.txt`, 'utf8').split('<TURNS>').join(win(`${R40}/turns-for-classifiers.json`)).split('<CAL>').join(win(`${SP}/l38base/blind/cal-blind.json`)).split('<OUT>').join(win(OUT3));
const expSha = createHash('sha256').update(expPrompt).digest('hex').slice(0, 12);
C.check('P6-4', '--classify c3 --dry-run: rules, model, flags', 'exit 0; 3 rules = Read TURNS, Edit OUT, Read CAL; claude-opus-5-5; no Bash; zero --add-dir', `exit ${r.status}; ${rules4.length} rules ${rules4.map((x) => x.split('(')[0] + ':' + path.basename(x.replace(/\)$/, ''))).join(' ')}; model ${f4[1]}; Bash ${f4[4]}; add-dir ${f4[3]}`,
    r.status === 0 && rules4.length === 3 && /^Read\(.*turns-for-classifiers\.json\)$/.test(rules4[0]) && /^Edit\(.*verdicts\.c3\.json\)$/.test(rules4[1]) && /^Read\(.*cal-blind\.json\)$/.test(rules4[2]) && f4[1] === 'claude-opus-5-5' && f4[4] === 'false' && f4[3] === '0');
C.check('P6-4b', 'the classifier prompt = the P1 dispatch text with only <TURNS>, <CAL>, <OUT> substituted (independent recomputation of its sha12)', expSha, /<prompt \d+ chars sha12 (\w+)>/.exec(r.stdout)?.[1] ?? 'none');
// 5. the clock and the G sitting (A2.4)
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('5'), ...BUNDLE.map((x, i, a) => (a[i - 1] === '--now' ? '2026-10-06T09:59' : x))]);
C.check('P6-5', 'a stub clock 2026-10-06T09:59 (after the tonight window, before 10:00 tomorrow)', 'REFUSED (exit 3), date gate named', `exit ${r.status}; date gate ${/date gate \(grade/.test(r.stdout)}`, r.status === 3 && /date gate \(grade/.test(r.stdout));
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('5b'), ...BUNDLE.map((x, i, a) => (a[i - 1] === '--now' ? '2026-10-05T21:44' : x))]);
C.check('P6-5b', 'a stub clock 2026-10-05T21:44 (before the window)', 'REFUSED (exit 3), date gate named', `exit ${r.status}; date gate ${/date gate \(grade/.test(r.stdout)}`, r.status === 3 && /date gate \(grade/.test(r.stdout));
// A5.5 + A7 m5: grading tonight is all-or-nothing
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('5c'), ...bundleT('2026-10-05T22:30')]);
C.check('P6-15', 'A7 m5: 2026-10-05T22:30, both arms complete (stub), tonight line: the FIRST launch needs 10 x 25 min', 'REFUSED (exit 3) at "now + est < deadline", est line says 10 launch(es)', `exit ${r.status}; est line 10 launches ${/grading est: 10 launch/.test(r.stdout)}; deadline row ${/now \+ est < deadline/.test(r.stdout)}`, r.status === 3 && /grading est: 10 launch/.test(r.stdout) && /now \+ est < deadline/.test(r.stdout));
const g9 = G('5d'); for (let i = 1; i <= 9; i++) fs.mkdirSync(path.join(g9, `blind-${(i % 4) + 1}.g${i % 2 + 1}-a${i}`), { recursive: true }); // nine launches already made
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', g9, ...bundleT('2026-10-05T22:30')]);
C.check('P6-15b', 'A7 m5 negative control: the same clock with 9 launches already made (the last launch: 25 min, 22:55 < 23:15)', 'dry-run allowed (exit 0), est line 1 launch(es)', `exit ${r.status}; est line ${/grading est: 1 launch/.test(r.stdout)}`, r.status === 0 && /grading est: 1 launch/.test(r.stdout));
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', g9, ...bundleT('2026-10-05T22:30', 'L')]);
C.check('P6-16', 'A5.5: tonight with router40-R incomplete (a stub)', 'REFUSED (exit 3) at "both arms complete"', `exit ${r.status}; row ${/both arms complete/.test(r.stdout)}`, r.status === 3 && /both arms complete/.test(r.stdout));
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', g9, ...bundleT('2026-10-05T22:30', 'R')]);
C.check('P6-16b', 'A5.5: tonight with router40-L incomplete (a stub)', 'REFUSED (exit 3) at "both arms complete"', `exit ${r.status}; row ${/both arms complete/.test(r.stdout)}`, r.status === 3 && /both arms complete/.test(r.stdout));
const PROCS_L = wf('procs-l.json', JSON.stringify([{ name: 'node.exe', pid: 5, cmd: 'node C:\\x\\router40\\lite-l.mjs --cap 60' }]));
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', g9, ...bundleT('2026-10-05T22:30', 'R,L', PROCS_L)]);
C.check('P6-17', 'A7 m4: a lite-l.mjs process running while a grader launches (any other harness process refuses)', 'REFUSED (exit 3) at "no other router40 harness process"', `exit ${r.status}; row ${/no other router40 harness process/.test(r.stdout)}`, r.status === 3 && /no other router40 harness process/.test(r.stdout));
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('5e'), ...BUNDLE.map((x, i, a) => (a[i - 1] === '--stub-rulings' ? RUL_T : x)).map((x, i, a) => (a[i - 1] === '--now' ? '2026-10-06T10:01' : x))]);
C.check('P6-18', 'tomorrow 10:01 with the tonight line but NO F line (the F line is what tomorrow requires)', 'REFUSED (exit 3) at "exactly one valid F line"', `exit ${r.status}; row ${/exactly one valid F line/.test(r.stdout)}`, r.status === 3 && /exactly one valid F line/.test(r.stdout));
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('5f'), ...BUNDLE]);
C.check('P6-19', 'tomorrow 10:01 with a valid F line: the dry run is allowed, est line 1 launch (25 min, tomorrow rules unchanged)', 'exit 0, est line 1 launch(es)', `exit ${r.status}; est line ${/grading est: 1 launch/.test(r.stdout)}`, r.status === 0 && /grading est: 1 launch/.test(r.stdout));
const gs = wf('gs.log', '2026-10-06 10:00 STEP arm-3 start\n');
r = run(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('6'), ...BUNDLE.map((x, i, a) => (a[i - 1] === '--stub-gsitting' ? gs : x))]);
C.check('P6-6', 'a stub open gsitting STEP', 'REFUSED (exit 3), STEP named', `exit ${r.status}; STEP ${/no STEP without its end/.test(r.stdout)}`, r.status === 3 && /no STEP without its end/.test(r.stdout));
// 6. real mode
r = runReal(['blind-1.g1', '--now', '2026-10-06T10:01']);
C.check('P6-7', 'real mode with --now 2026-10-06T10:01', 'exit 2, REFUSED', `exit ${r.status}; ${/REFUSED/.test(r.stdout)}`, r.status === 2 && /stub input/.test(r.stdout));
r = runReal(['blind-1.g1', '--now', '2026-10-05T22:30', '--stub-arms', 'R,L']);
C.check('P6-7b', 'real mode with --now 2026-10-05T22:30 / --stub-arms', 'exit 2, REFUSED', `exit ${r.status}; ${/REFUSED/.test(r.stdout)}`, r.status === 2 && /stub input/.test(r.stdout));
r = runReal(['blind-1.g1', '--calibration']);
C.check('P6-8', '--calibration without TURN_FAKE_CLAUDE (it must never start the real claude binary)', 'exit 2, REFUSED', `exit ${r.status}; ${/TURN_FAKE_CLAUDE/.test(r.stdout)}`, r.status === 2 && /TURN_FAKE_CLAUDE/.test(r.stdout));
if (fs.existsSync(`${R40}/grade/blind/pairs.blind-1.json`)) C.skip('P6-9', 'a genuine real invocation on the default folders', 'the real blind files now exist, so a real invocation could pass its guards and launch a real grader');
else { r = runReal(['blind-1.g1']);
C.check('P6-9', 'a genuine real invocation (default folders: no blind files exist yet)', 'exit 2, nothing launched', `exit ${r.status}; launches.jsonl exists ${fs.existsSync(`${R40}/grade/blind/launches.jsonl`)}`, r.status === 2 && !fs.existsSync(`${R40}/grade/blind/launches.jsonl`)); }
r = runReal(['blind-1.g1', '--dry-run', '--out-dir', ROOT, '--grading-dir', G('9')]);
const realNow = new Date(), inWinNow = +realNow >= +new Date(2026, 9, 5, 21, 45, 0) && +realNow < +new Date(2026, 9, 5, 23, 15, 0);
C.check('P6-10', `a real clock (${realNow.toTimeString().slice(0, 5)}, ${inWinNow ? 'INSIDE' : 'OUTSIDE'} the window), --dry-run on a temp blind folder, no stub: never launches, REFUSED`, inWinNow ? 'REFUSED (exit 3) at the 250 min estimate (the arms are not complete)' : 'REFUSED (exit 3): the date gate names the arm', `exit ${r.status}; date gate ${/date gate \(grade/.test(r.stdout)}; est row ${/now \+ est < deadline/.test(r.stdout)}; arms row ${/both arms complete/.test(r.stdout)}`, r.status === 3 && (inWinNow ? /now \+ est < deadline/.test(r.stdout) : /date gate \(grade/.test(r.stdout)));
// 7. one full launch through the stand-in: the real spawn path, cwd creation, slot lock, launches.jsonl, verdict validation
r = run(['blind-1.g1', '--calibration', '--out-dir', ROOT, '--grading-dir', G('7'), ...BUNDLE]);
const cwd7 = path.join(G('7'), 'blind-1.g1-a1');
const argvSeen = fs.existsSync(path.join(cwd7, 'argv.json')) ? readJson(path.join(cwd7, 'argv.json')) : {};
const launches = fs.existsSync(path.join(ROOT, 'blind', 'launches.jsonl')) ? fs.readFileSync(path.join(ROOT, 'blind', 'launches.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
C.check('P6-11', 'full launch against the stand-in (blind-1.g1)', 'exit 0; the stand-in received model claude-opus-5-5, tools Read,Write,Edit, 0 --add-dir, dontAsk, strict MCP, 3 allow rules; cwd created; 1 launches.jsonl line; verdicts valid on its pairs (3 keys); slot lock released',
    `exit ${r.status}; model ${argvSeen.model}; tools ${argvSeen.tools}; add-dir ${argvSeen.addDirs}; dontAsk ${argvSeen.dontAsk}; strict ${argvSeen.strictMcp}; rules ${argvSeen.allowedTools?.length}; cwd made ${fs.existsSync(cwd7)}; launches ${launches.length}; ${/verdicts file valid on its pairs \(3 keys\)/.test(r.stdout)}; slot lock left ${fs.existsSync(path.join(G('7'), '.slots', 'slot-1'))}`,
    r.status === 0 && argvSeen.model === 'claude-opus-5-5' && argvSeen.tools === 'Read,Write,Edit' && argvSeen.addDirs === 0 && argvSeen.dontAsk && argvSeen.strictMcp && argvSeen.allowedTools?.length === 3 && fs.existsSync(cwd7) && launches.length === 1 && /verdicts file valid on its pairs \(3 keys\)/.test(r.stdout) && !fs.existsSync(path.join(G('7'), '.slots', 'slot-1')));
r = run(['blind-1.g1', '--calibration', '--out-dir', ROOT, '--grading-dir', G('7'), ...BUNDLE]);
C.check('P6-12', 'the same slot again (its verdicts file now exists)', 'REFUSED (exit 2): move the earlier verdicts away first', `exit ${r.status}; ${/already exists/.test(r.stdout)}`, r.status === 2 && /already exists/.test(r.stdout));
r = run(['blind-2.g2', '--calibration', '--out-dir', ROOT, '--grading-dir', G('7'), ...BUNDLE], { FAKE_MODE: 'noverdicts' });
C.check('P6-13', 'a stand-in that writes no verdicts file (a died/incomplete grader)', 'exit 1, "verdicts file MISSING/INVALID"', `exit ${r.status}; ${/MISSING\/INVALID/.test(r.stdout)}`, r.status === 1 && /MISSING\/INVALID/.test(r.stdout));
r = run(['--classify', 'c4', '--calibration', '--out-dir', ROOT, '--grading-dir', G('7'), ...BUNDLE]);
C.check('P6-14', 'full classifier launch against the stand-in (c4)', 'exit 0; "output valid on 69 keys"', `exit ${r.status}; ${(/output (valid on \d+ keys|invalid[^;]*)/.exec(r.stdout) ?? ['none'])[0]}`, r.status === 0 && /output valid on 69 keys/.test(r.stdout));
fs.rmSync(TMP, { recursive: true, force: true });
C.finish();
