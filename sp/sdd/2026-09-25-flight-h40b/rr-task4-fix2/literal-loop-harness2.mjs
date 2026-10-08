// Re-review 2 probe (throwaway; reads the deliverables, writes nothing but its own stdout).
// Runs the per-item loop TEXT sliced out of the two real files — not a hand copy:
//   NEW = SP/gemma-answers.mjs, sliced from `const MAX_TRIES_ENV` (M6's hoisted block) to the end of the
//         per-item loop, so the M6 check, M1's guard and N2's record line all execute as written;
//   OLD = rr-task4-fix2/gen/gemma-answers.mjs, regenerated TODAY from MAIN's interview60.answers.mjs by a
//         copy of gemma-answers-gen.mjs (byte-identical to re-review 1's pre-task4-runner.mjs), sliced
//         from `for (const item of todo) {`.
// Variants are made from NEW by exact single-match replacement (refused unless exactly one match):
//   ROUND1   = NEW minus M1's guard line minus N2's field  (round 1's loop, for "one-try unchanged")
//   NO_M1    = NEW minus M1's guard line                   (calibration: must show round 1's 162)
//   NO_N2    = NEW minus N2's field                        (calibration: must show 2 under-counts)
//   NO_M6    = NEW minus the isFinite refusal              (calibration: 'abc' must run unbounded)
// Fakes: pacedAnswer (scripted), sleep (recorded), fs.writeFileSync (no-op), process (env + exit that
// throws). No network is reachable from the sliced text.
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix2`;
const END = '\n}\n\n// ── summary';
const slice = (file, start) => {
    const t = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const a = t.indexOf(start), b = t.indexOf(END);
    if (a < 0 || b < 0 || b < a || t.indexOf(start, a + 1) >= 0) throw new Error(`cannot slice ${file}`);
    return t.slice(a, b + 2);
};
const once = (txt, from, to, label) => {
    const n = txt.split(from).length - 1;
    if (n !== 1) throw new Error(`${label}: expected exactly 1 match, found ${n}`);
    return txt.replace(from, () => to);
};
const NEW_TXT = slice(`${SP}/gemma-answers.mjs`, 'const MAX_TRIES_ENV = process.env.GEMMA_MAX_TRIES;');
const OLD_TXT = slice(`${HERE}/gen/gemma-answers.mjs`, 'for (const item of todo) {');
if (!/while \(true\)/.test(NEW_TXT) || !/for \(let a = 0; a < 4; a\+\+\)/.test(OLD_TXT)) throw new Error('slices are not the expected loops');
const M1_LINE = '\n                if (MAX_TRIES > 1 && attempts >= MAX_TRIES) break;';
const N2_FIELD = 'transientError: lastErr, cutRetried: dropRetried };';
const M6_LINE = 'if (!Number.isFinite(MAX_TRIES)) {';
const NO_M1_TXT = once(NEW_TXT, M1_LINE, '', 'NO_M1');
const NO_N2_TXT = once(NEW_TXT, N2_FIELD, 'transientError: lastErr };', 'NO_N2');
const ROUND1_TXT = once(NO_M1_TXT, N2_FIELD, 'transientError: lastErr };', 'ROUND1');
const NO_M6_TXT = once(NEW_TXT, M6_LINE, 'if (false) {', 'NO_M6');
console.log(`sliced NEW ${NEW_TXT.split('\n').length} lines (from the MAX_TRIES_ENV block), OLD ${OLD_TXT.split('\n').length} lines (literal pre-Task-4)`);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const PARAMS = ['todo', 'store', 'pacedAnswer', 'sleep', 'CAPTURED', 'CALL_TIMEOUT_MS', 'ARM', 'P', 'VERBAL_CHECKS', 'fs', 'OUT', 'IS_GROQ', 'groqLimits', 'console', 'process'];
const fn = (txt) => new AsyncFunction(...PARAMS, txt);
const NEW = fn(NEW_TXT), OLD = fn(OLD_TXT), ROUND1 = fn(ROUND1_TXT), NO_M1 = fn(NO_M1_TXT), NO_N2 = fn(NO_N2_TXT), NO_M6 = fn(NO_M6_TXT);

const OUTCOMES = ['CLEAN', 'CUT', 'T429', 'T503', 'ERR', 'TIMEOUT'];
const make = (o) => {
    switch (o) {
        case 'CLEAN': return { spoken: 'full answer', offers: null, words: 2, ttft: 100, total: 900, finish: 'STOP', rawLen: 11, raw: 'full answer', thoughts: 0, thoughtParts: 0 };
        case 'CUT': return { spoken: 'partial', offers: null, words: 1, ttft: 100, total: 90000, finish: null, rawLen: 7, raw: 'partial', thoughts: 0, thoughtParts: 0 };
        case 'T429': return { transient: 'HTTP 429' };
        case 'T503': return { transient: 'HTTP 503' };
        case 'ERR': throw new Error('fetch failed');
        case 'TIMEOUT': { const e = new Error('0 thought parts and 0 answer chars in'); e.name = 'TimeoutError'; throw e; }
    }
};
class Exit extends Error { constructor(code) { super(`exit ${code}`); this.code = code; } }
async function runOnce(f, seq, envTries) {
    let calls = 0; const sleeps = []; let exhausted = false, exitCode = null; const errs = [];
    const store = {};
    const item = { id: 'R01', q: 'question?', kind: 'spoken' };
    const pacedAnswer = async () => { if (calls >= seq.length) { exhausted = true; calls++; throw new Error('SCRIPT EXHAUSTED'); } return make(seq[calls++]); };
    const sleep = async (ms) => { sleeps.push(ms); };
    const fakeFs = { writeFileSync() {} };
    const quiet = { log() {}, error(...a) { errs.push(a.join(' ')); } };
    const proc = { env: envTries === undefined ? {} : { GEMMA_MAX_TRIES: envTries }, exit(code) { throw new Exit(code); } };
    try { await f([item], store, pacedAnswer, sleep, null, 180000, 'arm', {}, {}, fakeFs, 'out.json', false, null, quiet, proc); }
    catch (e) { if (e instanceof Exit) exitCode = e.code; else throw e; }
    const rec = store.R01;
    let decided = null;
    if (rec) { const { id, q, kind, model, checks, ...rest } = rec; decided = rest; }
    return { calls, consumed: seq.slice(0, Math.min(calls, seq.length)).join(','), rec: decided, sleeps: sleeps.filter((ms) => ms !== 1500), exhausted, exitCode, errs };
}
const seqs = [];
(function gen(p) { if (p.length === 6) { seqs.push(p); return; } for (const o of OUTCOMES) gen([...p, o]); })([]);
console.log(`${seqs.length} sequences of length 6 over {${OUTCOMES.join(', ')}}\n`);

// ── (1) default 4 tries: NEW vs literal OLD — calls, FULL stored record, sleeps ──
const recKey = (r) => JSON.stringify(r);
const withoutTransientCut = (r) => { if (r && r.transientError !== undefined) { const { cutRetried, ...x } = r; return x; } return r; };
for (const env of [undefined, '4']) {
    let callDiff = 0, recSame = 0, recOnlyN2False = 0, recOnlyN2True = 0, recOther = 0, sleepOnly = 0, exhausted = 0, spokenCutDiff = 0;
    const otherEx = [];
    for (const s of seqs) {
        const o = await runOnce(OLD, s, undefined), n = await runOnce(NEW, s, env);
        if (o.exhausted || n.exhausted) exhausted++;
        if (n.calls !== o.calls) callDiff++;
        if (recKey(n.rec) === recKey(o.rec)) recSame++;
        else if (recKey(withoutTransientCut(n.rec)) === recKey(o.rec)) { if (n.rec.cutRetried) recOnlyN2True++; else recOnlyN2False++; }
        else { recOther++; if (otherEx.length < 3) otherEx.push({ seq: n.consumed, old: o.rec, new: n.rec }); }
        if (n.rec && n.rec.transientError === undefined && o.rec && o.rec.cutRetried !== n.rec.cutRetried) spokenCutDiff++;
        if (n.calls === o.calls && recKey(withoutTransientCut(n.rec)) === recKey(o.rec) && JSON.stringify(n.sleeps) !== JSON.stringify(o.sleeps)) sleepOnly++;
    }
    console.log(`(1) env ${env ?? 'unset'}: calls differ ${callDiff}; stored record identical ${recSame}; differs ONLY by N2's cutRetried key on a transient record: ${recOnlyN2False + recOnlyN2True} (cutRetried:false ${recOnlyN2False}, cutRetried:true ${recOnlyN2True}); differs otherwise ${recOther}; spoken-record cutRetried differs ${spokenCutDiff}; sleeps-only differences ${sleepOnly}; scripts exhausted ${exhausted}`);
    for (const x of otherEx) console.log(`      e.g. [${x.seq}] old ${JSON.stringify(x.old)} new ${JSON.stringify(x.new)}`);
}

// ── (2) one try: NEW vs ROUND1 (round 1's loop) — calls and record; sidecar charge vs real calls ──
const one = new Map(), oneR1 = new Map();
let oneCallDiff = 0, oneRecOnlyN2 = 0, oneRecOther = 0;
for (const s of seqs) {
    const n = await runOnce(NEW, s, '1'), r1 = await runOnce(ROUND1, s, '1');
    if (n.calls !== r1.calls) oneCallDiff++;
    if (recKey(n.rec) !== recKey(r1.rec)) { if (recKey(withoutTransientCut(n.rec)) === recKey(r1.rec)) oneRecOnlyN2++; else oneRecOther++; }
    if (!one.has(n.consumed)) one.set(n.consumed, n);
    if (!oneR1.has(r1.consumed)) oneR1.set(r1.consumed, r1);
}
const charges = (m) => { let under = 0, over = 0, max = 0; const rows = []; for (const [c, n] of m) { const ch = 1 + (n.rec.cutRetried ? 1 : 0); max = Math.max(max, n.calls); if (ch < n.calls) under++; if (ch > n.calls) over++; rows.push(`  [${c}] calls ${n.calls}, sidecar charges ${ch}, ${n.rec.transientError !== undefined ? `transientError=${JSON.stringify(n.rec.transientError)} cutRetried=${n.rec.cutRetried}` : `spoken=${JSON.stringify(n.rec.spoken)} cutRetried=${n.rec.cutRetried}`}${ch < n.calls ? '  <-- UNDER-COUNT' : ''}`); } return { under, over, max, rows }; };
const cNew = charges(one), cR1 = charges(oneR1);
console.log(`\n(2) GEMMA_MAX_TRIES=1: NEW vs ROUND1 over ${seqs.length}: calls differ ${oneCallDiff}; record differs only by N2's cutRetried key ${oneRecOnlyN2}; record differs otherwise ${oneRecOther}`);
console.log(`    NEW: ${one.size} distinct behaviours, max calls ${cNew.max}, sidecar under-counts ${cNew.under}, over-counts ${cNew.over}`);
for (const r of cNew.rows) console.log(r);
console.log(`    ROUND1 (no N2) for comparison: under-counts ${cR1.under}`);

// ── (3) probe calibration: would it answer differently if the effect were absent? ──
let selfDiff = 0, noM1CallDiff = 0, noM1Fifth = 0;
for (const s of seqs) {
    const a = await runOnce(OLD, s, undefined), b = await runOnce(OLD, s, undefined);
    if (a.calls !== b.calls || recKey(a.rec) !== recKey(b.rec) || JSON.stringify(a.sleeps) !== JSON.stringify(b.sleeps)) selfDiff++;
    const m = await runOnce(NO_M1, s, undefined);
    if (m.calls !== a.calls) { noM1CallDiff++; if (m.calls === 5) noM1Fifth++; }
}
const oneNoN2 = new Map();
for (const s of seqs) { const n = await runOnce(NO_N2, s, '1'); if (!oneNoN2.has(n.consumed)) oneNoN2.set(n.consumed, n); }
const cNoN2 = charges(oneNoN2);
console.log(`\n(3) calibration: OLD vs OLD differs on ${selfDiff} (must be 0); NO_M1 vs OLD at 4: calls differ on ${noM1CallDiff} (${noM1Fifth} make a 5th call; re-review 1 measured 162); NO_N2 at 1: under-counts ${cNoN2.under} (must be 2)`);

// ── (4) M6 on the literal text: the refusal happens before any call ──
const longT = [...Array(60).fill('T503'), 'CLEAN'];
for (const env of ['abc', 'Infinity', '1e999', 'NaN', '', '  ', '0', '-3', '2.5', ' 4 ', '1', undefined]) {
    const n = await runOnce(NEW, longT, env);
    console.log(`(4) GEMMA_MAX_TRIES=${env === undefined ? '(unset)' : JSON.stringify(env)}: exit ${n.exitCode ?? '-'}, calls ${n.calls}${n.errs.length ? `, stderr ${JSON.stringify(n.errs[0])}` : ''}`);
}
const nanNoM6 = await runOnce(NO_M6, longT, 'abc');
console.log(`(4) calibration: NO_M6 with 'abc' -> exit ${nanNoM6.exitCode ?? '-'}, calls ${nanNoM6.calls} (unbounded until the CLEAN on call 61)`);
