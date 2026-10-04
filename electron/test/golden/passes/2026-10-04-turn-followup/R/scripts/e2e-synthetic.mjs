// Throwaway end-to-end check of the blind builder and the legs-decide CLI on SYNTHETIC answers and verdicts with a known outcome,
// in temp folders (FQ_OUT_DIR), so the file seams (answer files -> blind pairs/keys -> two graders' verdicts + graders.json -> merge
// -> decide) are exercised before the day. No model call, no grader, nothing in the real R folder (every transient file lives in a temp folder and
// is removed in a finally, A2 M4). It needs section 2 to verify (TURN_PREREG, default: the registered file -- A2 C1; before the OK a test sets it to
// section2-filled.md): the CLI refuses otherwise, which is itself one of the checks (run 3).
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
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.dirname(HERE);
const FT = path.dirname(R);
process.env.TURN_PREREG ??= path.join(FT, 'PREREGISTER-turn-followup.md');
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
async function build({ withEmpty, mutate, graders = {}, launch = {}, departure = false, hours = C.PRIMARY_HOURS, rerun = false, tmp: reuse = null, allowBlindFail = false }) {
    const tmp = reuse ?? fs.mkdtempSync(path.join(os.tmpdir(), 'turn-e2e-'));
    cleanup.push(tmp);
    process.env.FQ_OUT_DIR = tmp;
    writeAnswers(tmp, { withEmpty, mutate, hours });
    const b = runNode(path.join(HERE, 'followup-turn-blind.mjs'), tmp, rerun ? ['--rerun'] : []);
    if (b.status !== 0) {
        if (allowBlindFail) return { tmp, blindFailed: b };
        console.log(`blind exit ${b.status} ${b.stderr}`); process.exit(1);
    }
    const blindDir = path.join(tmp, rerun ? 'blind-rerun' : 'blind');
    const files = fs.readdirSync(blindDir).filter((x) => /^pairs\.blind-\d+\.json$/.test(x));
    const slots = {}, tool = { models: [], memory: [], audit: [] }, launches = [];
    for (const f of files) {
        const n = f.match(/(\d+)/)[1];
        const { items } = JSON.parse(fs.readFileSync(path.join(blindDir, f), 'utf8'));
        for (const g of ['g1', 'g2']) {
            const vv = Object.fromEntries(items.map((it) => [it.key, it.answer.startsWith('PLANTED-WEAK') ? { correctness: 2, on_topic: 2, delivery: 0, reason: 'synthetic weak' } : { correctness: 2, on_topic: 2, delivery: 2, reason: 'synthetic acceptable' }]));
            fs.writeFileSync(path.join(blindDir, `verdicts.blind-${n}.${g}.json`), JSON.stringify(vv, null, 1));
            const tag = `blind-${n}.${g}`;
            const slot = { agent: `synthetic${n}${g}`, attempt: 1, cwd: `C:/F/grading/${tag}-a1`, model: C.PINNED_GRADER, memory: 'ABSENT', projectMemory: 0, claudeMem: 0, audit: 'clean', bash: [], replaced: [], ...(graders[tag] ?? {}) };
            if (slot.memory === 'LOADED' && graders[tag]?.projectMemory === undefined) slot.projectMemory = 4;
            slots[tag] = slot;
            // A2 point 11: the launcher's line for this slot's agent (exit 0, one .jsonl, no memory folder) -- `launch[tag]` overrides fields (or null drops the line)
            if (launch[tag] !== null) launches.push({ slot: tag, attempt: slot.attempt, session_id: slot.agent, model: slot.model, exit: 0, cwd: slot.cwd, startedAt: '2026-10-04T05:00:00.000Z', endedAt: '2026-10-04T05:05:00.000Z', slugJsonl: 1, memoryDir: 'absent', ...(launch[tag] ?? {}) });
            // A2 point 5: the three tools' stdout, kept beside graders.json -- written from the same slot values, so a consistent set agrees with the labels
            tool.models.push(`${tag}: {"${slot.model}":1} ${slot.model === C.PINNED_GRADER ? 'PINNED' : 'NOT PINNED'}  (found by session path: synthetic)`);
            tool.memory.push(`${tag}: ${slot.memory}  projectMemory=${slot.projectMemory} claudeMem=${slot.claudeMem}  (synthetic)`);
            tool.audit.push(`${tag} (${slot.agent.slice(0, 18)}): 4 tool inputs [Readx2 Writex1]; ${slot.audit === 'clean' ? 'clean' : 'FLAGGED 1: synthetic'}; bash=[${slot.bash.join(',')}]; dispatch=match`);
        }
    }
    fs.writeFileSync(path.join(blindDir, 'graders.json'), JSON.stringify({ instrument: C.INSTRUMENT, ...(departure ? { departure: true } : {}), graders: slots }, null, 1));
    fs.writeFileSync(path.join(blindDir, 'launches.jsonl'), launches.map((l) => JSON.stringify(l)).join('\n') + '\n');
    for (const [k, name] of [['models', 'graders.models.out.txt'], ['memory', 'graders.memory.out.txt'], ['audit', 'graders.audit.out.txt']]) fs.writeFileSync(path.join(blindDir, name), `${tool[k].join('\n')}\n`);
    return { tmp, blind: b.stdout, blindDir, nFiles: files.length };
}
const decide = (tmp, env = {}, args = []) => spawnSync(process.execPath, [path.join(R, 'legs-decide.mjs'), ...args], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: tmp, TURN_PREREG: process.env.TURN_PREREG, ...env }, maxBuffer: 32 << 20 });
let ok = true;
const check = (name, pass) => { ok &&= !!pass; console.log(`${pass ? 'OK ' : 'BAD'} ${name}`); };
const cleanup = [];
/** A copy of the registration in a temp folder with `line` added to section 3 (the departure note) -- section 2 is untouched, so it verifies. */
const preregWith = (tmp, name, line, { after = '' } = {}) => {
    const text = fs.readFileSync(process.env.TURN_PREREG, 'utf8');
    const at = text.indexOf('\n## 4.');
    const f = path.join(tmp, name);
    fs.writeFileSync(f, `${text.slice(0, at)}\n${line}\n${text.slice(at)}${after}`);
    return f;
};
const NOTE = 'DEPARTURE-S6-ACCEPTED 2026-10-03 22:40 -- the user accepted graders as design 2\'s (verbatim answer recorded in run.log)';
try {

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
// ── run 14: A2 points 5 + 11 -- every slot's agent must be the session of a launcher line (exit 0, one .jsonl, no memory folder) ──
{
    const b0 = await build({ withEmpty: false });
    const d0 = decide(b0.tmp);
    check(`run 14: the full synthetic run WITH launches.jsonl decides (exit ${d0.status})`, d0.status === 0 && /DECISION/.test(d0.stdout));
    const lf = path.join(b0.blindDir, 'launches.jsonl'), orig = fs.readFileSync(lf, 'utf8');
    const setLines = (fn) => fs.writeFileSync(lf, orig.trim().split('\n').map((l) => JSON.stringify(fn(JSON.parse(l)))).join('\n') + '\n');
    fs.rmSync(lf);
    const d1 = decide(b0.tmp);
    check('run 14a: launches.jsonl absent -> REPORTED, NOT DECIDED (the labels must come from launcher lines)', d1.status === 3 && /launches\.jsonl is missing/.test(d1.stdout) && !/DECISION/.test(d1.stdout));
    setLines((l) => (l.slot === 'blind-5.g2' ? { ...l, exit: 1 } : l));
    const d2 = decide(b0.tmp);
    check('run 14b: one launcher line with exit 1 -> REPORTED, NOT DECIDED naming the slot', d2.status === 3 && /blind-5\.g2: launcher exit 1/.test(d2.stdout));
    setLines((l) => (l.slot === 'blind-2.g1' ? { ...l, slugJsonl: 2 } : l));
    const d3 = decide(b0.tmp);
    check('run 14c: slugJsonl 2 -> REPORTED, NOT DECIDED', d3.status === 3 && /blind-2\.g1: slugJsonl 2/.test(d3.stdout));
    setLines((l) => (l.slot === 'blind-8.g1' ? { ...l, memoryDir: 'non-empty' } : l));
    check('run 14d: a non-empty memory folder after the attempt -> REPORTED, NOT DECIDED', decide(b0.tmp).status === 3);
    setLines((l) => (l.slot === 'blind-9.g2' ? { ...l, session_id: 'someothersession' } : l));
    const d5 = decide(b0.tmp);
    check('run 14e: graders.json names an agent no launcher line has -> REPORTED, NOT DECIDED', d5.status === 3 && /blind-9\.g2: agent .* has no launches\.jsonl line/.test(d5.stdout));
    setLines((l) => (l.slot === 'blind-4.g1' ? { ...l, cwd: 'C:/F/grading' } : l));
    check('run 14f: a launcher line whose cwd is shared (not <slot>-a<attempt>) -> REPORTED, NOT DECIDED', decide(b0.tmp).status === 3);
    fs.writeFileSync(lf, orig);
    const d6 = decide(b0.tmp);
    check('run 14g: the restored launches.jsonl decides again (the refusals above were the lines, nothing else)', d6.status === 0 && /DECISION/.test(d6.stdout));
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
    // A2 M4: no stray file is written into the hashed folders any more -- a script the table does not list is simulated by RENAMING one table entry
    // in a temp copy of the registration (the real blind builder is then a script under R/scripts/ that the copy does not list)
    const unlisted = path.join(b.tmp, 'prereg-unlisted.md'); fs.writeFileSync(unlisted, text.replaceAll('R/scripts/followup-turn-blind.mjs ', 'R/scripts/zz-renamed.mjs '));
    const d3c = decide(b.tmp, { TURN_PREREG: unlisted });
    check('run 3c: a script under R/scripts that the table does not list (a temp copy of the table with one entry renamed) -> VOID', d3c.status === 4 && d3c.stdout.trim() === 'VOID' && /does not list/.test(d3c.stderr));
}
// ── A2 runs 8-12: the departure, the hard stop, VOID after a DECISION, derived labels ──
{   // run 8: the section 6 departure accepted (departure: true AND the dated note): LOADED slots decide, and the exposure statement is the FIRST line
    const b = await build({ withEmpty: false, departure: true, graders: { 'blind-3.g1': { memory: 'LOADED' }, 'blind-7.g2': { memory: 'LOADED', projectMemory: 34 } } });
    const dep = preregWith(b.tmp, 'prereg-departure.md', NOTE);
    const d = decide(b.tmp, { TURN_PREREG: dep });
    check(`run 8: departure accepted (label + note): the LOADED slots decide, exit ${d.status}`, d.status === 0 && /DECISION: PASS/.test(d.stdout));
    check('run 8: the FIRST line of the result is "GRADERS LOADED PROJECT MEMORY (departure from spec §6, §3 note 2026-10-03 22:40)"', d.stdout.split('\n')[0] === 'GRADERS LOADED PROJECT MEMORY (departure from spec §6, §3 note 2026-10-03 22:40)');
    // run 8b: the same graders.json against the registration WITHOUT the note: a departure label without the note is refused
    const d8b = decide(b.tmp);
    check(`run 8b: departure: true without the note in the registered file -> REPORTED, NOT DECIDED (exit ${d8b.status}), no DECISION`, d8b.status === 3 && /REPORTED, NOT DECIDED/.test(d8b.stdout) && /without the note|holds no section 3 note/.test(d8b.stdout) && !/DECISION/.test(d8b.stdout));
    // run 8c: A2's own prose ("... contains `DEPARTURE-S6-ACCEPTED` ...") in section 3 and as an amendment is a mention, not the note
    const prose = preregWith(b.tmp, 'prereg-prose.md', 'the registered file contains `DEPARTURE-S6-ACCEPTED` 2026-10-03 22:40 on its first line', { after: '\n## AMENDMENT A2\n\nDEPARTURE-S6-ACCEPTED 2026-10-03 22:41\n' });
    const d8c = decide(b.tmp, { TURN_PREREG: prose });
    check('run 8c: a MENTION of the marker (section 3 prose, or a line-start outside section 3) is not the note -> REPORTED, NOT DECIDED', d8c.status === 3 && /REPORTED, NOT DECIDED/.test(d8c.stdout) && !/DECISION/.test(d8c.stdout));
    // run 8d: under the departure a claude-mem context marker still refuses the slot
    const g = path.join(b.blindDir, 'graders.json'), gj = JSON.parse(fs.readFileSync(g, 'utf8'));
    gj.graders['blind-3.g1'].claudeMem = 1; fs.writeFileSync(g, JSON.stringify(gj));
    const memFile = path.join(b.blindDir, 'graders.memory.out.txt');
    fs.writeFileSync(memFile, fs.readFileSync(memFile, 'utf8').replace('blind-3.g1: LOADED  projectMemory=4 claudeMem=0', 'blind-3.g1: LOADED  projectMemory=4 claudeMem=1'));
    const d8d = decide(b.tmp, { TURN_PREREG: dep });
    check('run 8d: LOADED with a claude-mem marker under the accepted departure -> REPORTED, NOT DECIDED naming claude-mem', d8d.status === 3 && /claude-mem context markers \(1\)/.test(d8d.stdout) && !/DECISION/.test(d8d.stdout));
}
{   // run 8e: departure accepted but NO slot LOADED: nothing to confess, so no exposure line
    const b = await build({ withEmpty: false, departure: true });
    const d = decide(b.tmp, { TURN_PREREG: preregWith(b.tmp, 'prereg-departure.md', NOTE) });
    check('run 8e: departure accepted, every slot ABSENT -> decides, and does NOT print the exposure line', d.status === 0 && /DECISION: PASS/.test(d.stdout) && !/GRADERS LOADED PROJECT MEMORY/.test(d.stdout));
}
{   // run 9: derived labels -- graders.json that disagrees with the tools' stdout, a missing tool file, a stray slot
    const b = await build({ withEmpty: false });
    const g = path.join(b.blindDir, 'graders.json'), orig = fs.readFileSync(g, 'utf8');
    const gj = () => JSON.parse(orig);
    let x = gj(); x.graders['blind-2.g2'].model = 'claude-opus-4'; fs.writeFileSync(g, JSON.stringify(x));
    check('run 9a: graders.json hand-typed a model the tool did not print -> REPORTED, NOT DECIDED', decide(b.tmp).status === 3);
    x = gj(); x.graders['blind-2.g2'].audit = 'FLAGGED'; fs.writeFileSync(g, JSON.stringify(x));
    check('run 9b: graders.json says FLAGGED where the audit output says clean -> REPORTED, NOT DECIDED', decide(b.tmp).status === 3);
    x = gj(); x.graders['blind-10.g1'] = x.graders['blind-1.g1']; fs.writeFileSync(g, JSON.stringify(x));
    const d9c = decide(b.tmp);
    check('run 9c: a stray slot beside the 18 -> REPORTED, NOT DECIDED naming it', d9c.status === 3 && /blind-10\.g1/.test(d9c.stdout));
    fs.writeFileSync(g, orig);
    const audit = path.join(b.blindDir, 'graders.audit.out.txt'), auditText = fs.readFileSync(audit, 'utf8');
    fs.unlinkSync(audit);
    const d9d = decide(b.tmp);
    check('run 9d: graders.audit.out.txt missing -> REPORTED, NOT DECIDED (the labels must be derived)', d9d.status === 3 && /graders\.audit\.out\.txt is missing/.test(d9d.stdout));
    fs.writeFileSync(audit, auditText);
    check('run 9e: with the three files restored the very same folder decides PASS (the refusals above were the labels, nothing else)', /DECISION: PASS/.test(decide(b.tmp).stdout));
}
{   // run 10: the hard stop -- a STOPPED marker, a record ending at/after the cutoff: refused WITHOUT VOID (decide and the blind builder)
    const b = await build({ withEmpty: false });
    fs.writeFileSync(path.join(b.tmp, 'STOPPED-back.txt'), 'STOPPED AT HARD STOP back x\n');
    const d = decide(b.tmp);
    check(`run 10a: R/STOPPED-back.txt present -> REPORTED, NOT DECIDED (exit ${d.status}): no VOID, no clause line, no DECISION`, d.status === 3 && /REPORTED, NOT DECIDED/.test(d.stdout) && !/VOID|DECISION|^1\. /m.test(d.stdout));
    fs.unlinkSync(path.join(b.tmp, 'STOPPED-back.txt'));
    check('run 10a: ... and with the marker moved away the same folder decides PASS', /DECISION: PASS/.test(decide(b.tmp).stdout));
    const f = answerPath(b.tmp, 'front', 's50m', 'A', 2); const s = JSON.parse(fs.readFileSync(f, 'utf8')); const k0 = Object.keys(s)[0];
    s[k0].end = '2026-10-04T06:30:00.000Z'; fs.writeFileSync(f, JSON.stringify(s));
    const d10b = decide(b.tmp);
    check(`run 10b: one record whose end is exactly the cutoff -> REPORTED, NOT DECIDED (exit ${d10b.status}), no VOID`, d10b.status === 3 && /end at or after the hard stop/.test(d10b.stdout) && !/VOID|DECISION/.test(d10b.stdout));
    s[k0].end = '2026-10-04T06:29:59.999Z'; fs.writeFileSync(f, JSON.stringify(s));
    check('run 10b: ... one millisecond earlier it decides', /DECISION: PASS/.test(decide(b.tmp).stdout));
    // the blind builder, in fresh folders
    const t1 = fs.mkdtempSync(path.join(os.tmpdir(), 'turn-e2e-')); cleanup.push(t1);
    writeAnswers(t1, { withEmpty: false });
    fs.writeFileSync(path.join(t1, 'STOPPED-front.txt'), 'x\n');
    const b1 = runNode(path.join(HERE, 'followup-turn-blind.mjs'), t1);
    check(`run 10c: the blind builder REFUSES while R/STOPPED-front.txt exists (exit ${b1.status}) and builds no file`, b1.status !== 0 && /hard stop/.test(b1.stderr + b1.stdout) && !fs.existsSync(path.join(t1, 'blind')));
    const b2 = await build({ withEmpty: false, mutate: (rec) => { if (rec.leg === 'back' && rec.key === 's50l:S2Q08F' && rec.arm === 'B' && rec.rep === 3) rec.end = '2026-10-04T07:00:00.000Z'; }, allowBlindFail: true });
    check(`run 10d: the blind builder REFUSES a record that ended after the cutoff (exit ${b2.blindFailed?.status})`, b2.blindFailed && b2.blindFailed.status !== 0 && /hard stop/.test(b2.blindFailed.stderr + b2.blindFailed.stdout));
}
{   // run 11: VOID is never printed once a DECISION line is on file (A2 M5): the changed hash is reported as an INCIDENT
    const b = await build({ withEmpty: false });
    const text = fs.readFileSync(process.env.TURN_PREREG, 'utf8');
    const m = /earlierQuestion\.ref\.test\.mjs ([0-9a-f]{64})/.exec(text);
    const bad = path.join(b.tmp, 'prereg-flipped.md'); fs.writeFileSync(bad, text.replace(m[1], (m[1][0] === 'a' ? 'b' : 'a') + m[1].slice(1)));
    check('run 11a: BEFORE any result is on file a flipped hash still prints exactly VOID', decide(b.tmp, { TURN_PREREG: bad }).stdout.trim() === 'VOID');
    const ok1 = decide(b.tmp);
    fs.writeFileSync(path.join(b.tmp, 'RESULT-front-back.txt'), ok1.stdout);      // what day-steps decide saves
    const d = decide(b.tmp, { TURN_PREREG: bad });
    check(`run 11b: with "DECISION:" on file the same flipped hash prints INCIDENT, never VOID (exit ${d.status})`, d.status === 4 && /^INCIDENT: /.test(d.stdout) && !/^VOID/m.test(d.stdout));
    check('run 11c: ... and the decision file is untouched, a re-run with the true registration still reads PASS', /DECISION: PASS/.test(fs.readFileSync(path.join(b.tmp, 'RESULT-front-back.txt'), 'utf8')) && /DECISION: PASS/.test(decide(b.tmp).stdout));
}
{   // run 12: day-pre's quota arithmetic (A2 M2), pure functions (the script itself is the day's and is never run here)
    const D = await import(pathToFileURL(path.join(R, 'day-pre.mjs')).href);
    check('run 12a: quota start = the latest 07:00Z at or before now (19:30Z 3 Oct, 05:00Z 4 Oct, 06:59:59.999Z 4 Oct -> 3 Oct; 07:00Z 4 Oct -> 4 Oct)', D.quotaStartFor(Date.parse('2026-10-03T19:30:00Z')) === '2026-10-03T07:00:00.000Z' && D.quotaStartFor(Date.parse('2026-10-04T05:00:00Z')) === '2026-10-03T07:00:00.000Z' && D.quotaStartFor(Date.parse('2026-10-04T06:59:59.999Z')) === '2026-10-03T07:00:00.000Z' && D.quotaStartFor(Date.parse('2026-10-04T07:00:00Z')) === '2026-10-04T07:00:00.000Z');
    const counts = { 'interview60.answers.gemini-3.5-flash-lite_a-A-r1.json': 0, 'interview60.answers.gemini-3.1-flash-lite_b-A-r1.json': 0 };
    const ledger = (n35, n31, log35 = 0) => [
        `  natively_debug.log: last line x; 5 lines since the reset; lite mentions ${JSON.stringify(log35 ? { 'gemini-3.5-flash-lite': log35 } : {})}`,
        `  2026-10-03T07:13:34.535Z      21210  MAIN/electron/test/golden/passes/x/interview60.answers.gemini-3.5-flash-lite_a-A-r1.json`,
        `  2026-10-03T07:13:34.535Z      21210  SP/x/interview60.answers.gemini-3.5-flash-lite_a-A-r1.json`,
        `  2026-10-03T07:13:34.535Z      21210  SP/x/record/interview60.answers.gemini-3.5-flash-lite_a-A-r1.json`,
        `  2026-10-03T07:14:00.000Z       5000  SP/x/interview60.answers.gemini-3.1-flash-lite_b-A-r1.json`,
    ].join('\n') + `\n#${n35},${n31}`;
    const hrOf = (n35, n31, log35 = 0) => { const t = ledger(n35, n31, log35); return D.headroomFrom(t, (p) => JSON.stringify(Object.fromEntries(Array.from({ length: /3\.5/.test(p) ? n35 : n31 }, (_, i) => [`k${i}`, {}])))); };
    let h = hrOf(84, 0);
    check('run 12b: the same answer file listed in three places is counted ONCE: 84 records -> used 84, headroom 416 on 3.5-lite; 3.1-lite 500', h['gemini-3.5-flash-lite'].used === 84 && h['gemini-3.5-flash-lite'].headroom === 416 && h['gemini-3.5-flash-lite'].ok && h['gemini-3.1-flash-lite'].headroom === 500);
    check('run 12c: the stop line is 290 / 98: 3.5-lite used 210 -> 290 OK, used 211 -> 289 SHORT; 3.1-lite used 402 -> 98 OK, used 403 -> 97 SHORT', hrOf(210, 0)['gemini-3.5-flash-lite'].ok && !hrOf(211, 0)['gemini-3.5-flash-lite'].ok && hrOf(0, 402)['gemini-3.1-flash-lite'].ok && !hrOf(0, 403)['gemini-3.1-flash-lite'].ok);
    h = hrOf(200, 0, 11);
    check('run 12d: app-log mentions add to the answer-file records (upper bound): 200 + 11 -> headroom 289 SHORT', h['gemini-3.5-flash-lite'].used === 211 && !h['gemini-3.5-flash-lite'].ok);
}
{   // run 13: the two new section 2 rows (A2 M1) -- the judge module and the dispatch text -- are REQUIRED and checked by hash and size
    const tmp13 = fs.mkdtempSync(path.join(os.tmpdir(), 'turn-e2e-')); cleanup.push(tmp13);
    const text = fs.readFileSync(process.env.TURN_PREREG, 'utf8');
    const variant = (name, edit) => { const f = path.join(tmp13, name); fs.writeFileSync(f, edit(text)); return C.verifySection2(f); };
    const flip = (t, rel) => { const m = new RegExp(`${rel.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} ([0-9a-f]{64})`).exec(t); return t.replace(m[0], `${rel} ${(m[1][0] === 'a' ? 'b' : 'a')}${m[1].slice(1)}`); };
    let v13 = C.verifySection2();
    check('run 13a: the registration under test verifies (judge.mjs and the dispatch text rows included)', v13.ok);
    v13 = variant('no-judge-row.md', (t) => t.replaceAll(`${C.JUDGE_REL} `, 'MAIN/electron/test/golden/zz-not-the-judge.mjs '));
    check('run 13b: the judge.mjs row missing -> not verified (required row missing)', !v13.ok && v13.problems.some((p) => p.includes(C.JUDGE_REL) && /required row missing/.test(p)), v13.problems[0]?.slice(0, 80));
    v13 = variant('flipped-judge.md', (t) => flip(t, C.JUDGE_REL));
    check('run 13c: a flipped judge.mjs hash -> not verified', !v13.ok && v13.problems.some((p) => p.includes('interview60.judge.mjs') && /sha256/.test(p)));
    v13 = variant('no-dispatch-row.md', (t) => t.replaceAll(`${C.DISPATCH_REL} `, '../validation-hour/zz-not-the-dispatch.txt '));
    check('run 13d: the dispatch-text row missing -> not verified', !v13.ok && v13.problems.some((p) => p.includes(C.DISPATCH_REL) && /required row missing/.test(p)));
    v13 = variant('flipped-dispatch.md', (t) => flip(t, C.DISPATCH_REL));
    check('run 13e: a flipped dispatch-text hash -> not verified (the table AND the pinned f8d64670...81cd)', !v13.ok && v13.problems.some((p) => p.includes('h40d-grader-dispatch') || p.includes('dispatch-text row')));
    v13 = variant('wrong-dispatch-bytes.md', (t) => t.replace(new RegExp(`${C.DISPATCH_REL.replace(/\./g, '\\.')} ${C.DISPATCH_BYTES}`), `${C.DISPATCH_REL} ${C.DISPATCH_BYTES + 1}`));
    check('run 13f: a wrong byte count for the dispatch text -> not verified', !v13.ok && v13.problems.some((p) => /bytes/.test(p) || /dispatch-text row/.test(p)));
}
} finally {
    for (const t of cleanup) fs.rmSync(t, { recursive: true, force: true });
}
check('nothing was written into the real R folder (no answer file, no blind folder, no stray script, no STOPPED marker)', C.answerFiles(C.R_DIR).length === 0 && !fs.existsSync(path.join(C.R_DIR, 'blind')) && C.stoppedMarkers(C.R_DIR).length === 0 && C.unlistedScripts().length === 0 && !fs.existsSync(path.join(C.R_DIR, 'scripts', 'zz-stray.mjs')) && !fs.existsSync(path.join(C.R_DIR, 'mutant-decide.mjs')));
console.log(ok ? 'E2E OK' : 'E2E FAILED');
process.exit(ok ? 0 : 1);
