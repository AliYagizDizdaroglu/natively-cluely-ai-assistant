// Calibration of build-blind-rd.mjs (plan Task 14A, with the fix1 rulings B1, I1, I2, I3, M1 and the superseded rule).
// SYNTHETIC capture files only: answer texts are made-up strings; nothing real is read. Prints ids, counts and hashes, never text.
// Output: cal-build-blind-rd.txt (RD_CAL_OUT overrides the folder; RD_BUILDER points the cal at a mutated builder copy).
//   node cal-build-blind-rd.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LAB = path.dirname(fileURLToPath(import.meta.url));
const BUILDER = process.env.RD_BUILDER ?? path.join(LAB, 'build-blind-rd.mjs');
const ROOT = process.env.RD_WT ?? 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-d';
const { LIVE40 } = await import(pathToFileURL(`${ROOT}/electron/test/golden/live40.questions.mjs`).href);

const lines = []; let fails = 0, total = 0;
const say = (s) => { console.log(s); lines.push(s); };
const check = (id, desc, expected, actual, ok = String(expected) === String(actual)) => { total++; if (!ok) fails++; say(`${ok ? 'PASS' : 'FAIL'}  ${id} | ${desc} | expected: ${expected} | actual: ${actual}`); };
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const fileSha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rd-cal-14a-'));
const LABEL = 'router-default-r1'; // must equal the builder's REGISTERED_RUN_LABEL (checked at the end)
const STAMP = '2026-10-07T20-00-05'; // the harness's stamp: new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), interview60.run.mjs:598
const REAL = `${STAMP}-${LABEL}`;

// ---- synthetic captures. The text is a function of (kind, id, turn) so a source hash can be recomputed independently.
const txt = (kind, id, turn) => `synthetic ${kind} answer for ${id} turn ${turn}: one plain sentence made up for the calibration.`;
const ent = (id, turn, kind, appended, extra = {}) => ({ id, turn, text: txt(kind, id, turn), words: 12, firstMs: 900, endMs: 4000, q_src: 'vad', ...(appended === undefined ? {} : { appended }), ...extra });
const HOUR_START = Date.parse('2026-10-07T12:00:00.000Z'), HOUR_END = HOUR_START + 3600e3;
const HEADER = (ms) => `=== Natively session started ${new Date(ms).toISOString()} ===`;
function makeRun(name, live, shadow, log = '[App] started\n', rawLog = false, timeline = true) { // a run folder `name` under a fresh parent, holding the two capture files and natively_debug.log (log === null: no log file)
    const dir = path.join(TMP, `p${fs.readdirSync(TMP).length}`, name); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'interview60.answers.router-live.json'), JSON.stringify(live));
    fs.writeFileSync(path.join(dir, 'interview60.answers.router-shadow.json'), JSON.stringify(shadow));
    if (log !== null) fs.writeFileSync(path.join(dir, 'natively_debug.log'), rawLog ? log : `${HEADER(HOUR_START - 60000)}\n${log}`); // a plain log gets one session header 1 min before the hour
    if (timeline) fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify({ startedMs: HOUR_START, endedMs: HOUR_END, items: [] }));
    return dir;
}
const liveOf = (ids) => ids.map((id, i) => ent(id, i + 1, 'live'));
const shadowOf = (spec) => spec.map(([id, appended, turn]) => ent(id, turn, appended ? 'appended' : 'shadow', appended));
// plan case: 3 Live items (RH03 appended; EF01 is a follow-up of RE02) + 1 shadow-only item (RH01, turn 4)
const SMALL_LIVE = ['RE01', 'EF01', 'RH03'];
const SMALL_SHADOW = [['RE01', false, 1], ['EF01', false, 2], ['RH03', true, 3], ['RH01', false, 4]];
const smallRun = (name = REAL) => makeRun(name, liveOf(SMALL_LIVE), shadowOf(SMALL_SHADOW));
const build = (runDir, outDir, keyDir, extra = []) => spawnSync(process.execPath, [BUILDER, '--run-dir', runDir, '--out-dir', outDir, '--key-dir', keyDir, ...extra, '--root', ROOT], { encoding: 'utf8' });

const expectText = (m) => txt(m.arms.includes('L') ? 'live' : m.arms.includes('A') ? 'appended' : 'shadow', m.id, m.turn);
// verifiers (also run on tampered copies as negative controls)
function keyMapsBack(key, files) { // every q maps to an arm set + id + turn whose source text hash equals the entry's answer hash
    let n = 0;
    for (const [tag, km] of Object.entries(key)) for (const [q, m] of Object.entries(km)) { const e = files[tag].find((x) => x.key === q); if (!e || sha(e.answer) !== sha(expectText(m))) return false; n++; }
    return n > 0 && n === Object.values(files).flat().length; // n > 0: an empty key must not pass vacuously
}
function itemsWhole(key) { const at = {}; for (const [tag, km] of Object.entries(key)) for (const m of Object.values(km)) { if (at[m.id] && at[m.id] !== tag) return false; at[m.id] = tag; } return true; }
const load = (O, K) => { const key = fs.existsSync(path.join(K, 'key-rd.json')) ? readJson(path.join(K, 'key-rd.json')) : {}; const files = {}; for (const t of Object.keys(key)) files[t] = readJson(path.join(O, `pairs.${t}.json`)).items; return { key, files }; };
const allM = (key) => Object.values(key).flatMap((km) => Object.values(km));
const hasArm = (key, arm, id) => allM(key).filter((m) => m.arms.includes(arm) && (id === undefined || m.id === id));

const exists = fs.existsSync(BUILDER);
check('RD-0', 'the builder file exists', 'true', String(exists));

// ---- small case, run folder named as the harness names it
const run1 = smallRun(); const O1 = path.join(TMP, 'out1'), K1 = path.join(TMP, 'key1');
const b1 = build(run1, O1, K1);
const { key: key1, files: files1 } = load(O1, K1);
check('RD-1', `build exits 0 on a real-shaped folder name (${REAL}), 3 Live items one appended + 1 shadow-only`, 'exit 0', `exit ${b1.status}`);
check('RD-2', '3 L/S pairs: 3 L, 3 entries carrying S, each id has both', '3 L, 3 S', `${hasArm(key1, 'L').length} L, ${hasArm(key1, 'S').length} S`, hasArm(key1, 'L').length === 3 && hasArm(key1, 'S').length === 3 && hasArm(key1, 'L').every((l) => hasArm(key1, 'S', l.id).length === 1));
check('RD-3', '1 A item (the appended pipeline answer: RH03)', '1 A: RH03', `${hasArm(key1, 'A').length} A: ${hasArm(key1, 'A').map((m) => m.id).join(',')}`, hasArm(key1, 'A').length === 1 && hasArm(key1, 'A')[0].id === 'RH03');
const qOf = (arm, id) => { for (const [tag, km] of Object.entries(key1)) for (const [q, m] of Object.entries(km)) if (m.arms.includes(arm) && m.id === id) return files1[tag].find((x) => x.key === q); return null; };
const sApp = qOf('S', 'RH03'), sPlain = qOf('S', 'RE01');
check('RD-4', "the appended turn's S text equals its appended text (sha12)", sha(txt('appended', 'RH03', 3)), sApp ? sha(sApp.answer) : 'none');
check('RD-4b', 'a non-appended turn takes the hidden-shadow text for S (sha12)', sha(txt('shadow', 'RE01', 1)), sPlain ? sha(sPlain.answer) : 'none');
check('RD-5', 'the shadow-only item (RH01, no Live text) is not in the export at all', '0 entries', `${allM(key1).filter((m) => m.id === 'RH01').length} entries`);
check('RD-5b', "the follow-up EF01's L and S carry the judge's [Follow-up to: ...] question (2 entries)", '2', String(Object.values(files1).flat().filter((x) => /Follow-up to:/.test(x.question)).length));
const pairsText = Object.keys(key1).map((t) => fs.readFileSync(path.join(O1, `pairs.${t}.json`), 'utf8'));
// the synthetic answers say "live"/"shadow"/"appended"/the id (calibration text): scan only the structure, answer and question blanked
const LEAK = /"arms?"|"class"|"route"|"parent"|"appended"|"turn"|"rank"|"sEmpty"|"superseded"|keyhold|key-rd|router-live|router-shadow|\b(?:RE|RH|EF)\d\d\b|\bC\d\d\b/;
const structLeak = (s) => { const o = JSON.parse(s); return LEAK.test(o.items.map((x) => JSON.stringify({ ...x, answer: '', question: '' })).join('\n') + JSON.stringify(Object.keys(o))); };
const probe = JSON.stringify({ items: [{ key: 'q01', arms: ['L'], answer: '', question: '' }] });
check('RD-6', 'no arm / id / class / route / parent / turn names in the pairs files outside the answer and question', 'false in every file', pairsText.map((s) => structLeak(s)).join(','), pairsText.length > 0 && pairsText.every((s) => !structLeak(s)));
check('RD-6b', 'positive control for that scan: an item with an "arms" field is detected', 'true', String(structLeak(probe)));
check('RD-6c', 'neutral contiguous keys q01.. per file, id = key', 'true', String(Object.values(files1).every((f) => f.every((x, i) => x.key === `q${String(i + 1).padStart(2, '0')}` && x.id === x.key))));
check('RD-7', 'the key maps every q back to its arms, id and turn (answer sha12 = the source text)', 'true', String(keyMapsBack(key1, files1)));
// I3: no two answers of one item may be byte-identical, and an appended item holds L plus ONE answer
const dupFiles = Object.values(files1).filter((f) => new Set(f.map((x) => sha(x.answer))).size !== f.length).length;
const rh03Entries = Object.values(key1).flatMap((km) => Object.values(km)).filter((m) => m.id === 'RH03');
check('RD-7b', 'I3: the appended item holds L plus ONE answer (key: arms [S,A]); no two answers in any file are identical', '2 entries, [L] + [S,A]; 0 files with identical answers', `${rh03Entries.length} entries, ${rh03Entries.map((m) => `[${m.arms}]`).sort().join(' + ')}; ${dupFiles} files with identical answers`, rh03Entries.length === 2 && rh03Entries.some((m) => m.arms.join() === 'S,A') && rh03Entries.some((m) => m.arms.join() === 'L') && dupFiles === 0);
// key separation
const ls = (d) => (fs.existsSync(d) ? fs.readdirSync(d) : []);
const outFiles = ls(O1), runFiles = ls(run1), keyFiles = ls(K1);
check('RD-8', 'key separation: key only in the key dir; out dir holds only pairs.blind-<n>.json; the run folder gained nothing', 'key dir [build-record-rd.json,key-rd.json]; out all pairs true; run 4 files', `key dir [${keyFiles.join(',')}]; out all pairs ${outFiles.every((f) => /^pairs\.blind-\d\.json$/.test(f))}; run ${runFiles.length} files`);
check('RD-8b', 'the build prints counts only: no synthetic answer text, no q key', 'false', String(/synthetic|\bq\d\d\b/.test(b1.stdout)));
const O2 = path.join(TMP, 'out2'), K2 = path.join(TMP, 'key2'); build(run1, O2, K2);
const h = (d, t) => (fs.existsSync(path.join(d, t)) ? sha(fs.readFileSync(path.join(d, t))) : 'absent');
check('RD-9', 'the same seed gives byte-identical pairs files and key', 'equal', Object.keys(key1).every((t) => h(O1, `pairs.${t}.json`) === h(O2, `pairs.${t}.json`)) && h(K1, 'key-rd.json') === h(K2, 'key-rd.json') ? 'equal' : 'DIFFERENT');

// ---- B1: run-label rule on real-shaped names
const refuseCase = (id, desc, runName) => {
    const r = smallRun(runName); const o = path.join(TMP, `out-${id}`), k = path.join(TMP, `key-${id}`);
    const b = build(r, o, k);
    check(id, desc, 'exit 2, names the registered label, nothing written', `exit ${b.status}; names label ${/registered run label/.test(b.stdout)}; out exists ${fs.existsSync(o)}; key exists ${fs.existsSync(k)}`, b.status === 2 && /registered run label/.test(b.stdout) && !fs.existsSync(o) && !fs.existsSync(k));
};
refuseCase('RD-10', 'a stamped smoke folder (<stamp>-router-smoke) holding COMPLETE capture files', `${STAMP}-router-smoke`);
refuseCase('RD-10b', 'the stamped label plus a suffix (<stamp>-<label>-1002, a retried run)', `${REAL}-1002`);
refuseCase('RD-10c', 'the stamped prefix of the label (<stamp>-router-default-)', `${STAMP}-${LABEL.slice(0, -2)}`);
refuseCase('RD-10d', 'the bare label with no stamp (not how the harness names a folder)', LABEL);
refuseCase('RD-10e', 'a malformed stamp (date only, no time)', `2026-10-07-${LABEL}`);
refuseCase('RD-10f', 'junk before the stamp', `x${REAL}`);
const okB = build(smallRun(REAL), path.join(TMP, 'out-ok'), path.join(TMP, 'key-ok'));
check('RD-10g', 'control: <stamp>-<label> is accepted (so the refusals above are the name rule and nothing else)', 'exit 0', `exit ${okB.status}`);

// ---- refusals on the data (each in a real-shaped folder, so only the data can refuse)
const L0 = liveOf(SMALL_LIVE), S0 = shadowOf(SMALL_SHADOW.slice(0, 3));
const dataCase = (id, desc, live, shadow, pat) => { const d = makeRun(REAL, live, shadow); const o = path.join(d, '..', 'o'), k = path.join(d, '..', 'k'); const b = build(d, o, k); check(id, desc, `exit 2 matching ${pat}; nothing written`, `exit ${b.status}; match ${pat.test(b.stdout)}; out ${fs.existsSync(o)}`, b.status === 2 && pat.test(b.stdout) && !fs.existsSync(o) && !fs.existsSync(k)); };
dataCase('RD-11', 'two Live entries with the same turn number', [...L0, ent('RE01', 1, 'live')], S0, /duplicate/i);
dataCase('RD-11b', 'an entry whose id is not in the roster', [...L0, ent('ZZ99', 9, 'live')], S0, /not in the roster/i);
dataCase('RD-11c', 'a shadow entry with no boolean appended', L0, [ent('RE01', 1, 'shadow'), ...S0.slice(1)], /appended/i);
dataCase('RD-11d', 'a hidden AND an appended pipeline entry for one TURN (ambiguous S)', L0, [...S0, ent('RH03', 3, 'shadow', false)], /both/i);
dataCase('RD-11e', 'no exportable item at all (no Live text, no appended)', [], [ent('RE01', 1, 'shadow', false)], /nothing to export/i);
dataCase('RD-11f', 'an EMPTY Live text (shown=live with no text is a real anomaly)', [ent('RE01', 1, 'live', undefined, { text: '' }), ...L0.slice(1)], S0, /no text/i);
dataCase('RD-11g', 'a turn that maps to one id in the live file and another in the shadow file', L0, [ent('EF01', 1, 'shadow', false), ...S0.slice(1)], /different items|disagree/i);
const b13 = build(run1, O1, path.join(TMP, 'key-other'));
check('RD-12', 'a second build into the same out dir is refused, the existing files untouched', 'exit 2; unchanged', `exit ${b13.status}; ${Object.keys(key1).every((t) => h(O1, `pairs.${t}.json`) === h(O2, `pairs.${t}.json`)) ? 'unchanged' : 'CHANGED'}`);
const b14 = build(run1, path.join(TMP, 'out-new'), K1);
check('RD-12b', 'a build whose key file already exists is refused before any pairs file is written', 'exit 2; out dir absent', `exit ${b14.status}; out dir ${fs.existsSync(path.join(TMP, 'out-new')) ? 'present' : 'absent'}`);

// ---- I1: an empty pipeline answer exports L alone, marked in the key, counted
const emptyRun = makeRun(REAL, L0, [ent('RE01', 1, 'shadow', false), ent('EF01', 2, 'shadow', false, { text: '' }), ent('RH03', 3, 'appended', true, { text: '   ' })]);
const OE = path.join(TMP, 'outE'), KE = path.join(TMP, 'keyE'); const bE = build(emptyRun, OE, KE);
const { key: keyE, files: filesE } = load(OE, KE);
const lOf = (key, id) => allM(key).filter((m) => m.arms.join() === 'L' && m.id === id)[0];
check('RD-13', 'I1: a Live turn whose shadow text is empty (EF01) or blank appended (RH03) exports exit 0, L alone, sEmpty marked on L; the intact turn (RE01) is unmarked', 'exit 0; EF01 [L] sEmpty, RH03 [L] sEmpty, no S/A for them; RE01 has S, no sEmpty', `exit ${bE.status}; EF01 ${lOf(keyE, 'EF01')?.sEmpty === true}/${allM(keyE).filter((m) => m.id === 'EF01').length} entry; RH03 ${lOf(keyE, 'RH03')?.sEmpty === true}/${allM(keyE).filter((m) => m.id === 'RH03').length} entry; RE01 S ${hasArm(keyE, 'S', 'RE01').length}, sEmpty ${lOf(keyE, 'RE01')?.sEmpty === true}`, bE.status === 0 && lOf(keyE, 'EF01')?.sEmpty === true && allM(keyE).filter((m) => m.id === 'EF01').length === 1 && lOf(keyE, 'RH03')?.sEmpty === true && allM(keyE).filter((m) => m.id === 'RH03').length === 1 && hasArm(keyE, 'S', 'RE01').length === 1 && lOf(keyE, 'RE01')?.sEmpty !== true);
check('RD-13b', 'I1: the count is printed ("empty pipeline answer 2")', 'empty pipeline answer 2', (bE.stdout.match(/empty pipeline answer \d+/) ?? ['no line'])[0]);

// ---- I2: pair by turn; every Live-shown turn exported; all turns of one item in the same file
// RE01 answered twice (turns 1 and 7, two dispatches in one play window), each with its own shadow; EF01 has a Live turn but its only shadow belongs to another turn (9)
const twoRun = makeRun(REAL, [ent('RE01', 1, 'live'), ent('RE01', 7, 'live'), ent('EF01', 2, 'live'), ent('RH03', 3, 'live')], [ent('RE01', 1, 'shadow', false), ent('RE01', 7, 'shadow', false), ent('EF01', 9, 'shadow', false), ent('RH03', 3, 'shadow', false)]);
const OT = path.join(TMP, 'outT'), KT = path.join(TMP, 'keyT'); const bT = build(twoRun, OT, KT);
const { key: keyT, files: filesT } = load(OT, KT);
const re01 = allM(keyT).filter((m) => m.id === 'RE01');
const pairedByTurn = [1, 7].every((t) => re01.filter((m) => m.turn === t).map((m) => m.arms.join()).sort().join('|') === 'L|S');
const fileOf = (key, id) => [...new Set(Object.entries(key).filter(([, km]) => Object.values(km).some((m) => m.id === id)).map(([t]) => t))];
check('RD-14', 'I2: two Live turns of one id are BOTH exported (exit 0), each L paired with the S of its OWN turn (answer hashes verified by the key check), in the same file', 'exit 0; 4 RE01 entries (turn 1 and 7 each L+S); keyMapsBack true; 1 file', `exit ${bT.status}; ${re01.length} RE01 entries; paired by turn ${pairedByTurn}; keyMapsBack ${keyMapsBack(keyT, filesT)}; ${fileOf(keyT, 'RE01').length} file`, bT.status === 0 && re01.length === 4 && pairedByTurn && keyMapsBack(keyT, filesT) && fileOf(keyT, 'RE01').length === 1);
const ef = allM(keyT).filter((m) => m.id === 'EF01');
check('RD-14b', "I2: a shadow of ANOTHER turn is never joined to a Live turn (EF01 turn 2 has no shadow of its own): L alone, the stray shadow not exported", '1 entry [L]; shadow text of turn 9 absent from the pairs files', `${ef.length} entry [${ef.map((m) => m.arms)}]; stray text present ${Object.values(filesT).flat().some((x) => sha(x.answer) === sha(txt('shadow', 'EF01', 9)))}`, ef.length === 1 && ef[0].arms.join() === 'L' && !Object.values(filesT).flat().some((x) => sha(x.answer) === sha(txt('shadow', 'EF01', 9))));
check('RD-14c', 'I2: the number of ids with more than one Live turn is printed ("ids with more than one Live turn 1"), and the rank of each turn is in the key', 'ids with more than one Live turn 1; ranks 1,2', `${(bT.stdout.match(/ids with more than one Live turn \d+/) ?? ['no line'])[0]}; ranks ${re01.filter((m) => m.arms.join() === 'L').map((m) => m.rank).sort().join(',')}`);

// ---- superseded turns: every [RouterAnswer] record carries superseded:boolean (task-5-fix2); true on both the live and the shadow record of a superseded turn. A record without the field counts as false and is counted.
const supRun = makeRun(REAL, [ent('RE01', 1, 'live', undefined, { superseded: true }), ent('EF01', 2, 'live', undefined, { superseded: false }), ent('RH03', 3, 'live')], [ent('RE01', 1, 'shadow', false, { superseded: true }), ent('EF01', 2, 'shadow', false, { superseded: false }), ent('RH03', 3, 'appended', true)]);
const OS = path.join(TMP, 'outS'), KS = path.join(TMP, 'keyS'); const bS = build(supRun, OS, KS);
const { key: keyS, files: filesS } = load(OS, KS);
const re = allM(keyS).filter((m) => m.id === 'RE01');
check('RD-15', 'superseded: a turn marked superseded:true exports L alone, key superseded:true, the pipeline text that replaced it is NOT exported as S or A', 'exit 0; 1 RE01 entry [L] superseded; replaced text absent', `exit ${bS.status}; ${re.length} entry [${re.map((m) => m.arms)}] superseded ${re[0]?.superseded === true}; replaced text present ${Object.values(filesS).flat().some((x) => sha(x.answer) === sha(txt('shadow', 'RE01', 1)))}`, bS.status === 0 && re.length === 1 && re[0].arms.join() === 'L' && re[0].superseded === true && !Object.values(filesS).flat().some((x) => sha(x.answer) === sha(txt('shadow', 'RE01', 1))));
check('RD-15b', 'superseded: the count is printed, the other turns stay unmarked (EF01 explicit false, RH03 field absent), and the 2 records without the field (RH03 live + appended) are counted', 'superseded 1; records without superseded field 2; EF01 unmarked', `${(bS.stdout.match(/superseded \d+/) ?? ['no line'])[0]}; ${(bS.stdout.match(/records without superseded field \d+/) ?? ['no line'])[0]}; EF01 ${allM(keyS).filter((m) => m.id === 'EF01').some((m) => m.superseded === true) ? 'MARKED' : 'unmarked'}`);

// ---- fix2: a supersede AFTER Live finished: every capture flag reads false (the live capture was written before the supersede; the replacing text is in no capture); only the diag line names the turn
const SUPLINE = (turn, phase = 'done', lw = 'yes') => `[Router] superseded turn=${turn} phase=${phase} line_written=${lw}`;
const dlog = ['[App] noise', SUPLINE(1), SUPLINE(1), SUPLINE(2, 'weird', 'maybe'), SUPLINE(9, 'streaming', 'no'), '[Router] turn=3 route=hard shown=live'].join('\n');
const diagRun = makeRun(REAL, [ent('RE01', 1, 'live', undefined, { superseded: false }), ent('EF01', 2, 'live', undefined, { superseded: false }), ent('RH03', 3, 'live', undefined, { superseded: false })], [ent('EF01', 2, 'shadow', false, { superseded: false }), ent('RH03', 3, 'shadow', false, { superseded: false })], dlog);
const OD = path.join(TMP, 'outD'), KD = path.join(TMP, 'keyD'); const bD = build(diagRun, OD, KD);
const keyD = load(OD, KD).key;
const reD = allM(keyD).filter((m) => m.id === 'RE01'), efD = allM(keyD).filter((m) => m.id === 'EF01');
const srcLine = (b) => (b.stdout.match(/superseded sources: diag line turns \d+; capture flag true \d+; union \d+; found only by the diag line \d+/) ?? ['no line'])[0].replace('superseded sources: ', '');
check('RD-21', 'fix2: all capture flags false, only the diag line names turn 1 -> RE01 exports L alone, key superseded; EF01 (malformed diag line, phase=weird) is NOT marked', 'exit 0; RE01 1 entry [L] superseded; EF01 two entries unmarked', `exit ${bD.status}; RE01 ${reD.length} entry [${reD.map((m) => m.arms)}] superseded ${reD[0]?.superseded === true}; EF01 ${efD.length} entries, marked ${efD.filter((m) => m.superseded).length}`, bD.status === 0 && reD.length === 1 && reD[0].arms.join() === 'L' && reD[0].superseded === true && efD.length === 2 && efD.every((m) => !m.superseded));
check('RD-21b', 'fix2: each source counted, and the turns found only by the diag line (turn 9 has no capture entry; duplicate diag lines count once)', 'diag line turns 2; capture flag true 0; union 2; found only by the diag line 2', srcLine(bD));
const noLog = makeRun(REAL, L0, S0, null); const bNL = build(noLog, path.join(TMP, 'o-nl'), path.join(TMP, 'k-nl'));
check('RD-21c', 'fix2: no natively_debug.log in the run folder -> REFUSED (the superseded set cannot be known), nothing written', 'exit 2 naming natively_debug.log; out absent', `exit ${bNL.status}; names log ${/natively_debug\.log/.test(bNL.stdout)}; out ${fs.existsSync(path.join(TMP, 'o-nl')) ? 'present' : 'absent'}`, bNL.status === 2 && /natively_debug\.log/.test(bNL.stdout) && !fs.existsSync(path.join(TMP, 'o-nl')));
const bothSrc = makeRun(REAL, [ent('RE01', 1, 'live', undefined, { superseded: true }), ent('EF01', 2, 'live', undefined, { superseded: false })], [ent('RE01', 1, 'shadow', false, { superseded: true }), ent('EF01', 2, 'shadow', false)], `${SUPLINE(1, 'done', 'no')}\n${SUPLINE(2, 'streaming', 'no')}\n`);
const bBS = build(bothSrc, path.join(TMP, 'o-bs'), path.join(TMP, 'k-bs')); const kBS = load(path.join(TMP, 'o-bs'), path.join(TMP, 'k-bs')).key;
check('RD-21d', 'fix2: the UNION, not either source alone: turn 1 flagged by both, turn 2 by the diag line only -> both exported as [L] superseded, nothing else', 'diag line turns 2; capture flag true 1; union 2; found only by the diag line 1; 2 entries, 2 superseded', `${srcLine(bBS)}; ${allM(kBS).length} entries, ${allM(kBS).filter((m) => m.superseded).length} superseded`);
const flagOnly = makeRun(REAL, [ent('RE01', 1, 'live', undefined, { superseded: true }), ent('EF01', 2, 'live')], [ent('RE01', 1, 'shadow', false, { superseded: true }), ent('EF01', 2, 'shadow', false)]);
const bFO = build(flagOnly, path.join(TMP, 'o-fo'), path.join(TMP, 'k-fo'));
check('RD-21e', 'fix2: a capture flag true with an EMPTY diag log still marks the turn (the union keeps the flag source)', 'diag line turns 0; capture flag true 1; union 1; found only by the diag line 0', srcLine(bFO));

// ---- fix2b: a log holding several app processes. Turn id 1 is reused in each; only the session that covers the hour counts.
const twoCaps = () => [[ent('RE01', 1, 'live', undefined, { superseded: false }), ent('EF01', 2, 'live', undefined, { superseded: false })], [ent('RE01', 1, 'shadow', false, { superseded: false }), ent('EF01', 2, 'shadow', false, { superseded: false })]];
const sessLog = [HEADER(HOUR_START - 3600e3), SUPLINE(1), '[App] earlier process', HEADER(HOUR_START - 60000), '[App] the hour', SUPLINE(2), HEADER(HOUR_END + 3600e3), SUPLINE(1), SUPLINE(2)].join('\n');
const sessRun = makeRun(REAL, ...twoCaps(), sessLog, true);
const bSe = build(sessRun, path.join(TMP, 'o-se'), path.join(TMP, 'k-se')); const kSe = load(path.join(TMP, 'o-se'), path.join(TMP, 'k-se')).key;
const sRe = allM(kSe).filter((m) => m.id === 'RE01'), sEf = allM(kSe).filter((m) => m.id === 'EF01');
check('RD-22', 'fix2b: three sessions all reusing turn id 1 (an earlier process marks turn 1, the hour marks turn 2, a later process marks 1 and 2) -> only the session covering the hour counts: RE01 (turn 1) unmarked with its S, EF01 (turn 2) superseded', 'exit 0; RE01 2 entries, 0 marked; EF01 1 entry [L] marked', `exit ${bSe.status}; RE01 ${sRe.length} entries, ${sRe.filter((m) => m.superseded).length} marked; EF01 ${sEf.length} entry [${sEf.map((m) => m.arms)}] marked ${sEf.filter((m) => m.superseded).length}`, bSe.status === 0 && sRe.length === 2 && !sRe.some((m) => m.superseded) && sEf.length === 1 && sEf[0].arms.join() === 'L' && sEf[0].superseded === true);
check('RD-22b', 'fix2b: the counts come from that one session only', 'diag line turns 1; capture flag true 0; union 1; found only by the diag line 1', srcLine(bSe));
const noHdr = makeRun(REAL, ...twoCaps(), `${SUPLINE(1)}\n[App] no header\n`, true); const bNH = build(noHdr, path.join(TMP, 'o-nh'), path.join(TMP, 'k-nh'));
check('RD-22c', 'fix2b: no session header at or before the hour start -> REFUSED (exit 2), nothing written', 'exit 2; out absent', `exit ${bNH.status}; match ${/does not cover the hour/.test(bNH.stdout)}; out ${fs.existsSync(path.join(TMP, 'o-nh')) ? 'present' : 'absent'}`, bNH.status === 2 && /does not cover the hour/.test(bNH.stdout) && !fs.existsSync(path.join(TMP, 'o-nh')));
const lateHdr = makeRun(REAL, ...twoCaps(), `${HEADER(HOUR_START + 600e3)}\n${SUPLINE(1)}\n`, true); const bLH = build(lateHdr, path.join(TMP, 'o-lh'), path.join(TMP, 'k-lh'));
check('RD-22d', 'fix2b: the only header sits AFTER the hour start (the head was cut) -> REFUSED (exit 2)', 'exit 2', `exit ${bLH.status}`);
const midHdr = makeRun(REAL, ...twoCaps(), `${HEADER(HOUR_START - 60000)}\n${SUPLINE(1)}\n${HEADER(HOUR_START + 1200e3)}\n${SUPLINE(2)}\n`, true); const bMH = build(midHdr, path.join(TMP, 'o-mh'), path.join(TMP, 'k-mh'));
check('RD-22e', 'fix2b: a second session header INSIDE the hour (a restart) -> REFUSED (exit 2), nothing written', 'exit 2; out absent', `exit ${bMH.status}; match ${/restarted inside the hour/.test(bMH.stdout)}; out ${fs.existsSync(path.join(TMP, 'o-mh')) ? 'present' : 'absent'}`, bMH.status === 2 && /restarted inside the hour/.test(bMH.stdout) && !fs.existsSync(path.join(TMP, 'o-mh')));
const noTl = makeRun(REAL, ...twoCaps(), '[App] x\n', false, false); const bNT = build(noTl, path.join(TMP, 'o-nt'), path.join(TMP, 'k-nt'));
check('RD-22f', 'fix2b: no interview60.timeline.json -> REFUSED (exit 2)', 'exit 2', `exit ${bNT.status}`);

// ---- M1: --root and the instrument shas in the build record
check('RD-15c', 'a pre-fix log (no record carries the field) shows up: the small case has 7 records, all without it', 'records without superseded field 7', (b1.stdout.match(/records without superseded field \d+/) ?? ['no line'])[0]);
const shadowOnlySup = makeRun(REAL, [ent('RE01', 1, 'live'), ent('EF01', 2, 'live')], [ent('RE01', 1, 'shadow', false, { superseded: true }), ent('EF01', 2, 'shadow', false)]);
const OSS = path.join(TMP, 'outSS'), KSS = path.join(TMP, 'keySS'); build(shadowOnlySup, OSS, KSS);
const keySS = load(OSS, KSS).key;
check('RD-15d', 'superseded true on the SHADOW record alone is enough (the live record of the same turn is read as L alone, marked)', 'RE01 1 entry [L] superseded true', `RE01 ${allM(keySS).filter((m) => m.id === 'RE01').length} entry [${allM(keySS).filter((m) => m.id === 'RE01').map((m) => m.arms)}] superseded ${allM(keySS).filter((m) => m.id === 'RE01')[0]?.superseded === true}`);
const rec = fs.existsSync(path.join(K1, 'build-record-rd.json')) ? readJson(path.join(K1, 'build-record-rd.json')) : {};
const rosterF = `${ROOT}/electron/test/golden/live40.questions.mjs`, judgeF = `${ROOT}/electron/test/golden/interview60.judge.mjs`;
check('RD-16', 'M1: the build record holds the sha256 of the roster module and of the judge file (64 hex, equal to the files)', 'equal; equal', `${rec.rosterSha256 === fileSha(rosterF) ? 'equal' : 'DIFFERENT/absent'}; ${rec.judgeSha256 === fileSha(judgeF) ? 'equal' : 'DIFFERENT/absent'}`);
const bad = build(run1, path.join(TMP, 'out-badroot'), path.join(TMP, 'key-badroot'), ['--root', path.join(TMP, 'nonexistent')]);
check('RD-16b', 'M1: --root pointing at a tree without the roster fails loudly (nonzero), nothing written', 'exit != 0; out dir absent', `exit ${bad.status}; out dir ${fs.existsSync(path.join(TMP, 'out-badroot')) ? 'present' : 'absent'}`, bad.status !== 0 && bad.status !== null && !fs.existsSync(path.join(TMP, 'out-badroot')));

// ---- whole-item file cut on a bigger case: 10 Live items (roster order), 3 appended, one id answered twice
const BIG = LIVE40.slice(0, 10).map((x) => x.id), BIG_APP = new Set([BIG[1], BIG[4], BIG[8]]);
const bigLive = [...liveOf(BIG), ent(BIG[2], 50, 'live')], bigShadow = [...shadowOf(BIG.map((id, i) => [id, BIG_APP.has(id), i + 1])), ent(BIG[2], 50, 'shadow', false)];
const bigRun = makeRun(REAL, bigLive, bigShadow);
const O3 = path.join(TMP, 'out3'), K3 = path.join(TMP, 'key3'); build(bigRun, O3, K3);
const { key: key3, files: files3 } = load(O3, K3);
const tags = Object.keys(key3);
const itemsPerFile = tags.map((t) => new Set(Object.values(key3[t]).map((m) => m.id)).size);
const slices = [BIG.slice(0, 3), BIG.slice(3, 6), BIG.slice(6, 8), BIG.slice(8, 10)];
const idsPerFile = tags.map((t) => [...new Set(Object.values(key3[t]).map((m) => m.id))].sort().join());
const sliceOk = idsPerFile.join('|') === slices.map((s) => [...s].sort().join()).join('|');
check('RD-17', 'cut: 10 items -> 4 files of whole items, 3/3/2/2, contiguous slices of the roster order', '4 files; 3,3,2,2; slices true', `${tags.length} files; ${itemsPerFile.join(',')}; slices ${sliceOk}`);
check('RD-17b', 'every item (all its entries, both turns of the twice-answered id) sits in ONE file; 11 L + 11 S + 3 appended-S/A merged = 11 + (11 - 3) + 3 = 22 entries', 'true; 22', `${itemsWhole(key3)}; ${Object.values(files3).flat().length}`);
check('RD-17c', 'the key maps back on the big case too', 'true', String(keyMapsBack(key3, files3)));
const moved = JSON.parse(JSON.stringify(key3)); { const [t0, t1] = tags; const q = Object.keys(moved[t0])[0]; moved[t1][`${q}x`] = moved[t0][q]; delete moved[t0][q]; }
check('RD-17d', 'negative control: one key entry moved to another file is detected as a split item', 'false', String(itemsWhole(moved)));
const flat0 = files3[tags[0]].map((x) => key3[tags[0]][x.key]);
const trans = flat0.reduce((n, m, i, a) => n + (i && a[i - 1].arms.join() !== m.arms.join() ? 1 : 0), 0);
const inOrder = JSON.stringify(flat0.map((m) => m.id)) === JSON.stringify([...flat0.map((m) => m.id)].sort((a, b) => BIG.indexOf(a) - BIG.indexOf(b)));
check('RD-18', 'answers are shuffled inside a file: arms interleave (>= 3 arm-set changes in file 1) and the id order is not the roster order', 'true; true', `${trans >= 3}; ${!inOrder}`);

// ---- break it once: swap L and S in the key (the plan's mutation), and watch the key check FAIL
const swapped = JSON.parse(JSON.stringify(key1)); for (const m of allM(swapped)) if (m.arms.join() === 'L') m.arms = ['S']; else if (m.arms.join() === 'S') m.arms = ['L'];
check('RD-19', 'MUTATION: L and S swapped in the key -> the key-maps-back check must FAIL (false = the swap is caught)', 'false', String(keyMapsBack(swapped, files1)));
const swapId = JSON.parse(JSON.stringify(key1)); { const ms = allM(swapId); const m0 = ms[0], m1 = ms.find((m) => m.id !== m0.id); [m0.id, m1.id] = [m1.id, m0.id]; }
check('RD-19b', 'MUTATION: two ids swapped in the key -> caught', 'false', String(keyMapsBack(swapId, files1)));
const swapTurn = JSON.parse(JSON.stringify(keyT)); { const ms = allM(swapTurn).filter((m) => m.id === 'RE01' && m.arms.join() === 'L'); [ms[0].turn, ms[1].turn] = [ms[1].turn, ms[0].turn]; }
check('RD-19c', 'MUTATION: the two turns of RE01 swapped in the key -> caught', 'false', String(keyMapsBack(swapTurn, filesT)));

const src = exists ? fs.readFileSync(BUILDER, 'utf8') : '';
check('RD-20', "the calibration's label equals the builder's REGISTERED_RUN_LABEL constant", LABEL, (src.match(/REGISTERED_RUN_LABEL = '([^']+)'/) ?? [])[1] ?? 'absent');
check('RD-20b', 'the builder uses the seed text blind:router-default:r1', 'blind:router-default:r1', (src.match(/SEED = '([^']+)'/) ?? [])[1] ?? 'absent');

fs.rmSync(TMP, { recursive: true, force: true });
say(`cal-build-blind-rd: ${total - fails}/${total} cases PASS${fails ? ' -- FAILURES ABOVE' : ''}`);
fs.writeFileSync(path.join(process.env.RD_CAL_OUT ?? LAB, 'cal-build-blind-rd.txt'), `${lines.join('\n')}\n`, 'utf8');
process.exit(fails ? 1 : 0);
