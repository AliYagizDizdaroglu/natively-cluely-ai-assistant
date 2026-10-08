// Throwaway: a 90-minute interview where ONLY the answers are paid (gemini-3.8-flash), everything else free.
// Per answer (measured): input 4973 tokens (captured app prompts, countTokens); output 182 answer tokens (mean raw
// length 729 chars of 16 recorded 3.8 Flash answers, 4 chars/token) + 638 thinking tokens (same 16, model-default
// thinking; the app would run LOW, so this errs high). Prices per 1M: $0.75 in / $3.75 out through 2026-12-31,
// $1.50 / $7.50 from 2027-01-01. Also: what the Live ear would add if billing were enabled on the SAME project
// (every Gemini call on the key turns paid), under the per-turn re-billing rule, at 3.8 Live's audio rate.
const IN = 4973, OUT = 182 + 638;
const perAnswer = (pin, pout) => (IN * pin + OUT * pout) / 1e6;
const a26 = perAnswer(0.75, 3.75), a27 = perAnswer(1.5, 7.5);
console.log(`per answer: $${a26.toFixed(4)} (2026), $${a27.toFixed(4)} (2027)`);
const DENSE = Math.round(90 * 40 / 68.7); // our test hour's pace: 40 questions in 68.7 min
for (const [label, q] of [[`dense (our test pace, ${DENSE} questions)`, DENSE], ['calmer (30 questions)', 30], ['light (20 questions)', 20]]) {
    for (const rpq of [1.25, 2]) {
        const req = q * rpq;
        console.log(`${label}, ${rpq} requests/question = ${req.toFixed(0)} requests: $${(req * a26).toFixed(2)} (2026), $${(req * a27).toFixed(2)} (2027)`);
    }
}
// Live ear if the same project is billed: instructions ~350 tokens; ~480 audio tokens of interviewer speech per
// question (14.5 s at ~33 tokens/s); every turn re-bills the session so far; $3.00 per 1M audio in.
const ear = (q, turnsPerQ) => { const N = q * turnsPerQ, per = 480 / turnsPerQ; let t = 0; for (let k = 0; k < N; k++) t += 350 + per * (k + 1); return t * 3.0 / 1e6; };
for (const q of [DENSE, 30]) console.log(`Live ear if billed, ${q} questions: $${ear(q, 1).toFixed(2)} (1 turn/question) to $${ear(q, 2).toFixed(2)} (2 turns/question)`);
