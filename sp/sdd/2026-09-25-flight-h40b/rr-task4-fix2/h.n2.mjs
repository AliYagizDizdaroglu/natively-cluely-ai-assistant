// Throwaway: exercises the EXACT retry-loop + record-construction shape now in gemma-answers.mjs
// (copied verbatim below, same variable names, fix round 2's M1 + N2 changes included) against a
// scripted mock pacedAnswer, to PROVE the loop's call counts, final state AND STORED RECORD rather
// than assert them from a static read. sleep() resolves immediately (no real waiting). Not one of
// task 4's deliverables — verification-only.
//   node i1-retry-trace.mjs
const sleep = () => Promise.resolve();

// ── The CURRENT loop (gemma-answers.mjs, fix round 2: M1's guarded cut-break, N2's cutRetried on the
// transient record too) ─────────────────────────────────────────────────────────────────────────────
async function runNew(script, MAX_TRIES) {
    let call = 0;
    const pacedAnswer = async () => {
        const s = script[call]; call++;
        if (s.throw) { const e = new Error(s.message); e.name = s.errName ?? 'Error'; throw e; }
        return s;
    };
    let r, lastErr, dropRetried = false, attempts = 0;
    while (true) {
        try {
            r = await pacedAnswer();
            attempts++;
            if (!r.transient && r.finish === null && !dropRetried) {
                dropRetried = true; lastErr = 'stream cut (no finishReason)'; await sleep();
                if (MAX_TRIES > 1 && attempts >= MAX_TRIES) break;
                continue;
            }
            if (!r.transient) break;
            lastErr = r.transient;
            if (attempts >= MAX_TRIES) break;
            await sleep();
        } catch (e) {
            attempts++;
            lastErr = e.message;
            if (e.name === 'TimeoutError') { lastErr = `no answer within X s: ${e.message}`; break; }
            if (attempts >= MAX_TRIES) break;
            await sleep();
        }
    }
    // The STORED record — what flash-h40b-sidecar.mjs actually reads (s[id]?.cutRetried, s[id]?.spoken)
    // — not the loop-local dropRetried variable. N2's fix is verified against THIS, per the ruling.
    const record = (!r || r.transient)
        ? { transientError: lastErr }
        : { spoken: r.spoken, finish: r.finish, cutRetried: dropRetried };
    return { calls: call, r, lastErr, dropRetried, attempts, record };
}

// ── The LITERAL pre-Task-4 loop (hardcoded MAX_TRIES=4, no `attempts`, `a` both indexes the for-loop
// and drives backoff, and the transient record NEVER carries cutRetried — this is the historical
// baseline the M1/N2 fixes are checked against, not a hypothetical) ────────────────────────────────
async function runOld(script) {
    let call = 0;
    const pacedAnswer = async () => {
        const s = script[call]; call++;
        if (s.throw) { const e = new Error(s.message); e.name = s.errName ?? 'Error'; throw e; }
        return s;
    };
    let r, lastErr, dropRetried = false;
    for (let a = 0; a < 4; a++) {
        try {
            r = await pacedAnswer();
            if (!r.transient && r.finish === null && !dropRetried) {
                dropRetried = true; lastErr = 'stream cut (no finishReason)'; await sleep(); continue;
            }
            if (!r.transient) break;
            lastErr = r.transient; await sleep();
        } catch (e) {
            lastErr = e.message;
            if (e.name === 'TimeoutError') { lastErr = `no answer within X s: ${e.message}`; break; }
            await sleep();
        }
    }
    const record = (!r || r.transient) ? { transientError: lastErr } : { spoken: r.spoken, finish: r.finish, cutRetried: dropRetried };
    return { calls: call, r, lastErr, dropRetried, record };
}

// ── Symbol catalog (matches the reviewer's 6-symbol enumeration) ──────────────────────────────────
const CLEAN = { transient: null, finish: 'STOP', spoken: 'full answer' };
const CUT = { transient: null, finish: null, spoken: 'partial' };
const T429 = { transient: 'HTTP 429', finish: null };
const T503 = { transient: 'HTTP 503', finish: null };
const ERR = { throw: true, message: 'ERR structural failure', errName: 'Error' };
const TIMEOUT = { throw: true, message: 'aborted', errName: 'TimeoutError' };
const SYMBOLS = { CLEAN, CUT, T429, T503, ERR, TIMEOUT };
const KEYS = Object.keys(SYMBOLS);

// ── Named scenarios: readable spot-checks, including the two N2-fixed cases (proof item 1) ────────
const cases = [
    // [name, MAX_TRIES, script, expected calls, expected record]
    ['429, MAX_TRIES=1: recorded, never retried', 1, [T429, T429, T429], 1, { transientError: 'HTTP 429', cutRetried: false }],
    ['cut, MAX_TRIES=1: one re-ask (clean), cutRetried true', 1, [CUT, CLEAN], 2, { spoken: 'full answer', finish: 'STOP', cutRetried: true }],
    ['cut, MAX_TRIES=1: one re-ask (cut again), cutRetried true, kept as truncated', 1, [CUT, CUT], 2, { spoken: 'partial', finish: null, cutRetried: true }],
    ['N2 (fix round 2): cut, MAX_TRIES=1, re-ask comes back 429 -> STORED RECORD now has cutRetried:true (was missing before this fix)', 1, [CUT, T429], 2, { transientError: 'HTTP 429', cutRetried: true }],
    ['N2: cut, MAX_TRIES=1, re-ask comes back 503 -> same fix', 1, [CUT, T503], 2, { transientError: 'HTTP 503', cutRetried: true }],
    ['429, MAX_TRIES=4 (default): retries up to 4 times, all fail', 4, [T429, T429, T429, T429], 4, { transientError: 'HTTP 429', cutRetried: false }],
    ['429, MAX_TRIES=4: succeeds on 3rd try', 4, [T429, T429, CLEAN], 3, { spoken: 'full answer', finish: 'STOP', cutRetried: false }],
    ['cut, MAX_TRIES=4: one re-ask (clean) -- matches pre-Task-4 (2 calls, not 4)', 4, [CUT, CLEAN], 2, { spoken: 'full answer', finish: 'STOP', cutRetried: true }],
    ['M1 (fix round 2): three failures then a cut, MAX_TRIES=4 -- ends at 4 calls (cut kept), NOT a 5th request. The cut IS the last allowed attempt, so it gets no re-ask at all (correctly) -- see the exhaustive check below for the general claim.', 4, [T429, T429, T429, CUT], 4, { spoken: 'partial', finish: null, cutRetried: true }],
    ['N2 at MAX_TRIES=4: a cut FIRST (room left for its re-ask), then 3 transient failures use up the remaining budget -- 4 calls, and the transient record now carries cutRetried:true (was missing before N2)', 4, [CUT, T429, T429, T429], 4, { transientError: 'HTTP 429', cutRetried: true }],
    ['clean on first try, MAX_TRIES=1: 1 call', 1, [CLEAN], 1, { spoken: 'full answer', finish: 'STOP', cutRetried: false }],
];

let failed = 0;
for (const [name, maxTries, script, expCalls, expRecord] of cases) {
    const out = await runNew(script, maxTries);
    const ok = out.calls === expCalls && JSON.stringify(out.record) === JSON.stringify(expRecord);
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
    console.log(`     calls=${out.calls} (expected ${expCalls})  record=${JSON.stringify(out.record)} (expected ${JSON.stringify(expRecord)})`);
    if (!ok) failed++;
}
console.log(failed ? `\n${failed} named case(s) FAILED` : '\nALL NAMED CASES OK');

// ── Exhaustive cross-check at MAX_TRIES=4: every sequence of length 6 over the 6 symbols (6^6 =
// 46,656, matching the reviewer's enumeration). Compares {calls, transientError, spoken, finish} —
// deliberately EXCLUDING cutRetried from the equality, since N2 intentionally changes that field on
// the transient branch (present now, absent in the literal old loop) — that is proof item (1), not a
// regression to flag here. This is proof item (2): 0 differences in calls/outcome at 4 tries.
// Separately, for every NEW-loop sequence that ends transient, asserts the STORED record's cutRetried
// exactly matches whether a cut occurred (the N2 exhaustive check, proof item (1) at full scale). ──
console.log('\n=== exhaustive cross-check, 6^6 = 46656 sequences of length 6, MAX_TRIES=4 ===');
let m1Mismatches = 0;
let n2Checked = 0, n2Ok = 0;
const firstMismatches = [];
for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) for (let c = 0; c < 6; c++) for (let d = 0; d < 6; d++) for (let e = 0; e < 6; e++) for (let f = 0; f < 6; f++) {
    const keys = [KEYS[a], KEYS[b], KEYS[c], KEYS[d], KEYS[e], KEYS[f]];
    const script = keys.map((k) => SYMBOLS[k]);
    const oldR = await runOld(script);
    const newR = await runNew(script, 4);
    const oldSig = JSON.stringify({ calls: oldR.calls, transientError: oldR.record.transientError, spoken: oldR.record.spoken, finish: oldR.record.finish });
    const newSig = JSON.stringify({ calls: newR.calls, transientError: newR.record.transientError, spoken: newR.record.spoken, finish: newR.record.finish });
    if (oldSig !== newSig) { m1Mismatches++; if (firstMismatches.length < 5) firstMismatches.push({ keys, oldSig, newSig }); }
    if (newR.record.transientError !== undefined) {
        n2Checked++;
        const expectedCutRetried = newR.dropRetried;
        if (newR.record.cutRetried === expectedCutRetried) n2Ok++;
    }
}
console.log(`M1 (calls/outcome match, cutRetried excluded): ${m1Mismatches} mismatches of 46656`);
if (firstMismatches.length) console.log('first mismatches:', JSON.stringify(firstMismatches, null, 1));
console.log(`N2 (stored record's cutRetried correct on every transient-ending sequence): ${n2Ok}/${n2Checked} correct`);

// ── One-try sanity at scale: confirm MAX_TRIES=1 never exceeds 2 calls, and every transient-ending
// record's cutRetried matches whether a cut preceded it, across the same 46656 sequences. ─────────
console.log('\n=== exhaustive check at MAX_TRIES=1 ===');
let maxCalls1 = 0, n2Checked1 = 0, n2Ok1 = 0;
for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) for (let c = 0; c < 6; c++) {
    const keys = [KEYS[a], KEYS[b], KEYS[c]];
    const script = keys.map((k) => SYMBOLS[k]);
    const newR = await runNew(script, 1);
    if (newR.calls > maxCalls1) maxCalls1 = newR.calls;
    if (newR.record.transientError !== undefined) {
        n2Checked1++;
        if (newR.record.cutRetried === newR.dropRetried) n2Ok1++;
    }
}
console.log(`max calls at MAX_TRIES=1 over 6^3=216 length-3 sequences: ${maxCalls1} (expected 2)`);
console.log(`N2 at MAX_TRIES=1: ${n2Ok1}/${n2Checked1} correct`);

const totalFailed = failed + (m1Mismatches > 0 ? 1 : 0) + (n2Ok !== n2Checked ? 1 : 0) + (maxCalls1 > 2 ? 1 : 0) + (n2Ok1 !== n2Checked1 ? 1 : 0);
console.log(totalFailed ? `\nOVERALL: ${totalFailed} check group(s) FAILED` : '\nOVERALL: ALL CHECKS OK');
process.exit(totalFailed ? 1 : 0);
