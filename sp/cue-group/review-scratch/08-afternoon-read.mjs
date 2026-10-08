// Item 5: the hold read on the two cue runs that exist, by the controller's own parser (hold-read.mjs, imported,
// not modified). Prints timestamps' differences and counts only: no answer text, no prompt, no cue text.
// Per finished answer: R1 (won-by -> cues), R2 (cues -> budget), T (won-by -> budget), words, whether the block
// was empty, and B (first token -> word budget, from the diag log, joined to the answer by its budget time).
// Then the verdict each candidate rule would give on a build that is KNOWN to have the hold.
import fs from 'node:fs';
import path from 'node:path';
import { parseDebug, parseDiag, read, stats, holdGone } from '../hold-read.mjs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
for (const name of ['2026-09-30T02-38-22-cuesmoke', '2026-09-30T13-46-52-cuesmoke']) {
    const dir = path.join(RUNS, name);
    if (!fs.existsSync(path.join(dir, 'natively_debug.log'))) { console.log(`${name}: no natively_debug.log (not there yet)`); continue; }
    const debugText = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const diagText = fs.readFileSync(path.join(dir, 'verbal-diag.log'), 'utf8');
    const r = read(debugText, diagText);
    const d = parseDebug(debugText);
    const g = parseDiag(diagText, d.first, d.last);
    // rows of my own, carrying the block's emptiness (hold-read's rows do not) and B
    const rows = [];
    let w = null, c = null;
    const ev = d.ev.filter((e) => ['wonBy', 'cues', 'budget'].includes(e.kind)).sort((x, y) => x.t - y.t);
    for (const e of ev) {
        if (e.kind === 'wonBy') w = e;
        else if (e.kind === 'cues') c = e;
        else {
            const wb = g.filter((x) => x.kind === 'wordBudget' && Math.abs(x.t - e.t) <= 5)[0];
            const ft = wb ? g.filter((x) => x.kind === 'firstToken' && x.t <= wb.t).at(-1) : null;
            const prevWb = wb ? g.filter((x) => x.kind === 'wordBudget' && x.t < wb.t).at(-1) : null;
            const b = wb && ft && (!prevWb || ft.t > prevWb.t) ? wb.t - ft.t : null;
            rows.push({ r1: w && c ? c.t - w.t : null, r2: c ? e.t - c.t : null, t: w ? e.t - w.t : null, words: e.words, empty: c ? c.empty : null, b, d: c && ft && (!prevWb || ft.t > prevWb.t) ? ft.t - c.t : null });
            w = null; c = null;
        }
    }
    console.log(`\n=== ${name} ===`);
    console.log(`lines: cues ${r.counts.cues} (empty ${r.counts.emptyCues}), budget ${r.counts.budget}, won-by ${r.counts.wonBy}; diag first token ${r.counts.firstToken}, word budget ${r.counts.wordBudget}`);
    const s2 = stats(r.R2.gaps.map((p) => p.ms)), sb = stats(r.B.gaps.map((p) => p.ms)), s1 = stats(r.R1.gaps.map((p) => p.ms)), sc = stats(r.C.gaps.map((p) => p.ms));
    console.log(`R2 cues->budget: n ${s2.n}, under 15 ms ${s2.under}, median ${s2.median}, p90 ${s2.p90}, max ${s2.max}, unpaired ${r.R2.unpaired}`);
    console.log(`B  first token->word budget: n ${sb.n}, under 15 ms ${sb.under}, median ${sb.median}, p90 ${sb.p90}, unpaired ${r.B.unpaired}`);
    console.log(`R1 won-by->cues: n ${s1.n}, median ${s1.median}, min ${s1.min}, max ${s1.max};  C won-by->first token: n ${sc.n}, median ${sc.median}`);
    console.log('per finished answer (ms):   R1     R2      T      B   first token - cues   words  empty block');
    for (const x of rows) console.log(`                        ${[x.r1, x.r2, x.t, x.b].map((v) => String(v ?? '-').padStart(6)).join(' ')} ${String(x.d ?? '-').padStart(12)} ${String(x.words).padStart(12)}  ${x.empty ? 'EMPTY' : ''}`);
    const real = rows.filter((x) => x.r2 != null && x.words !== 0 && !x.empty);
    const withT = real.filter((x) => x.t != null);
    const burst = withT.filter((x) => x.t < 15), mid = withT.filter((x) => x.t >= 15 && x.t < 50), tell = withT.filter((x) => x.t >= 50);
    const u = (xs, k) => xs.filter((x) => x[k] != null && x[k] < 15).length;
    console.log(`answers with a non-empty block and prose: ${real.length}; with a won-by line: ${withT.length}`);
    console.log(`  stream T under 15 ms (one burst): ${burst.length};  T 15..49 ms: ${mid.length};  T of 50 ms or more: ${tell.length}`);
    console.log(`  of the ${tell.length} with T >= 50 ms: R2 under 15 ms ${u(tell, 'r2')}, B under 15 ms ${u(tell, 'b')} (B known for ${tell.filter((x) => x.b != null).length}); median R2 ${stats(tell.map((x) => x.r2)).median}, median R2/T ${stats(tell.map((x) => Math.round(1000 * x.r2 / x.t))).median / 1000}`);
    console.log(`  the spec's rule (at most 3 of all with R2 under 15 ms AND median R2 >= 50 ms): hold GONE = ${holdGone(r.R2)}   (this build HAS the hold, so the right answer is false)`);
    if (tell.length) {
        const share = u(tell, 'r2') / tell.length;
        console.log(`  a share rule over T >= 50 ms: ${u(tell, 'r2')} of ${tell.length} = ${(100 * share).toFixed(0)}% -> ${share <= 0.25 ? 'GONE' : share >= 0.5 ? 'NOT GONE' : 'NO VERDICT'}   (right answer: NOT GONE)`);
        console.log(`  "at most 3 of those under 15 ms": ${u(tell, 'r2') <= 3 ? 'GONE' : 'NOT GONE'}`);
    }
}
