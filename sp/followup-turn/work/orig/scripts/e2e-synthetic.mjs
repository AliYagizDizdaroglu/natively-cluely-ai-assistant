// Throwaway end-to-end check of the blind builder and the legs-decide CLI on SYNTHETIC answers and verdicts with a known outcome,
// in temp folders (FQ_OUT_DIR), so the file seams (answer files -> blind pairs/keys -> two graders' verdicts + graders.json -> merge
// -> decide) are exercised before the day. No model call, no grader, nothing in the real R folder. It needs section 2 to verify
// (TURN_PREREG, default followup-turn/section2-filled.md): the CLI refuses otherwise, which is itself one of the checks (run 3).
//   planted (run 1): front gain +9 (A weak on s50m S1Q04F r1-5 and S1Q06F r1-4), except
//     - s50l:S2Q08F rep 3 arm A is a transient failure  -> incomplete front pair, excluded, so R = 39
//     - s50m:S1Q04F back rep 1 arm B answered but empty after the filters -> 0/0/0 -> a NEW back-leg wrong -> clause 1 FAIL (back alone)
//   run 2: the same without the empty answer -> every clause holds, gain +9 >= ceil(4*39/21) = 8 -> PASS
//   run 3: one hash of the table flipped -> stdout is exactly "VOID", exit 4
//   run 4: a grader slot whose memory check read LOADED -> REPORTED, NOT DECIDED, exit 3
//   run 5: a grader file missing one key -> the merge stops, exit 2
//   run 6: a null thoughts in a front record -> REFUSED, no decision line
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.dirname(HERE);
const FT = path.dirname(R);
process.env.TURN_PREREG ??= path.join(FT, 'section2-filled.md');
const C = await import('./common.mjs');
const v = C.verifySection2();
if (!v.ok) { console.log(`REFUSED: section 2 of ${C.PREREG} does not verify (${v.problems.slice(0, 3).join(' | ')}); regenerate it with fill-section2.mjs first`); process.exit(2); }
const { G } = await C.loadGated(Object.keys(C.HOURS));
// common.mjs fixed OUT_DIR at import (the real R folder); every synthetic file therefore goes through answerPath(tmp, ...) and the
// children get FQ_OUT_DIR=tmp. Nothing may be written into R, which must hold no answer file before and after.
const answerPath = (tmp, leg, h, arm, rep) => path.join(tmp, `interview60.answers.${C.LEGS[leg].model}_fturn-${h}-${arm}-r${rep}.json`);
if (C.OUT_DIR !== C.R_DIR || C.answerFiles(C.R_DIR).length) { console.log('REFUSED: R holds answer files or OUT_DIR is not R'); process.exit(2); }

const WEAK_A = new Set([1, 2, 3, 4, 5].map((r) => `s50m:S1Q04F#${r}`).concat([1, 2, 3, 4].map((r) => `s50m:S1Q06F#${r}`), [1, 2, 3, 4, 5].map((r) => `s50k:S1Q04F#${r}`)));
const TRANSIENT = { leg: 'front', key: 's50l:S2Q08F', rep: 3, arm: 'A' };
const EMPTY = { leg: 'back', key: 's50m:S1Q04F', rep: 1, arm: 'B' };

/** Writes a full synthetic set of answer files into `tmp`. mutate(rec) may alter any record. */
function writeAnswers(tmp, { withEmpty, mutate = () => {}, hours = C.PRIMARY_HOURS }) {
    for (const leg of ['front', 'back']) {
        const L = C.LEGS[leg];
        for (const h of hours) for (const arm of C.ARMS) for (let rep = 1; rep <= L.reps; rep++) {
            const store = {};
            for (const key of C.itemsFor(G, leg, [h])) {
                const o = G[key];
                const base = { key, hour: h, id: o.id, kind: o.kind, leg, q: o.current, arm, rep, position: 1, model: L.model, thinking: L.thinking, label: `${L.model}_fturn-${h}-${arm}`, at: new Date().toISOString() };
                if (leg === TRANSIENT.leg && key === TRANSIENT.key && rep === TRANSIENT.rep && arm === TRANSIENT.arm) { store[key] = { ...base, transientError: 'HTTP 503' }; continue; }
                const empty = withEmpty && leg === EMPTY.leg && key === EMPTY.key && rep === EMPTY.rep && arm === EMPTY.arm;
                const tag = leg === 'front' && arm === 'A' && WEAK_A.has(`${key}#${rep}`) ? 'PLANTED-WEAK' : 'PLANTED-ACC';
                const rec = { ...base, spoken: empty ? '' : `${tag} synthetic answer for ${key} rep ${rep} arm ${arm} ${leg}`, offers: null, words: empty ? 0 : 80, ttft: 3000 + rep * 10, total: 6000, finish: 'STOP', raw: 'x', rawLen: 1, thoughts: 100 };
                mutate(rec);
                store[key] = rec;
            }
            fs.writeFileSync(answerPath(tmp, leg, h, arm, rep), JSON.stringify(store, null, 1));
        }
    }
}
const runNode = (script, tmp, extra = []) => spawnSync(process.execPath, [script, ...extra], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: tmp, TURN_PREREG: process.env.TURN_PREREG }, maxBuffer: 32 << 20 });

/** One full synthetic run: answers -> blind -> two synthetic graders -> graders.json. Returns { tmp, blind (stdout), blindDir }. */
async function build({ withEmpty, mutate, graders = {}, hours = C.PRIMARY_HOURS, rerun = false, tmp: reuse = null }) {
    const tmp = reuse ?? fs.mkdtempSync(path.join(os.tmpdir(), 'turn-e2e-'));
    process.env.FQ_OUT_DIR = tmp;
    writeAnswers(tmp, { withEmpty, mutate, hours });
    const b = runNode(path.join(HERE, 'followup-turn-blind.mjs'), tmp, rerun ? ['--rerun'] : []);
    if (b.status !== 0) { console.log(`blind exit ${b.status} ${b.stderr}`); process.exit(1); }
    const blindDir = path.join(tmp, rerun ? 'blind-rerun' : 'blind');
    const files = fs.readdirSync(blindDir).filter((x) => /^pairs\.blind-\d+\.json$/.test(x));
    const slots = {};
    for (const f of files) {
        const n = f.match(/(\d+)/)[1];
        const { items } = JSON.parse(fs.readFileSync(path.join(blindDir, f), 'utf8'));
        for (const g of ['g1', 'g2']) {
            const vv = Object.fromEntries(items.map((it) => [it.key, it.answer.startsWith('PLANTED-WEAK') ? { correctness: 2, on_topic: 2, delivery: 0, reason: 'synthetic weak' } : { correctness: 2, on_topic: 2, delivery: 2, reason: 'synthetic acceptable' }]));
            fs.writeFileSync(path.join(blindDir, `verdicts.blind-${n}.${g}.json`), JSON.stringify(vv, null, 1));
            slots[`blind-${n}.${g}`] = { agent: `synthetic${n}${g}`, model: C.PINNED_GRADER, memory: 'ABSENT', audit: 'clean', replaced: [], ...(graders[`blind-${n}.${g}`] ?? {}) };
        }
    }
    fs.writeFileSync(path.join(blindDir, 'graders.json'), JSON.stringify({ instrument: C.INSTRUMENT, graders: slots }, null, 1));
    return { tmp, blind: b.stdout, blindDir, nFiles: files.length };
}
const decide = (tmp, env = {}) => spawnSync(process.execPath, [path.join(R, 'legs-decide.mjs')], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: tmp, TURN_PREREG: process.env.TURN_PREREG, ...env }, maxBuffer: 32 << 20 });
let ok = true;
const check = (name, pass) => { ok &&= !!pass; console.log(`${pass ? 'OK ' : 'BAD'} ${name}`); };
const cleanup = [];

// ── run 1: FAIL on the back leg's emptied answer ──
{
    const b = await build({ withEmpty: true });
    cleanup.push(b.tmp);
    console.log(b.blind.trim());
    const sent = [...b.blind.matchAll(/(\d+) answers /g)].reduce((a, m) => a + Number(m[1]), 0);
    check('9 blind files (7 front + 2 back), none over 24 answers', b.nFiles === 9 && [...b.blind.matchAll(/(\d+) answers /g)].every((m) => Number(m[1]) <= 24) && /9 files \(7 front \+ 2 back\)/.test(b.blind));
    check('front files hold 20 answers, back files 24 (minus the transient/empty)', [...b.blind.matchAll(/blind-(\d+)\.json {2}(front|back) {2}(\d+) answers/g)].every((m) => (m[2] === 'front' ? Number(m[3]) === 20 || Number(m[3]) === 19 : Number(m[3]) === 24 || Number(m[3]) === 23)));
    check('188 answers minus the transient and the empty = 186 sent to graders', sent === 186);
    const d = decide(b.tmp);
    console.log(d.stdout.trim()); if (d.stderr.trim()) console.log(`stderr: ${d.stderr.trim()}`);
    const out = d.stdout;
    check('incomplete front pair named', /incomplete pairs \(excluded\): front:s50l:S2Q08F#3 \(A missing\)/.test(out));
    check('empty back answer named and scored', /scored 0\/0\/0\): back:Br1:s50m:S1Q04F/.test(out));
    check('R = 39 roster pairs', /R = 39 complete roster pairs/.test(out));
    check('clause 1: the back leg fails alone (front holds)', /front: consensus-wrong B 0 <= A 0: holds; back: B 1 <= A 0: FAIL {2}=> {2}FAIL/.test(out));
    check('clause 7 gain +9 of R = 39 reads PASS (bar +8) but the decision is FAIL', /= \+9 \(PASS >= \+8, FAIL <= \+2\): PASS/.test(out) && /DECISION: FAIL/.test(out));
    check('per-item rows and per-hour deltas printed', /s50m:S1Q04F {1,}roster {3}A wwwww {2}B YYYYY/.test(out) && /hour s50m: roster pairs 20, .* delta \+9/.test(out));
}
// ── run 2: PASS ──
{
    const b = await build({ withEmpty: false });
    cleanup.push(b.tmp);
    const d = decide(b.tmp);
    check('run 2 (no empty answer): every clause holds, gain +9 -> DECISION: PASS', d.status === 0 && /DECISION: PASS/.test(d.stdout) && /= \+9 /.test(d.stdout) && /back: B 0 <= A 0: holds/.test(d.stdout));
    // ── keys out / back: the graders' folder holds no key while the keys are out, and the decision needs them back ──
    const mv = (dir) => spawnSync(process.execPath, [path.join(R, 'move-keys.mjs'), dir], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: b.tmp } });
    const out1 = mv('out');
    check('move-keys out: 9 key files leave the blind folder (byte-verified), none remain', out1.status === 0 && /moved 9 key files OUT of/.test(out1.stdout) && !fs.readdirSync(b.blindDir).some((f) => /^key\./.test(f)) && fs.readdirSync(`${b.tmp}-keyhold`).filter((f) => /^key\./.test(f)).length === 9);
    check('move-keys out again is REFUSED (nothing to move)', mv('out').status === 2);
    const dKeys = decide(b.tmp);
    check(`while the keys are out the decision is not made (exit ${dKeys.status})`, dKeys.status === 3 && !/DECISION/.test(dKeys.stdout));
    const back1 = mv('back');
    check('move-keys back restores the 9 keys and the decision is PASS again', back1.status === 0 && /moved 9 key files BACK into/.test(back1.stdout) && /DECISION: PASS/.test(decide(b.tmp).stdout));
    fs.rmSync(`${b.tmp}-keyhold`, { recursive: true, force: true });
    // ── run 5: a grader file missing one key stops the merge ──
    const v1 = path.join(b.blindDir, 'verdicts.blind-1.g2.json');
    const j = JSON.parse(fs.readFileSync(v1, 'utf8')); delete j[Object.keys(j)[0]]; fs.writeFileSync(v1, JSON.stringify(j));
    const d5 = decide(b.tmp);
    check(`run 5: a grader file missing one key stops the merge (exit ${d5.status})`, d5.status === 2 && /no valid verdict/.test(d5.stderr) && !/DECISION/.test(d5.stdout));
}
// ── run 4: LOADED memory on one slot ──
{
    const b = await build({ withEmpty: false, graders: { 'blind-3.g1': { memory: 'LOADED' } } });
    cleanup.push(b.tmp);
    const d = decide(b.tmp);
    check(`run 4: a grader whose memory check read LOADED -> REPORTED, NOT DECIDED (exit ${d.status})`, d.status === 3 && /REPORTED, NOT DECIDED/.test(d.stdout) && /blind-3\.g1/.test(d.stdout) && !/DECISION/.test(d.stdout));
    const g = path.join(b.blindDir, 'graders.json'); const gj = JSON.parse(fs.readFileSync(g, 'utf8'));
    gj.graders['blind-3.g1'].memory = 'ABSENT'; gj.graders['blind-3.g1'].audit = 'FLAGGED'; fs.writeFileSync(g, JSON.stringify(gj));
    const d4b = decide(b.tmp);
    check('run 4b: a FLAGGED audit -> REPORTED, NOT DECIDED', d4b.status === 3 && /REPORTED, NOT DECIDED/.test(d4b.stdout));
    gj.graders['blind-3.g1'].audit = 'clean'; gj.graders['blind-3.g1'].replaced = ['a1', 'a2']; fs.writeFileSync(g, JSON.stringify(gj));
    check('run 4c: a slot replaced twice -> REPORTED, NOT DECIDED (one re-grade only)', decide(b.tmp).status === 3);
    gj.graders['blind-3.g1'].replaced = ['a1']; gj.graders['blind-3.g1'].model = 'claude-opus-4'; fs.writeFileSync(g, JSON.stringify(gj));
    check('run 4d: a grader that is not claude-opus-5-5 -> REPORTED, NOT DECIDED', decide(b.tmp).status === 3);
}
// ── run 7: the one allowed s50k re-run, pooled ──
{
    const first = await build({ withEmpty: false });
    cleanup.push(first.tmp);
    const re = await build({ withEmpty: false, hours: ['s50k'], rerun: true, tmp: first.tmp });
    console.log(re.blind.trim().split('\n').pop().slice(0, 120));
    check('re-run blind builder: s50k only, into blind-rerun/ (4 front files + 1 back file)', re.nFiles === 5 && /pairs\.blind-4\.json {2}front/.test(re.blind) && /pairs\.blind-5\.json {2}back/.test(re.blind) && /5 files \(4 front \+ 1 back\)/.test(re.blind));
    const d = decide(first.tmp, {}); const dr = spawnSync(process.execPath, [path.join(R, 'legs-decide.mjs'), '--rerun'], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: first.tmp, TURN_PREREG: process.env.TURN_PREREG }, maxBuffer: 32 << 20 });
    console.log(dr.stdout.split('\n').filter((l) => /^additivity|^n_front|^7\. |^DECISION|^instrument/.test(l)).join('\n'));
    check('the first run alone reads PASS (gain +9 of R = 39)', /DECISION: PASS/.test(d.stdout));
    check('the pooled re-run: additivity OK, R = 59 (39 + 20), n_front 104, gain +9 + 5 = +14 >= ceil(4*59/21) = 12 -> PASS', dr.status === 0 && /additivity OK/.test(dr.stdout) && /R = 59 complete roster pairs/.test(dr.stdout) && /n_front = 104 /.test(dr.stdout) && /= \+14 \(PASS >= \+12, FAIL <= \+3\): PASS/.test(dr.stdout) && /DECISION: PASS/.test(dr.stdout), dr.stderr.slice(0, 120));
    // a missing blind-rerun/graders.json is not silently skipped
    fs.rmSync(path.join(first.tmp, 'blind-rerun', 'graders.json'));
    const dm = spawnSync(process.execPath, [path.join(R, 'legs-decide.mjs'), '--rerun'], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: first.tmp, TURN_PREREG: process.env.TURN_PREREG } });
    check('a re-run without its graders.json is REPORTED, NOT DECIDED', dm.status === 3 && /REPORTED, NOT DECIDED/.test(dm.stdout));
}
// ── run 6: null thoughts in a front record ──
{
    const b = await build({ withEmpty: false, mutate: (rec) => { if (rec.leg === 'front' && rec.key === 's50m:S2Q05F' && rec.arm === 'B' && rec.rep === 2) rec.thoughts = null; } });
    cleanup.push(b.tmp);
    const d = decide(b.tmp);
    check(`run 6: a null thoughts in a front record is REFUSED, no decision line (exit ${d.status})`, d.status !== 0 && /REFUSED/.test(d.stderr) && !/DECISION/.test(d.stdout));
    // run 6b: a record that does not match its leg
    const f = answerPath(b.tmp, 'front', 's50m', 'A', 1); const s = JSON.parse(fs.readFileSync(f, 'utf8')); const k0 = Object.keys(s)[0]; s[k0].thinking = 'LOW'; fs.writeFileSync(f, JSON.stringify(s));
    const d6 = decide(b.tmp);
    check('run 6b: a front record carrying thinking LOW is REFUSED', d6.status !== 0 && /REFUSED/.test(d6.stderr) && !/DECISION/.test(d6.stdout));
}
// ── run 3: a flipped hash in the table -> exactly VOID ──
{
    const b = await build({ withEmpty: false });
    cleanup.push(b.tmp);
    const text = fs.readFileSync(process.env.TURN_PREREG, 'utf8');
    const m = /earlierQuestion\.ref\.test\.mjs ([0-9a-f]{64})/.exec(text);
    const flipped = text.replace(m[1], (m[1][0] === 'a' ? 'b' : 'a') + m[1].slice(1));
    const bad = path.join(b.tmp, 'prereg-flipped.md'); fs.writeFileSync(bad, flipped);
    const d = decide(b.tmp, { TURN_PREREG: bad });
    check(`run 3: a flipped hash in section 2 -> stdout is exactly "VOID", exit ${d.status}`, d.status === 4 && d.stdout.trim() === 'VOID' && /sha256/.test(d.stderr));
    const empty = path.join(b.tmp, 'prereg-empty.md'); fs.writeFileSync(empty, text.replace(/[0-9a-f]{64}/g, ''));   // every hash removed = the unfilled registration
    const d3b = decide(b.tmp, { TURN_PREREG: empty });
    check('run 3b: an EMPTY section 2 table (the unfilled registration) -> VOID', d3b.status === 4 && d3b.stdout.trim() === 'VOID');
    const stray = path.join(R, 'scripts', 'zz-stray.mjs'); fs.writeFileSync(stray, '// stray\n');
    const d3c = decide(b.tmp);
    fs.unlinkSync(stray);
    check('run 3c: a script under R/scripts that the table does not list -> VOID', d3c.status === 4 && d3c.stdout.trim() === 'VOID' && /does not list/.test(d3c.stderr));
}
for (const t of cleanup) fs.rmSync(t, { recursive: true, force: true });
check('nothing was written into the real R folder (no answer file, no blind folder)', C.answerFiles(C.R_DIR).length === 0 && !fs.existsSync(path.join(C.R_DIR, 'blind')));
console.log(ok ? 'E2E OK' : 'E2E FAILED');
process.exit(ok ? 0 : 1);
