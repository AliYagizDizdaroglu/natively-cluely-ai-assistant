#!/usr/bin/env node
// h40d-thoughts-noise.mjs <run-dir> [--cue <tag>] [--control <tag>] [--exclude id,id] [--offset N] [--threshold N]
//
// Rule 2c of PREREGISTER-h40d.md (revision 2, review I2): the cue prompt's model-side cost, read from the
// model's own reported thinking tokens (`thoughts` = usageMetadata.thoughtsTokenCount, recorded by
// interview60.answers.mjs on every Gemini answer) instead of TTFT, which provider load moves and which the
// arms' run order confounds (the no-cue control always runs last). Reads interview60.answers.<tag>[-r2|-r3].json
// in one run folder and prints numbers and ids only: never an answer, never a prompt.
//
// Per arm family (the three reps '', -r2, -r3): ids answered (spoken non-empty, no transientError), true holes
// (transientError), empty prose (no transientError, empty spoken), answered ids with no finite `thoughts`;
// the median and p90 of thoughts and of ttft per rep (the registered percentile: index min(n-1, floor(n*p)));
// the pooled median over the three reps; the rep-to-rep spread of the per-rep medians (max - min); each rep's
// median against the pooled median of the other two (the "one rep against two" split); and the Theil-Sen slope
// of ttft on thoughts pooled over the reps, with and without stalls (ttft > 10000 ms), as ms per thought token.
//
// The 2c reading, when the control family exists: cue pooled median thoughts - control pooled median thoughts,
// against --threshold (default 150 tokens); coverage = answered ids with a finite `thoughts` on each side (2c
// needs at least 90% on both, otherwise the TTFT fallback decides: cue pooled TTFT median - control pooled TTFT
// median <= 1000 ms). --exclude drops ids from both sides (re-run twin ids, rule E). --offset N adds N tokens
// to every cue thoughts value and is for calibration only (printed loudly): with cue = control the difference
// must read 0 (PASS), with --offset 200 it must FAIL, with --offset 150 it must PASS at the boundary.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const dir = argv[0];
const opt = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
if (!dir) { console.log('usage: h40d-thoughts-noise.mjs <run-dir> [--cue <tag>] [--control <tag>] [--exclude id,id] [--offset N] [--threshold N]'); process.exit(2); }
const CUE = opt('--cue', 'gemini-3.5-flash-lite_captured-high');
const CONTROL = opt('--control', 'gemini-3.5-flash-lite_captured-no-cues-high');
// --control-dir: the folder holding the control family when it is not the run folder (Thursday's bench: the cue
// reps in the bench folder against s50m's captured-high in s50m's run folder; the tags must match the
// `interview60.answers.<tag>[-r2|-r3].json` naming on both sides, checked on the day).
const CONTROL_DIR = opt('--control-dir', dir);
const EXCLUDE = new Set((opt('--exclude', '') || '').split(',').map((x) => x.trim()).filter(Boolean));
const OFFSET = Number(opt('--offset', '0'));
const THRESHOLD = Number(opt('--threshold', '150'));
const TTFT_FALLBACK_MS = 1000;
const STALL_MS = 10000;

const pct = (a, p) => { const z = [...a].sort((x, y) => x - y); return z.length ? z[Math.min(z.length - 1, Math.floor(z.length * p))] : null; };
const med = pct;
const theilSen = (recs) => {
    const ps = [];
    for (let i = 0; i < recs.length; i++) for (let j = i + 1; j < recs.length; j++) if (recs[j].thoughts !== recs[i].thoughts) ps.push((recs[j].ttft - recs[i].ttft) / (recs[j].thoughts - recs[i].thoughts));
    if (!ps.length) return null;
    const z = ps.sort((a, b) => a - b);
    return z[Math.floor(z.length / 2)];
};

function readFamily(tag, base = dir) {
    const reps = [];
    for (const suffix of ['', '-r2', '-r3']) {
        const f = path.join(base, `interview60.answers.${tag}${suffix}.json`);
        if (!fs.existsSync(f)) continue;
        const store = JSON.parse(fs.readFileSync(f, 'utf8'));
        const vals = Object.values(store).filter((v) => v && typeof v === 'object' && v.id && !EXCLUDE.has(v.id));
        const answered = vals.filter((v) => !v.transientError && v.spoken);
        const holes = vals.filter((v) => v.transientError).map((v) => v.id);
        const emptySpoken = vals.filter((v) => !v.transientError && !v.spoken).map((v) => v.id);
        const withThoughts = answered.filter((v) => Number.isFinite(v.thoughts) && Number.isFinite(v.ttft));
        reps.push({ rep: suffix || '-r1', file: path.basename(f), n: answered.length, holes, emptySpoken, withThoughts, noThoughts: answered.length - withThoughts.length, ttfts: answered.map((v) => v.ttft).filter(Number.isFinite) });
    }
    return reps;
}

function report(name, tag, offset = 0, base = dir) {
    const reps = readFamily(tag, base);
    if (!reps.length) { console.log(`${name} (${tag}): no answers file${base !== dir ? ` in ${base}` : ''}`); return null; }
    console.log(`${name} (${tag})${base !== dir ? `  [from ${base}]` : ''}${offset ? `  [CALIBRATION: +${offset} tokens added to every thoughts value]` : ''}`);
    const th = (r) => r.withThoughts.map((v) => v.thoughts + offset);
    const medians = [];
    for (const r of reps) {
        const t = th(r);
        console.log(`  ${r.rep} ${r.file}: answered ${r.n}, holes ${r.holes.length}${r.holes.length ? ` [${r.holes.join(' ')}]` : ''}, empty prose ${r.emptySpoken.length}${r.emptySpoken.length ? ` [${r.emptySpoken.join(' ')}]` : ''}, no thoughts ${r.noThoughts}; thoughts p50 ${med(t, .5)} p90 ${pct(t, .9)}; ttft p50 ${med(r.ttfts, .5)} p90 ${pct(r.ttfts, .9)} ms`);
        medians.push(med(t, .5));
    }
    const pooled = reps.flatMap(th);
    const pooledTtft = reps.flatMap((r) => r.ttfts);
    const allRecs = reps.flatMap((r) => r.withThoughts.map((v) => ({ thoughts: v.thoughts + offset, ttft: v.ttft })));
    const noStall = allRecs.filter((v) => v.ttft <= STALL_MS);
    const spread = medians.length > 1 ? Math.max(...medians) - Math.min(...medians) : 0;
    const splits = reps.map((r, i) => { const others = reps.filter((_, j) => j !== i).flatMap(th); return others.length ? Math.abs(medians[i] - med(others, .5)) : null; });
    console.log(`  pooled: n ${pooled.length}, thoughts p50 ${med(pooled, .5)} p90 ${pct(pooled, .9)}; ttft p50 ${med(pooledTtft, .5)} p90 ${pct(pooledTtft, .9)} ms; rep medians [${medians.join(', ')}] spread ${spread}; one rep against the other two pooled: [${splits.map((x) => (x == null ? 'n/a' : x)).join(', ')}] max ${Math.max(...splits.filter((x) => x != null))}`);
    console.log(`  theil-sen ms per thought token, pooled reps: all ${theilSen(allRecs)?.toFixed(2) ?? 'n/a'} (n ${allRecs.length}), stalls over ${STALL_MS} ms excluded ${theilSen(noStall)?.toFixed(2) ?? 'n/a'} (n ${noStall.length})`);
    const answeredTotal = reps.reduce((a, r) => a + r.n, 0), covered = reps.reduce((a, r) => a + r.withThoughts.length, 0);
    return { reps, pooled, pooledTtft, coverage: answeredTotal ? covered / answeredTotal : 0, answeredTotal, covered, holes: reps.flatMap((r) => r.holes), emptySpoken: reps.flatMap((r) => r.emptySpoken) };
}

console.log(`run: ${path.basename(dir)}${EXCLUDE.size ? `  excluded ids: ${[...EXCLUDE].join(' ')}` : ''}`);
const cue = report('cue twins', CUE, OFFSET);
// Always read the control afresh and without the offset: a calibration run names the cue family as its own
// control (`--control <cue tag> --offset N`), and reusing the cue object there read every offset as 0.
const control = report(CONTROL === CUE && CONTROL_DIR === dir ? 'control = the same family, read without the offset' : 'no-cue twins (control)', CONTROL, 0, CONTROL_DIR);
if (cue && control) {
    const dTh = med(cue.pooled, .5) - med(control.pooled, .5);
    const dTh90 = pct(cue.pooled, .9) - pct(control.pooled, .9);
    const dTt = med(cue.pooledTtft, .5) - med(control.pooledTtft, .5);
    const dTt90 = pct(cue.pooledTtft, .9) - pct(control.pooledTtft, .9);
    const covOk = cue.coverage >= 0.9 && control.coverage >= 0.9;
    console.log(`rule 2c: thoughts coverage cue ${cue.covered}/${cue.answeredTotal} control ${control.covered}/${control.answeredTotal} -> ${covOk ? 'thinking tokens decide' : 'UNDER 90% on a side: the TTFT fallback decides'}`);
    console.log(`rule 2c: cue pooled median thoughts - control pooled median thoughts = ${dTh} tokens (threshold +${THRESHOLD}); p90 difference ${dTh90} (reported)`);
    console.log(`rule 2c: cue pooled median ttft - control pooled median ttft = ${dTt} ms (fallback threshold +${TTFT_FALLBACK_MS}; the 0.5 s line is reported: ${dTt <= 500 ? 'within' : 'beyond'}); p90 difference ${dTt90} ms (reported)`);
    // Rule 2c: a rep with more than 3 true holes on either side makes 2c INCOMPLETE, whatever the medians say.
    const holey = [...cue.reps.map((r) => ['cue', r]), ...control.reps.map((r) => ['control', r])].filter(([, r]) => r.holes.length > 3).map(([side, r]) => `${side} ${r.rep} (${r.holes.length})`);
    const verdict = holey.length ? `INCOMPLETE (more than 3 true holes: ${holey.join(', ')})` : covOk ? (dTh <= THRESHOLD ? 'PASS' : 'FAIL') : (dTt <= TTFT_FALLBACK_MS ? 'PASS (fallback)' : 'FAIL (fallback)');
    console.log(`rule 2c reading: ${verdict}${OFFSET ? '  [CALIBRATION RUN, not a reading]' : ''}`);
    const holes = { cue: cue.holes.length, control: control.holes.length };
    console.log(`rule 2c holes: cue ${holes.cue}, control ${holes.control} (a rep with more than 3 true holes makes 2c and 3c INCOMPLETE; otherwise 2c is read on the ids answered); empty prose: cue ${cue.emptySpoken.length}, control ${control.emptySpoken.length} (each counts wrong in 3c)`);
}
