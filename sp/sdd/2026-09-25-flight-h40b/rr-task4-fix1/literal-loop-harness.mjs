// Re-review probe (throwaway, read-only on every deliverable): runs the per-item loop TEXT sliced out
// of the two real files, not a hand copy:
//   NEW = SP/gemma-answers.mjs (the fix round's runner)
//   OLD = rr-task4-fix1/pre-task4-runner.mjs (regenerated from MAIN's source by a COPY of
//         gemma-answers-gen.mjs; diff vs NEW = the Task 4 hunks only)
// against a scripted fake pacedAnswer, over EVERY outcome sequence of length 6 over
// {CLEAN, CUT, T429, T503, ERR, TIMEOUT}. No network: pacedAnswer is the injected fake, fetch is
// never reachable from the sliced text.
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix1`;
const slice = (file) => {
    const t = fs.readFileSync(file, 'utf8');
    const a = t.indexOf('for (const item of todo) {');
    const b = t.indexOf('\n}\n\n// ── summary');
    if (a < 0 || b < 0 || b < a) throw new Error(`cannot slice ${file}`);
    return t.slice(a, b + 2);
};
const NEW_TXT = slice(`${SP}/gemma-answers.mjs`);
const OLD_TXT = slice(`${HERE}/pre-task4-runner.mjs`);
console.log(`sliced NEW ${NEW_TXT.split('\n').length} lines, OLD ${OLD_TXT.split('\n').length} lines`);
if (!/while \(true\)/.test(NEW_TXT) || !/for \(let a = 0; a < 4; a\+\+\)/.test(OLD_TXT)) throw new Error('slices are not the expected loops');

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const PARAMS = ['todo', 'store', 'pacedAnswer', 'sleep', 'CAPTURED', 'CALL_TIMEOUT_MS', 'ARM', 'P', 'VERBAL_CHECKS', 'fs', 'OUT', 'IS_GROQ', 'groqLimits', 'console', 'process'];
const NEW = new AsyncFunction(...PARAMS, NEW_TXT);
const OLD = new AsyncFunction(...PARAMS, OLD_TXT);

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
async function runOnce(fn, seq, envTries) {
    let calls = 0; const sleeps = []; let exhausted = false;
    const store = {};
    const item = { id: 'R01', q: 'question?', kind: 'spoken' };
    const pacedAnswer = async () => { if (calls >= seq.length) { exhausted = true; calls++; throw new Error('SCRIPT EXHAUSTED'); } return make(seq[calls++]); };
    const sleep = async (ms) => { sleeps.push(ms); };
    const fakeFs = { writeFileSync() {} };
    const quiet = { log() {}, error() {} };
    const proc = { env: envTries === undefined ? {} : { GEMMA_MAX_TRIES: envTries } };
    await fn([item], store, pacedAnswer, sleep, null, 180000, 'arm', {}, {}, fakeFs, 'out.json', false, null, quiet, proc);
    const rec = store.R01;
    // strip the item/model fields: the comparison is about what the loop decided
    const { id, q, kind, model, checks, ...decided } = rec;
    return { calls, consumed: seq.slice(0, Math.min(calls, seq.length)).join(','), rec: decided, sleeps: sleeps.filter((ms) => ms !== 1500), exhausted };
}

// all sequences of length 6
const seqs = [];
(function gen(prefix) { if (prefix.length === 6) { seqs.push(prefix); return; } for (const o of OUTCOMES) gen([...prefix, o]); })([]);
console.log(`${seqs.length} sequences`);

// ── (iv) default 4: NEW (env unset, and env '4') vs OLD, literal texts ──
const diffs = new Map();
let exhaustedAny = false;
for (const s of seqs) {
    const o = await runOnce(OLD, s, undefined);
    for (const env of [undefined, '4']) {
        const n = await runOnce(NEW, s, env);
        if (n.exhausted || o.exhausted) exhaustedAny = true;
        const sameCalls = n.calls === o.calls, sameRec = JSON.stringify(n.rec) === JSON.stringify(o.rec), sameSleeps = JSON.stringify(n.sleeps) === JSON.stringify(o.sleeps);
        if (!sameCalls || !sameRec || !sameSleeps) {
            const k = `${env ?? 'unset'} | old consumed [${o.consumed}] new consumed [${n.consumed}]`;
            if (!diffs.has(k)) diffs.set(k, { env: env ?? 'unset', old: o, new: n, sameCalls, sameRec, sameSleeps });
        }
    }
}
console.log(`exhausted any script: ${exhaustedAny}`);
const callOrRec = [...diffs.values()].filter((d) => !d.sameCalls || !d.sameRec);
const sleepOnly = [...diffs.values()].filter((d) => d.sameCalls && d.sameRec && !d.sameSleeps);
const short = (rec) => (rec.transientError !== undefined ? `transientError ${JSON.stringify(rec.transientError)}` : `spoken ${JSON.stringify(rec.spoken)} cutRetried=${rec.cutRetried}`);
const unsetOnly = callOrRec.filter((d) => d.env === 'unset');
console.log(`\n=== default 4 vs literal pre-Task-4 loop: ${callOrRec.length} distinct behaviours differ in CALLS or STORED RECORD (${unsetOnly.length} with the env unset, ${callOrRec.length - unsetOnly.length} with '4') ===`);
const firstCutAt4 = unsetOnly.filter((d) => /^(T429|T503|ERR),(T429|T503|ERR),(T429|T503|ERR),CUT,/.test(d.new.consumed));
console.log(`  of the ${unsetOnly.length} (env unset): ${firstCutAt4.length} are "three failures, then the FIRST cut on call 4" -> OLD stops at 4 calls, NEW makes a 5th; other shapes: ${unsetOnly.length - firstCutAt4.length}`);
const byFifth = {};
for (const d of unsetOnly) { const fifth = d.new.consumed.split(',')[4]; (byFifth[fifth] ??= { n: 0, recDiffers: 0, ex: d }).n++; if (JSON.stringify(d.new.rec) !== JSON.stringify(d.old.rec)) byFifth[fifth].recDiffers++; }
for (const [fifth, { n, recDiffers, ex }] of Object.entries(byFifth)) console.log(`  5th call ${fifth.padEnd(7)}: ${n} sequences, stored record differs in ${recDiffers}; e.g. [${ex.new.consumed}]  old -> ${short(ex.old.rec)} | new -> ${short(ex.new.rec)}`);
console.log(`\n=== default 4: ${sleepOnly.length} distinct behaviours differ ONLY in the sleeps requested (same calls, same record) — first 4: ===`);
for (const d of sleepOnly.slice(0, 4)) console.log(`  env=${d.env}  [${d.old.consumed}]  old sleeps ${JSON.stringify(d.old.sleeps)}  new sleeps ${JSON.stringify(d.new.sleeps)}`);

// ── MAX_TRIES=1: calls, record, and what the sidecar charges (1 per id + 1 if record.cutRetried) ──
const one = new Map();
for (const s of seqs) {
    const n = await runOnce(NEW, s, '1');
    if (!one.has(n.consumed)) one.set(n.consumed, n);
}
console.log(`\n=== GEMMA_MAX_TRIES=1 (the sidecar's env): ${one.size} distinct behaviours ===`);
let maxCalls = 0, under = 0;
for (const [c, n] of one) {
    maxCalls = Math.max(maxCalls, n.calls);
    const charge = 1 + (n.rec.cutRetried ? 1 : 0);
    const flag = charge < n.calls ? '  <-- UNDER-COUNT' : charge > n.calls ? '  (over-count)' : '';
    if (charge < n.calls) under++;
    console.log(`  [${c}] calls ${n.calls}, sidecar charges ${charge}, record ${n.rec.transientError !== undefined ? `transientError=${JSON.stringify(n.rec.transientError)}` : `spoken=${JSON.stringify(n.rec.spoken)} finish=${n.rec.finish} cutRetried=${n.rec.cutRetried}`}${flag}`);
}
console.log(`  max calls under one try: ${maxCalls}; behaviours the sidecar under-counts: ${under}`);

// ── calibration of this probe itself: OLD vs OLD must show 0 differences; OLD vs NEW at '1' must show some ──
let selfDiff = 0, knownDiff = 0;
for (const s of seqs) {
    const a = await runOnce(OLD, s, undefined), b = await runOnce(OLD, s, undefined), c = await runOnce(NEW, s, '1');
    if (a.calls !== b.calls || JSON.stringify(a.rec) !== JSON.stringify(b.rec) || JSON.stringify(a.sleeps) !== JSON.stringify(b.sleeps)) selfDiff++;
    if (a.calls !== c.calls || JSON.stringify(a.rec) !== JSON.stringify(c.rec)) knownDiff++;
}
console.log(`\nprobe calibration: OLD vs OLD differs on ${selfDiff} of ${seqs.length} sequences (must be 0); OLD vs NEW@1 differs on ${knownDiff} (must be > 0)`);

// ── invalid env: GEMMA_MAX_TRIES='abc' → Number → NaN ──
const longT = [...Array(60).fill('T503'), 'CLEAN'];
const nan = await runOnce(NEW, longT, 'abc');
const oldNaN = await runOnce(OLD, longT, 'abc');
console.log(`\n=== GEMMA_MAX_TRIES='abc' (NaN): 60 x 503 then CLEAN -> NEW makes ${nan.calls} calls (stops only on success); OLD makes ${oldNaN.calls} ===`);
