// Re-review probe (throwaway): do the two suggested fixes do what the re-review claims? Patches the
// sliced loop TEXT in memory only (no file is written), then compares against the literal old loop.
//   M1: cut branch gets `if (MAX_TRIES > 1 && attempts >= MAX_TRIES) break;` before its continue
//   N2: the transient record also carries cutRetried: dropRetried
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix1`;
const slice = (t) => t.slice(t.indexOf('for (const item of todo) {'), t.indexOf('\n}\n\n// ── summary') + 2);
const rep1 = (t, from, to) => { const n = t.split(from).length - 1; if (n !== 1) throw new Error(`expected 1 match, found ${n}`); return t.replace(from, () => to); };
let fixed = slice(fs.readFileSync(`${SP}/gemma-answers.mjs`, 'utf8'));
fixed = rep1(fixed, "dropRetried = true; lastErr = 'stream cut (no finishReason)'; await sleep(5000); continue;", "dropRetried = true; lastErr = 'stream cut (no finishReason)'; await sleep(5000); if (MAX_TRIES > 1 && attempts >= MAX_TRIES) break; continue;");
fixed = rep1(fixed, 'store[item.id] = { ...item, model: ARM, transientError: lastErr };', 'store[item.id] = { ...item, model: ARM, transientError: lastErr, cutRetried: dropRetried };');
const OLD_TXT = slice(fs.readFileSync(`${HERE}/pre-task4-runner.mjs`, 'utf8'));
const NEW_TXT = slice(fs.readFileSync(`${SP}/gemma-answers.mjs`, 'utf8'));
const AF = Object.getPrototypeOf(async function () {}).constructor;
const PARAMS = ['todo', 'store', 'pacedAnswer', 'sleep', 'CAPTURED', 'CALL_TIMEOUT_MS', 'ARM', 'P', 'VERBAL_CHECKS', 'fs', 'OUT', 'IS_GROQ', 'groqLimits', 'console', 'process'];
const [FIXED, OLD, NEW] = [fixed, OLD_TXT, NEW_TXT].map((t) => new AF(...PARAMS, t));
const make = (o) => {
    if (o === 'CLEAN') return { spoken: 'full', finish: 'STOP' };
    if (o === 'CUT') return { spoken: 'partial', finish: null };
    if (o === 'T429' || o === 'T503') return { transient: `HTTP ${o.slice(1)}` };
    if (o === 'ERR') throw new Error('fetch failed');
    const e = new Error('cap'); e.name = 'TimeoutError'; throw e;
};
async function run(fn, seq, env) {
    let calls = 0; const store = {};
    await fn([{ id: 'R01', q: 'q' }], store, async () => make(seq[calls++]), async () => {}, null, 180000, 'arm', {}, {}, { writeFileSync() {} }, 'o', false, null, { log() {} }, { env: env === undefined ? {} : { GEMMA_MAX_TRIES: env } });
    const { id, q, model, checks, ...rec } = store.R01;
    return { calls, rec };
}
const O = ['CLEAN', 'CUT', 'T429', 'T503', 'ERR', 'TIMEOUT'];
const seqs = []; (function g(p) { if (p.length === 6) { seqs.push(p); return; } for (const o of O) g([...p, o]); })([]);
let diff4 = 0, diff4NoFlag = 0, diff1calls = 0, under1 = 0;
for (const s of seqs) {
    const f4 = await run(FIXED, s, undefined), o4 = await run(OLD, s, undefined);
    if (f4.calls !== o4.calls) diff4++;
    const strip = ({ cutRetried, ...r }) => (r.transientError !== undefined ? r : { ...r, cutRetried });   // the N2 field is new on transient records only
    if (JSON.stringify(strip(f4.rec)) !== JSON.stringify(strip(o4.rec))) diff4NoFlag++;
    const f1 = await run(FIXED, s, '1'), n1 = await run(NEW, s, '1');
    if (f1.calls !== n1.calls) diff1calls++;
    if (1 + (f1.rec.cutRetried ? 1 : 0) < f1.calls) under1++;
}
console.log(`M1 fix at the default 4: calls differ from the literal old loop in ${diff4} of ${seqs.length} sequences; records differ (ignoring the N2 field on transient records) in ${diff4NoFlag}`);
console.log(`M1 fix at one try: calls differ from the fix round's loop in ${diff1calls} sequences (must be 0: the ruling's one-try behaviour is kept)`);
console.log(`N2 fix at one try: behaviours the sidecar under-counts: ${under1} (fix round: 2)`);
