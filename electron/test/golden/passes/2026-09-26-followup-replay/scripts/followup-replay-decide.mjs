// Throwaway (h40c Task 6): merges the blind verdict files for the follow-up parent restore
// replay and applies the pre-registered four-step decision rule (PREREGISTER-followup-replay.md).
//
//   node followup-replay-decide.mjs [blind-dir]     (default SP\followup-replay\blind)
//
// Reads key.blind-N.json (id/arm/rep per blinded key, written by followup-replay-blind.mjs) and
// verdicts.blind-N.json (correctness/on_topic/delivery per key, written by the grading agents)
// for every N found, applies J.verdictOf to get wrong/acceptable/weak per (id,rep,arm), and
// prints the pre-registered rule's outcome over the resulting (item, rep) pairs.
//
// `decide(pairs)` is exported pure so it can be calibrated on synthetic verdict sets without
// touching the filesystem (rule 8): a check that decides something must be run on a known case.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const SP = 'C:\\Users\\sotka\\AppData\\Local\\Temp\\claude\\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\\9c5886c7-cdbd-48af-b8bc-e9275012ec64\\scratchpad';
const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);

/**
 * pairs: array of { id, rep, arm, verdict } — one per (item, rep) pair actually graded
 * (both A and B present for that id+rep). Applies the pre-registered rule, in order:
 *   1. wrong(B) > wrong(A)                       -> FAIL
 *   2. acceptable(B) - acceptable(A) >= +5        -> PASS
 *   3. delta <= +1                                -> FAIL
 *   4. otherwise                                  -> INCONCLUSIVE
 */
export function decide(pairs) {
    const count = (arm, verdict) => pairs.filter((p) => p.arm === arm && p.verdict === verdict).length;
    const wrongA = count('A', 'wrong'), wrongB = count('B', 'wrong');
    const accA = count('A', 'acceptable'), accB = count('B', 'acceptable');
    const weakA = count('A', 'weak'), weakB = count('B', 'weak');
    const delta = accB - accA;
    let outcome, reason;
    if (wrongB > wrongA) { outcome = 'FAIL'; reason = `wrong(B)=${wrongB} > wrong(A)=${wrongA}`; }
    else if (delta >= 5) { outcome = 'PASS'; reason = `acceptable(B)-acceptable(A) = ${accB}-${accA} = ${delta} >= +5`; }
    else if (delta <= 1) { outcome = 'FAIL'; reason = `acceptable(B)-acceptable(A) = ${delta} <= +1`; }
    else { outcome = 'INCONCLUSIVE'; reason = `acceptable(B)-acceptable(A) = ${delta} (between +2 and +4)`; }
    return { outcome, reason, n: pairs.length, wrongA, wrongB, accA, accB, weakA, weakB };
}

function printResult(r) {
    console.log(`n = ${r.n} (item, rep) pairs graded`);
    console.log(`  A: wrong=${r.wrongA} acceptable=${r.accA} weak=${r.weakA}`);
    console.log(`  B: wrong=${r.wrongB} acceptable=${r.accB} weak=${r.weakB}`);
    console.log(`DECISION: ${r.outcome}  (${r.reason})`);
    return r.outcome;
}

// ── CLI: merge real blind files and decide ─────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]).endsWith('followup-replay-decide.mjs')) {
    const dir = process.argv[2] ?? path.join(SP, 'followup-replay', 'blind');
    const keyFiles = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^key\.blind-\d+\.json$/.test(f)) : [];
    if (!keyFiles.length) { console.error(`no key.blind-N.json files under ${dir}`); process.exit(2); }
    const merged = []; // { key, id, arm, rep, verdict }
    const missingVerdicts = [];
    for (const kf of keyFiles) {
        const n = kf.match(/^key\.blind-(\d+)\.json$/)[1];
        const vf = path.join(dir, `verdicts.blind-${n}.json`);
        const keys = JSON.parse(fs.readFileSync(path.join(dir, kf), 'utf8'));
        if (!fs.existsSync(vf)) { missingVerdicts.push(vf); continue; }
        const verdicts = JSON.parse(fs.readFileSync(vf, 'utf8'));
        for (const [k, meta] of Object.entries(keys)) {
            const v = verdicts[k];
            if (!v) { console.log(`  ${k}: no verdict`); continue; }
            const bad = ['correctness', 'on_topic', 'delivery'].find((f) => ![0, 1, 2].includes(v[f]));
            if (bad) { console.log(`  ${k}: bad verdict field ${bad}=${v[bad]}`); continue; }
            merged.push({ key: k, id: meta.id, arm: meta.arm, rep: meta.rep, verdict: J.verdictOf(v) });
        }
    }
    if (missingVerdicts.length) { console.error(`missing verdict files: ${missingVerdicts.join(', ')}`); process.exit(2); }

    // Pair by (id, rep): both A and B graded for that pair, or it does not enter the decision.
    const byIdRep = {};
    for (const m of merged) { const k = `${m.id}#${m.rep}`; (byIdRep[k] ??= {})[m.arm] = m; }
    const pairs = [];
    for (const [k, both] of Object.entries(byIdRep)) {
        if (!both.A || !both.B) { console.log(`  ${k}: incomplete pair (${Object.keys(both).join(',')}) — excluded from the decision`); continue; }
        pairs.push(both.A); pairs.push(both.B);
    }

    const r = decide(pairs);
    printResult(r);
}
