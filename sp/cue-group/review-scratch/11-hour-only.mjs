// The afternoon run (v2 build, WITH the hold), read over the hour's own answers only (budget line after
// "playback started 13:12:18.467Z"), and over the whole log as hold-read.mjs reads it. Times and counts only.
import fs from 'node:fs';
import path from 'node:path';
import { parseDebug, parseDiag, stats } from '../hold-read.mjs';

const dir = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-30T13-46-52-cuesmoke';
const START = Date.parse('2026-09-30T13:12:18.467Z');
const d = parseDebug(fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8'));
const g = parseDiag(fs.readFileSync(path.join(dir, 'verbal-diag.log'), 'utf8'), d.first, d.last);
const rows = [];
let w = null, c = null;
for (const e of d.ev.filter((x) => ['wonBy', 'cues', 'budget'].includes(x.kind)).sort((x, y) => x.t - y.t)) {
    if (e.kind === 'wonBy') w = e;
    else if (e.kind === 'cues') c = e;
    else {
        const wb = g.filter((x) => x.kind === 'wordBudget' && Math.abs(x.t - e.t) <= 5)[0];
        const prevWb = wb ? g.filter((x) => x.kind === 'wordBudget' && x.t < wb.t).at(-1) : null;
        const ft = wb ? g.filter((x) => x.kind === 'firstToken' && x.t <= wb.t && (!prevWb || x.t > prevWb.t)).at(-1) : null;
        rows.push({ at: e.t, r1: w && c ? c.t - w.t : null, r2: c ? e.t - c.t : null, t: w ? e.t - w.t : null, words: e.words, empty: c?.empty ?? null, b: wb && ft ? wb.t - ft.t : null, cc: w && ft ? ft.t - w.t : null });
        w = null; c = null;
    }
}
const u = (xs, k, lim = 15) => xs.filter((x) => x[k] != null && x[k] < lim).length;
for (const [label, set] of [['whole log (as hold-read reads it)', rows], ['the hour only', rows.filter((x) => x.at >= START)]]) {
    const real = set.filter((x) => x.r2 != null && x.words !== 0 && !x.empty && x.t != null);
    const tell = real.filter((x) => x.t >= 50);
    const med = (k, xs = tell) => stats(xs.map((x) => x[k]).filter((v) => v != null)).median;
    console.log(`\n${label}: finished answers ${set.length}; with a non-empty block, prose and a won-by line ${real.length}; of those T >= 50 ms: ${tell.length} (T < 15 ms: ${real.filter((x) => x.t < 15).length}, T 15..49: ${real.filter((x) => x.t >= 15 && x.t < 50).length})`);
    console.log(`  all ${real.length}:   R2 under 15 ms ${u(real, 'r2')}, B under 15 ms ${u(real, 'b')}, median R2 ${med('r2', real)}, median T ${med('t', real)}, median C (won-by -> first token) ${med('cc', real)}, C under 50 ms ${u(real, 'cc', 50)}`);
    console.log(`  T >= 50 ms (${tell.length}): R2 under 15 ms ${u(tell, 'r2')} (${Math.round(100 * u(tell, 'r2') / tell.length)}%), B under 15 ms ${u(tell, 'b')} (${Math.round(100 * u(tell, 'b') / tell.length)}%), R2 under 50 ms ${u(tell, 'r2', 50)}, median R2 ${med('r2')}, median T ${med('t')}, median R1 ${med('r1')}, median C ${med('cc')}, C under 50 ms ${u(tell, 'cc', 50)}`);
    console.log(`  T values sorted: ${real.map((x) => x.t).sort((a, b) => a - b).join(' ')}`);
}
