// Rule-8 calibration of score.mjs (PREREGISTER-l20c.md) on SYNTHETIC verdicts over the REAL key (built by
// blind.mjs): each case writes eight verdict files into its own temp dir, runs score.mjs with L20C_VERDICTS_DIR,
// and checks the verdict and condition lines it prints. Run after blind.mjs and BEFORE any grader's verdict exists.
//   node cal-score.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const { key, packets } = JSON.parse(fs.readFileSync(path.join(SP, 'l20c-key', 'key.json'), 'utf8'));
const LIVE = (arm) => arm.startsWith('live38-');
const ACC = { correctness: 2, on_topic: 2, delivery: 2, reason: 'synthetic' };
const WEAK = { correctness: 1, on_topic: 2, delivery: 2, reason: 'synthetic' };
const WRONG = { correctness: 0, on_topic: 2, delivery: 2, reason: 'synthetic' };
const liveKeys = Object.keys(key).filter((k) => LIVE(key[k])).sort();

/** grade(k, slot) -> verdict for answer key k from grader slot 0/1. */
function runCase(name, grade, expect) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l20c-cal-'));
    for (const p of Object.keys(packets)) for (const [slot, g] of ['g1', 'g2'].entries()) {
        const want = Object.keys(key).filter((k) => packets[p].includes(k.split('#')[0]));
        fs.writeFileSync(path.join(dir, `verdicts-${p}-${g}.json`), JSON.stringify(Object.fromEntries(want.map((k) => [k, grade(k, slot)]))));
    }
    const r = spawnSync(process.execPath, [path.join(HERE, 'score.mjs')], { encoding: 'utf8', env: { ...process.env, L20C_VERDICTS_DIR: dir } });
    const out = r.stdout ?? '';
    const fails = expect.filter((re) => !re.test(out));
    fs.rmSync(dir, { recursive: true, force: true });
    const ok = r.status === 0 && fails.length === 0;
    console.log(`${ok ? 'OK ' : 'BAD'} ${name}${ok ? '' : `  exit ${r.status}; unmatched: ${fails.map(String).join(' ')}; stderr ${String(r.stderr).slice(0, 300)}`}`);
    // on a mismatch, show what the scorer decided (condition and verdict lines only; no answer text is in them)
    if (!ok) for (const l of out.split('\n').filter((x) => /^\s*\d\. |Verdict/.test(x))) console.log(`      ${l.slice(0, 200)}`);
    return ok;
}

// 2026-09-30 15:38, on the first run against the real key (no grader verdict existed): two cases expected
// PROVISIONAL while the app's samples were ALL acceptable. By condition 2 (Live's worst rep >= the app's worst
// sample) one Live answer that is not acceptable then fails the band, so the rule's own answer is STOP, which is what
// score.mjs printed. The expectation was mine and wrong; score.mjs is unchanged. The edge cases now make the app's
// samples realistically imperfect (two questions weak in every app sample), and the band interplay is its own case.
// The cases also no longer short-circuit: `ok &&= runCase(...)` skipped every case after the first failure.
const APP35 = (arm) => arm.startsWith('app35-');
const WEAK_IDS = ['S2Q10', 'S2Q03'];   // answered by every app sample (the one app hole is twin2's S2Q06)
const appWeak = (k) => APP35(key[k]) && WEAK_IDS.includes(k.split('#')[0]);
const results = [
    runCase('everyone acceptable -> 1-3 pass, gate pending -> PROVISIONAL', () => ACC,
        [/1\. quality: .*→ PASS/, /2\. band: .*→ PASS/, /3\. safety: Live consensus-wrong 0 ≤ 1 \+ ⌊0 × 0\.75⌋ = 1 → PASS/, /\*\*Verdict: PROVISIONAL/]),
    runCase('Live weak everywhere -> quality FAIL -> STOP', (k) => (LIVE(key[k]) ? WEAK : ACC),
        [/1\. quality: Live mean rate 0\.000 .*→ FAIL/, /\*\*Verdict: STOP/]),
    runCase('two Live answers wrong by both graders, app none -> safety 2 > 1 -> STOP', (k) => (liveKeys.slice(0, 2).includes(k) ? WRONG : ACC),
        [/3\. safety: Live consensus-wrong 2 ≤ 1 \+ ⌊0 × 0\.75⌋ = 1 → FAIL/, /\*\*Verdict: STOP/]),
    runCase('one Live answer wrong by both graders, app perfect -> safety passes at its edge but the band fails -> STOP', (k) => (k === liveKeys[0] ? WRONG : ACC),
        [/2\. band: .*→ FAIL/, /3\. safety: Live consensus-wrong 1 ≤ 1 \+ ⌊0 × 0\.75⌋ = 1 → PASS/, /\*\*Verdict: STOP/]),
    runCase('one Live answer wrong by both graders, app weak on two questions -> safety 1 ≤ 1 (edge), band passes -> PROVISIONAL', (k) => (k === liveKeys[0] ? WRONG : appWeak(k) ? WEAK : ACC),
        [/1\. quality: .*→ PASS/, /2\. band: .*→ PASS/, /3\. safety: Live consensus-wrong 1 ≤ 1 \+ ⌊0 × 0\.75⌋ = 1 → PASS/, /\*\*Verdict: PROVISIONAL/]),
    runCase('two Live answers wrong by ONE grader only, app weak on two questions -> not consensus -> safety PASS -> PROVISIONAL', (k, slot) => (liveKeys.slice(0, 2).includes(k) && slot === 0 ? WRONG : appWeak(k) ? WEAK : ACC),
        [/2\. band: .*→ PASS/, /3\. safety: Live consensus-wrong 0 /, /\*\*Verdict: PROVISIONAL/]),
    runCase('app wrong by both graders on 4 answers -> the bar rises to 1 + ⌊4 × 0.75⌋ = 4', (k) => (APP35(key[k]) && Object.keys(key).filter((x) => APP35(key[x])).sort().slice(0, 4).includes(k) ? WRONG : ACC),
        [/3\. safety: Live consensus-wrong 0 ≤ 1 \+ ⌊4 × 0\.75⌋ = 4 → PASS/]),
    // br1 is a reported-only arm: even if every br1 answer is wrong, no condition moves
    runCase('br1 wrong everywhere, the rest acceptable -> br1 is reported only -> PROVISIONAL', (k) => (key[k] === 'br1-inapp' ? WRONG : ACC),
        [/1\. quality: .*→ PASS/, /2\. band: .*→ PASS/, /3\. safety: Live consensus-wrong 0 ≤ 1 \+ ⌊0 × 0\.75⌋ = 1 → PASS/, /\*\*Verdict: PROVISIONAL/]),
];
const ok = results.every(Boolean);
console.log(ok ? `L20C SCORE CALIBRATION OK (${results.length} cases)` : 'L20C SCORE CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
