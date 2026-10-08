// The hold, measured (PREREGISTER-cuesmoke.md "Reported": two reads per answer; final review I2 and its condition 5;
// spec 2026-09-30 cue-early-close section 8.2). Reads a run folder's natively_debug.log and verbal-diag.log and prints
// times and counts only: never an answer, never a prompt. Four reads, each from lines that already exist:
//   R2  `[Answer] cues:` -> `[Answer] budget:`            (debug log)  the prose that streamed AFTER the cues were
//        reported; under 15 ms = the cues and the whole answer came together (the hold)
//   R1  `verbal hedge: won by ...` -> `[Answer] cues:`    (debug log)  from the winner's first raw chunk to the block
//        close: the block's own streaming time, plus (before the early close) the whole first prose line
//   C   `verbal hedge: won by ...` -> `first token`       (debug + diag, line timestamps of one process) how long the
//        winner's first text waited to reach the screen; measurable in hours with no cue block too (there: 2 ms)
//   B   `first token` -> `word budget`                    (diag log)   R2's twin in a build with no cue block
//   node hold-read.mjs <run dir> [--list]
// The diag log is cumulative across runs, so only its lines inside the debug log's first..last timestamp are read.
// Pairs are formed in log order; a second start before the first one's end leaves the first "unpaired" (a superseded
// stream, or one that failed after its block: neither logs a budget line). A run with many of those is read by hand.
// Pure parts (parse, pairs, stats) are calibrated by cal-hold-read.mjs on fixtures with known answers, and the real
// reads on three hours whose numbers the final reviewer counted independently.
import fs from 'node:fs';
import path from 'node:path';

const DEBUG_TS = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z) /;
const DIAG_TS = /^\[(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z)\] /;

/** Debug-log events: cues, budget (with its word count), wonBy (with the hedge's own N ms), front (a hedge started). */
export function parseDebug(text) {
    const ev = [];
    let first = null, last = null;
    for (const line of text.split('\n')) {
        const m = line.match(DEBUG_TS);
        if (!m) continue;
        const t = Date.parse(m[1]);
        if (first == null) first = t;
        last = t;
        // `[Answer] cues trimmed:` does not contain `[Answer] cues:`
        if (line.includes('[Answer] cues:')) ev.push({ t, kind: 'cues', empty: /\[Answer\] cues: \[\]\s*$/.test(line) });
        else if (line.includes('[Answer] budget:')) ev.push({ t, kind: 'budget', words: Number(line.match(/words=(\d+)/)?.[1] ?? NaN) });
        else if (line.includes('verbal hedge: won by')) ev.push({ t, kind: 'wonBy', model: line.match(/won by (\S+) at/)?.[1] ?? '?', at: Number(line.match(/ at (\d+)ms/)?.[1] ?? NaN) });
        else if (line.includes('verbal hedge: front=')) ev.push({ t, kind: 'front' });
    }
    return { ev, first, last };
}

/** Diag-log events inside [from, to]: invoked, firstToken, wordBudget. */
export function parseDiag(text, from, to) {
    const ev = [];
    for (const line of text.split('\n')) {
        const m = line.match(DIAG_TS);
        if (!m) continue;
        const t = Date.parse(m[1]);
        if (t < from || t > to) continue;
        if (line.includes('=== generateStream invoked ===')) ev.push({ t, kind: 'invoked' });
        else if (/\] first token \d+ms/.test(line)) ev.push({ t, kind: 'firstToken', ttft: Number(line.match(/first token (\d+)ms/)[1]) });
        else if (line.includes('] word budget:')) ev.push({ t, kind: 'wordBudget' });
    }
    return ev;
}

/**
 * Pairs each `a` event with the first `b` event after it, but only when no other `a` comes in between (a second `a`
 * first means the earlier one never reached its `b`: a superseded or failed stream). Returns { gaps, unpaired }, the
 * gaps in log order.
 */
export function pairs(events, a, b) {
    const gaps = [];
    let open = null, unpaired = 0;
    for (const e of [...events].sort((x, y) => x.t - y.t)) {
        if (e.kind === a) { if (open) unpaired++; open = e; }
        else if (e.kind === b && open) { gaps.push({ from: open.t, ms: e.t - open.t, a: open, b: e }); open = null; }
    }
    if (open) unpaired++;
    return { gaps, unpaired };
}

/** n, the count under `limit` ms (strict), the median (the mean of the two middle values when n is even), p90 (nearest rank), min, max. */
export function stats(ms, limit = 15) {
    const s = [...ms].sort((x, y) => x - y);
    const n = s.length;
    const median = n === 0 ? null : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    return { n, under: s.filter((v) => v < limit).length, median, p90: n ? s[Math.max(0, Math.ceil(0.9 * n) - 1)] : null, min: s[0] ?? null, max: s[n - 1] ?? null };
}

/** The R2 pairs that carry prose: a pair whose budget line counts no words (a block-only or empty answer) has nothing to time. */
export const realPairs = (R2) => R2.gaps.filter((p) => p.b.words !== 0);

/**
 * The pre-registered expectation for a build WITH the early close (spec 8.2), over the pairs that carry prose:
 * at most 3 R2 under 15 ms AND a median R2 of at least 50 ms. null when there is no such pair to read.
 */
export function holdGone(R2) {
    const s = stats(realPairs(R2).map((p) => p.ms));
    return s.n === 0 ? null : s.under <= 3 && s.median >= 50;
}

export function read(debugText, diagText) {
    const d = parseDebug(debugText);
    if (d.first == null) throw new Error('the debug log has no timestamped line');
    const g = parseDiag(diagText, d.first, d.last);
    const of = (...kinds) => d.ev.filter((e) => kinds.includes(e.kind));
    const R2 = pairs(of('cues', 'budget'), 'cues', 'budget');
    const R1 = pairs(of('wonBy', 'cues'), 'wonBy', 'cues');
    // T: how long the winner's stream lasted, first raw chunk to stream end. An answer whose T is under 15 ms came
    // in one burst: it has nothing to stream, so its R2 is under 15 ms with or without the hold.
    const T = pairs(of('wonBy', 'budget'), 'wonBy', 'budget');
    // one row per finished answer: the last won-by and the last cues line since the previous budget line
    const rows = [];
    let w = null, c = null;
    for (const e of [...of('wonBy', 'cues', 'budget')].sort((x, y) => x.t - y.t)) {
        if (e.kind === 'wonBy') w = e;
        else if (e.kind === 'cues') c = e;
        else { rows.push({ at: e.t, model: w?.model ?? null, r1: w && c ? c.t - w.t : null, r2: c ? e.t - c.t : null, t: w ? e.t - w.t : null, words: e.words }); w = null; c = null; }
    }
    const C = pairs([...of('wonBy'), ...g.filter((e) => e.kind === 'firstToken')], 'wonBy', 'firstToken');
    const B = pairs(g.filter((e) => e.kind === 'firstToken' || e.kind === 'wordBudget'), 'firstToken', 'wordBudget');
    return {
        window: [new Date(d.first).toISOString(), new Date(d.last).toISOString()],
        counts: { cues: of('cues').length, emptyCues: of('cues').filter((e) => e.empty).length, budget: of('budget').length, wonBy: of('wonBy').length, invoked: g.filter((e) => e.kind === 'invoked').length, firstToken: g.filter((e) => e.kind === 'firstToken').length, wordBudget: g.filter((e) => e.kind === 'wordBudget').length },
        R2, R1, C, B, T, rows,
        noProse: R2.gaps.length - realPairs(R2).length,
    };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'hold-read.mjs') {
    const RUN = process.argv[2];
    if (!RUN) { console.log('usage: node hold-read.mjs <run dir> [--list]'); process.exit(2); }
    const r = read(fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8'), fs.readFileSync(path.join(RUN, 'verbal-diag.log'), 'utf8'));
    const LIST = process.argv.includes('--list');
    console.log(`run ${path.basename(RUN)}  window ${r.window[0]} .. ${r.window[1]}`);
    console.log(`lines: cues ${r.counts.cues} (empty ${r.counts.emptyCues}), budget ${r.counts.budget}, won-by ${r.counts.wonBy}; diag: invoked ${r.counts.invoked}, first token ${r.counts.firstToken}, word budget ${r.counts.wordBudget}`);
    const show = (name, x) => {
        const s = stats(x.gaps.map((p) => p.ms));
        console.log(`${name}: n ${s.n}, under 15 ms ${s.under}, median ${s.median} ms, p90 ${s.p90} ms, min ${s.min} ms, max ${s.max} ms, unpaired ${x.unpaired}`);
        if (LIST) console.log(`     in log order: ${x.gaps.map((p) => p.ms).join(', ') || '-'}`);
    };
    show('R2  cues -> budget            ', r.R2);
    if (r.noProse) {
        const s = stats(realPairs(r.R2).map((p) => p.ms));
        console.log(`     ${r.noProse} pair(s) with words=0 (a block-only or empty answer: no prose to time). Without them: n ${s.n}, under 15 ms ${s.under}, median ${s.median} ms`);
    }
    show('R1  won by -> cues            ', r.R1);
    show('T   won by -> budget          ', r.T);
    show('C   won by -> first token     ', r.C);
    show('B   first token -> word budget', r.B);
    if (LIST && r.rows.length) {
        console.log('     per finished answer, in log order (ms): R1 / R2 / T  words');
        for (const x of r.rows) console.log(`       ${new Date(x.at).toISOString().slice(11, 19)}Z  ${String(x.r1 ?? '-').padStart(5)} / ${String(x.r2 ?? '-').padStart(5)} / ${String(x.t ?? '-').padStart(5)}  ${String(x.words).padStart(3)}  ${x.model ?? ''}`);
        const held = r.rows.filter((x) => x.r2 != null && x.t != null && x.words !== 0);
        console.log(`     of ${held.length} answers with a won-by line, a block and prose: stream under 15 ms (one burst) ${held.filter((x) => x.t < 15).length}; stream of 50 ms or more ${held.filter((x) => x.t >= 50).length}, of which R2 under 15 ms ${held.filter((x) => x.t >= 50 && x.r2 < 15).length}`);
    }
    if (LIST && r.C.gaps.length)
        console.log(`     C by winner: ${Object.entries(r.C.gaps.reduce((o, p) => { (o[p.a.model] ??= []).push(p.ms); return o; }, {})).map(([m, v]) => `${m} n ${v.length} median ${stats(v).median} ms`).join('; ')}`);
    const gone = holdGone(r.R2);
    console.log(`hold GONE by the early-close expectation (over the pairs with prose: at most 3 R2 under 15 ms AND median R2 >= 50 ms): ${gone == null ? 'no pair to read' : gone ? 'yes' : 'no'}`);
}
