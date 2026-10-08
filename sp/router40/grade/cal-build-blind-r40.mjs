// Known-answer cases of P5 (build-blind-r40.mjs), A3.6 + A4 D1. Inputs: live40-r1 (real, A), a synthetic complete router40-R made by run-r.mjs --dry (scripted replies), a synthetic
// router40-L answers file. Everything in a temp folder; prints counts and booleans only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { calRun } from '../cal-util.mjs';
import { R40, L40, readJson, loadItems } from '../r40-common.mjs';

const C = calRun('build-blind-r40');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r40-cal-p5-'));
const RUNS = path.join(TMP, 'runs'); fs.mkdirSync(RUNS);
const RUL = path.join(TMP, 'rul.txt');
fs.writeFileSync(RUL, `${fs.readFileSync(`${R40}/USER-RULINGS.txt`, 'utf8')}\nF 2026-10-06: 0 — G sitting: none today — stub\n`, 'utf8');
const { items } = loadItems();
const dry = (name, extra = []) => spawnSync(process.execPath, [`${R40}/run-r.mjs`, '--dry', '--variant', 'B', '--stub-rulings', RUL, '--out-dir', RUNS, '--name', name, ...extra], { encoding: 'utf8' });
const t = dry('router40-R');
const stoppedTasks = path.join(TMP, 'stop.json'); fs.writeFileSync(stoppedTasks, JSON.stringify({ initial: [], after: { 1: [{ name: 'Natively-x', state: 'Running', nextRun: null }] } }));
const t2 = dry('router40-R-smoke-synthetic-stopped', ['--stub-tasks', stoppedTasks]); // a stopped run under another name
const stoppedFiles = fs.readdirSync(RUNS).filter((f) => f.startsWith('router40-R-'));
const L = { name: 'router40-L', model: 'x', records: {}, holes: ['RH14'], cap: 60, complete: true, stopReason: null };
items.forEach((it, i) => { if (it.id !== 'RH14') L.records[it.id] = { spoken: `L answer text number ${i + 1}, which is a short and plain sentence.`, words: 12, ttft: 3000, total: 4000, thoughts: 5, finish: 'STOP', attempts: 1, orphan: false }; });
fs.writeFileSync(path.join(RUNS, 'router40-L.answers.json'), JSON.stringify(L));
// a COMPLETE run under a stopped-run style name: only the name rule can refuse it
for (const [a, b] of [['router40-R.json', 'router40-R-1002.json'], ['router40-R.answers.json', 'router40-R-1002.answers.json']]) fs.copyFileSync(path.join(RUNS, a), path.join(RUNS, b));
C.check('P5-0', 'setup: synthetic complete router40-R (dry run) + a stopped run under another name + a synthetic L (46 answers, RH14 hole)', 'dry runs exit 0 and 3; files present', `exit ${t.status} and ${t2.status}; stopped-run files ${stoppedFiles.length}`, t.status === 0 && t2.status === 3 && stoppedFiles.length === 2);

const build = (outDir, extra = [], runs = RUNS) => spawnSync(process.execPath, [`${R40}/grade/build-blind-r40.mjs`, '--runs-dir', runs, '--out-dir', outDir, '--allow-dry', ...extra], { encoding: 'utf8' });
const O1 = path.join(TMP, 'out1');
let b = build(O1);
C.check('P5-1', 'build from the synthetic inputs', 'exit 0, "A questions equal live40\'s 46/46"', `exit ${b.status}; ${(b.stdout.match(/A questions equal live40's \d+\/\d+/) ?? ['no line'])[0]}`, b.status === 0 && /A questions equal live40's 46\/46/.test(b.stdout));

const key = readJson(path.join(O1, 'keyhold', 'key.json'));
const files = [1, 2, 3, 4].map((n) => readJson(path.join(O1, 'blind', `pairs.blind-${n}.json`)).items);
// independent recount of the arms from the inputs
const expA = 46, expL = items.length - 1, expRL = items.filter((i) => (i.class === 'E' && i.id !== 'RE05') || i.id === 'EF02').length; // the script's words40 items
const armCount = (a) => Object.values(key).flatMap((km) => Object.values(km)).filter((m) => m.arm === a).length;
C.check('P5-2', 'answer counts per arm equal the run files (A 46 from live40-r1; L 46 = 47 - the RH14 hole; RL = the 20 items whose scripted reply is an answer)', `A ${expA}, L ${expL}, RL ${expRL}`, `A ${armCount('A')}, L ${armCount('L')}, RL ${armCount('RL')}`);
const order = loadItems().chains.flatMap((c) => c.items);
const sizes = [12, 12, 12, 11], bounds = [0, 12, 24, 36, 47];
const slices = sizes.map((_, i) => order.slice(bounds[i], bounds[i + 1]));
const noAnswer = new Set(['RH14']); // no A answer, an L hole in this fixture, R said hard: cut into a file by position but holds no answer
const expIds = slices.map((ids) => ids.filter((id) => !noAnswer.has(id)).length);
const idsPerFile = Object.values(key).map((km) => new Set(Object.values(km).map((m) => m.id)).size);
C.check('P5-3', 'files cut by whole items at positions 1-12, 13-24, 25-36, 37-47 of the 47 (RH14 sits in file 3 with no answer in this fixture, so it is absent there); each file <= 36 answers', `${expIds.join(',')} items with answers; max answers <= 36`, `${idsPerFile.join(',')} items; answers ${files.map((f) => f.length).join(',')}`, idsPerFile.join() === expIds.join() && files.every((f) => f.length <= 36));
const fileOfId = {}; let whole = true;
Object.entries(key).forEach(([tag, km]) => { for (const m of Object.values(km)) { if (fileOfId[m.id] && fileOfId[m.id] !== tag) whole = false; fileOfId[m.id] = tag; } });
C.check('P5-4', 'every answer of an item sits in the same file; every item with an answer is placed', 'true, 46 items', `${whole}, ${Object.keys(fileOfId).length} items`, whole && Object.keys(fileOfId).length === 46 && !('RH14' in fileOfId));
C.check('P5-5', 'each placed item sits in the file of its chain-order slice', 'true', String(slices.every((ids, i) => ids.filter((id) => !noAnswer.has(id)).every((id) => fileOfId[id] === `blind-${i + 1}`))));
// A's questions equal live40's pairs via its key (independent of the builder's own check)
const lp = readJson(`${L40}/grade/blind/pairs.blind-1.json`).items, lk = readJson(`${L40}/grade/keyhold/key.json`);
const liveQ = Object.fromEntries(lp.map((p) => [lk[p.key].id, p.question]));
let eqA = 0, nA = 0;
files.forEach((f, i) => { const km = key[`blind-${i + 1}`]; for (const x of f) if (km[x.key].arm === 'A') { nA++; if (x.question === liveQ[km[x.key].id]) eqA++; } });
C.check('P5-6', "A's questions equal live40's pairs.blind-1.json's via its key (independent recomputation)", '46/46', `${eqA}/${nA}`);
const q1 = files.flat().filter((x) => /Follow-up to:/.test(x.question)).length;
C.check('P5-7', 'follow-up answers carry the [Follow-up to: <parent>] question (16 follow-ups x their arms)', `${[...Object.values(key)].flatMap((km) => Object.values(km)).filter((m) => m.parent).length} answers with a follow-up question`, `${q1}`, q1 === [...Object.values(key)].flatMap((km) => Object.values(km)).filter((m) => m.parent).length);
// no id / arm / class strings in any blind file; the scan itself is calibrated with a positive control
const LEAK = /\b(?:RE|RH|EF)\d{2}\b|\bC\d{2}\b|"arm"|"class"|"route"|router40|keyhold|live40|\bRL\b/;
const blindText = [1, 2, 3, 4].map((n) => fs.readFileSync(path.join(O1, 'blind', `pairs.blind-${n}.json`), 'utf8'));
C.check('P5-8', 'grep over the 4 blind files for item ids, chain ids, arm/class/route keys, router40/live40/keyhold', '0 hits in every file', `${blindText.map((s) => (s.match(new RegExp(LEAK.source, 'g')) ?? []).length).join(',')} hits`, blindText.every((s) => !LEAK.test(s)));
C.check('P5-8b', 'positive control for that grep: the same text with one item id appended', 'detected', String(LEAK.test(`${blindText[0]} RH07`)) === 'true' ? 'detected' : 'MISSED', LEAK.test(`${blindText[0]} RH07`));
// keys neutral and contiguous, answers actually shuffled across arms
const keysOk = files.every((f) => f.every((x, i) => x.key === `q${String(i + 1).padStart(2, '0')}` && x.id === x.key));
const idsInKeyOrder = files[0].map((x) => key['blind-1'][x.key].id);
const chainIdx = (id) => loadItems().chains.flatMap((c) => c.items).indexOf(id);
const sortedIds = [...idsInKeyOrder].sort((a, b) => chainIdx(a) - chainIdx(b));
const shuffled = JSON.stringify(idsInKeyOrder) !== JSON.stringify(sortedIds);
const transitions = files[0].map((x) => key['blind-1'][x.key].arm).reduce((n, a, i, arr) => n + (i && arr[i - 1] !== a ? 1 : 0), 0);
C.check('P5-9', 'neutral contiguous keys q01.. per file; arms interleaved (>= 8 arm changes along file 1); the item order along the keys is NOT the chain order (the answers were shuffled)', 'true; >= 8; shuffled', `${keysOk}; ${transitions}; ${shuffled ? 'shuffled' : 'IN CHAIN ORDER'}`, keysOk && transitions >= 8 && shuffled);
// deterministic: the same seed gives the same bytes
const O2 = path.join(TMP, 'out2'); build(O2);
const h = (d) => [1, 2, 3, 4].map((n) => createHash('sha256').update(fs.readFileSync(path.join(d, 'blind', `pairs.blind-${n}.json`))).digest('hex').slice(0, 8)).join(',');
C.check('P5-10', 'the registered seed makes two builds byte-identical', 'equal', h(O1) === h(O2) ? 'equal' : 'DIFFERENT');
// refusals
b = build(path.join(TMP, 'out3'), ['--r-name', 'router40-R-1002']);
C.check('P5-11', 'a router40-R-<hhmm> style input (here a COMPLETE run copied to router40-R-1002, so only the name rule can refuse it)', 'REFUSED (exit 2) naming the graded name, nothing built', `exit ${b.status}; name rule ${/only the graded router40-R run is accepted/.test(b.stdout)}; out dir exists ${fs.existsSync(path.join(TMP, 'out3'))}`, b.status === 2 && /only the graded router40-R run is accepted/.test(b.stdout) && !fs.existsSync(path.join(TMP, 'out3')));
b = build(path.join(TMP, 'out4'), ['--r-name', 'router40-R-smoke']);
C.check('P5-12', 'the C02 smoke name router40-R-smoke (A4 D1: any non-graded name)', 'REFUSED (exit 2): the name rule', `exit ${b.status}; name rule ${/only the graded router40-R run is accepted/.test(b.stdout)}`, b.status === 2 && /only the graded router40-R run is accepted/.test(b.stdout));
b = build(O1);
C.check('P5-13', 'a second build into the same out dir', 'REFUSED (exit 2), never overwritten', `exit ${b.status}`, b.status === 2 && /REFUSED/.test(b.stdout));
// incomplete R / dry without the flag / incomplete L
const RUNS2 = path.join(TMP, 'runs2'); fs.mkdirSync(RUNS2);
for (const f of ['router40-R.json', 'router40-R.answers.json', 'router40-L.answers.json']) fs.copyFileSync(path.join(RUNS, f), path.join(RUNS2, f));
const rj = readJson(path.join(RUNS2, 'router40-R.json')); rj.complete = false; fs.writeFileSync(path.join(RUNS2, 'router40-R.json'), JSON.stringify(rj));
b = build(path.join(TMP, 'out5'), [], RUNS2);
C.check('P5-14', 'router40-R with complete=false', 'REFUSED (exit 2)', `exit ${b.status}`, b.status === 2);
fs.copyFileSync(path.join(RUNS, 'router40-R.json'), path.join(RUNS2, 'router40-R.json'));
const lj = readJson(path.join(RUNS2, 'router40-L.answers.json')); lj.complete = false; fs.writeFileSync(path.join(RUNS2, 'router40-L.answers.json'), JSON.stringify(lj));
b = build(path.join(TMP, 'out6'), [], RUNS2);
C.check('P5-15', 'router40-L with complete=false', 'REFUSED (exit 2)', `exit ${b.status}`, b.status === 2);
b = spawnSync(process.execPath, [`${R40}/grade/build-blind-r40.mjs`, '--runs-dir', RUNS, '--out-dir', path.join(TMP, 'out7')], { encoding: 'utf8' });
C.check('P5-16', 'the dry (mock) router40-R without --allow-dry', 'REFUSED (exit 2)', `exit ${b.status}`, b.status === 2 && /dry/.test(b.stdout));
// A8.4 step 4 (M-2 freeze): the build record holds read-r.mjs's sha256, beside the key, outside the blind folder
const realSha = createHash('sha256').update(fs.readFileSync(`${R40}/read-r.mjs`)).digest('hex');
const brec = fs.existsSync(path.join(O1, 'keyhold', 'build-record.json')) ? readJson(path.join(O1, 'keyhold', 'build-record.json')) : null;
C.check('P5-18', 'the build record also holds readerOutputSha256 (64 hex)', '64 hex', /^[0-9a-f]{64}$/.test(brec?.readerOutputSha256 ?? '') ? '64 hex' : 'absent', /^[0-9a-f]{64}$/.test(brec?.readerOutputSha256 ?? ''));
C.check('P5-17', "the build record keyhold/build-record.json holds read-r.mjs's real sha256 and is not in the blind folder", 'readRSha256 = the file\'s sha; not in blind/', `sha ${brec?.readRSha256 === realSha ? 'equal' : 'DIFFERENT/absent'}; in blind/ ${fs.existsSync(path.join(O1, 'blind', 'build-record.json'))}`, brec?.readRSha256 === realSha && !fs.existsSync(path.join(O1, 'blind', 'build-record.json')));
fs.rmSync(TMP, { recursive: true, force: true });
C.finish();
