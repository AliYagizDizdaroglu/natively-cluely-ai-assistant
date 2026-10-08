// The hold, measured (PREREGISTER-cuesmoke.md "Reported": two reads per answer; final review I2 and its condition 5;
// spec 2026-09-30 cue-early-close section 8.2). Reads a run folder's natively_debug.log and verbal-diag.log and prints
// times and counts only: never an answer, never a prompt. Five reads, each from lines that already exist:
//   R2  `[Answer] cues:` -> `[Answer] budget:`            (debug log)  the prose that streamed AFTER the cues were
//        reported; under 15 ms = the cues and the whole answer came together (the hold)
//   R1  `verbal hedge: won by ...` -> `[Answer] cues:`    (debug log)  from the winner's first raw chunk to the block
//        close: the block's own streaming time, plus (before the early close) the whole first prose line
//   T   `verbal hedge: won by ...` -> `[Answer] budget:`  (debug log)  how long the winner's stream lasted (R1 + R2)
//   C   `verbal hedge: won by ...` -> `first token`       (debug + diag, line timestamps of one process) how long the
//        winner's first text waited to reach the screen; measurable in hours with no cue block too (there: 2 ms)
//   B   `first token` -> `word budget`                    (diag log)   R2's twin on the screen side, and the one read
//        with no-cue baselines
// and one row per finished answer with all of them, which the expectation (holdVerdict) is read from.
//   node hold-read.mjs <run dir> [--list]
// It reads the WHOLE debug log of the folder, so the readiness probe's answers are in it and count.
// The diag log is cumulative across runs, so only its lines inside the debug log's first..last timestamp are read.
// Pairs are formed in log order; a second start before the first one's end leaves the first "unpaired" (a superseded
// stream, or one that failed after its block: neither logs a budget line). A run with many of those is read by hand.
// What it cannot see: which chunk carried the first prose character; the renderer; an answer with no won-by line
// (the hedge off, other providers); whether the prose had one paragraph. An answer whose offers block came before
// its prose has a small R1 and a late first token: read its B and its cues->first-token column, not its R2.
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
 * The pre-registered expectation for a build WITH the early close (spec 8.2 as revised after the Opus review's I2),
 * over the rows of `read`. COUNTED answers: a won-by line, a non-empty cue block reported after it (a cues line
 * before the last won-by is a redirect after a dead stream's report: its R1 is negative and it is left out), a
 * spoken answer (words above 0) and a stream of 50 ms or more (T >= 50). n = their number.
 *   h_R2 = counted answers with R2 under 15 ms (the engine's log: the cues line and the end of the stream together)
 *   h_B  = counted answers with B under 15 ms  (the screen side: the first token and the end of the stream together)
 *   NO VERDICT  n under 12, or a counted answer has no first-token line to read B from
 *   GONE        h_R2 <= n/4 AND h_B <= n/4
 *   NOT GONE    h_R2 >= n/2 OR  h_B >= n/2
 *   NO VERDICT  in between: the rows are read
 * Why a band and both reads: a correct early close still shows the cues and the end together when the first prose
 * character arrives in the stream's last chunk (rate unknown until a run), so "at most 3" failed a correct build in
 * 13-15% of runs at one answer in ten; and R2 alone passes a build that reports early and releases late.
 */
export function holdVerdict(rows) {
    const finished = rows.filter((x) => x.model != null);
    const blocks = finished.filter((x) => x.r2 != null && !x.emptyBlock && x.r1 >= 0);
    const spoken = blocks.filter((x) => x.words > 0);
    const counted = spoken.filter((x) => x.t >= 50);
    const n = counted.length;
    const noB = counted.filter((x) => x.b == null).length;
    const hR2 = counted.filter((x) => x.r2 < 15).length;
    const hB = counted.filter((x) => x.b != null && x.b < 15).length;
    const left = { noWonBy: rows.length - finished.length, emptyOrNoBlockOrRedirect: finished.length - blocks.length, noWords: blocks.length - spoken.length, shortStream: spoken.length - n };
    let verdict, why;
    if (n < 12) { verdict = 'NO VERDICT'; why = `${n} counted answer(s), under 12`; }
    else if (noB) { verdict = 'NO VERDICT'; why = `${noB} counted answer(s) have no first-token line to read B from`; }
    else if (hR2 * 4 <= n && hB * 4 <= n) { verdict = 'GONE'; why = 'R2 and B both at most a quarter'; }
    else if (hR2 * 2 >= n || hB * 2 >= n) { verdict = 'NOT GONE'; why = `${[hR2 * 2 >= n ? 'R2' : null, hB * 2 >= n ? 'B' : null].filter(Boolean).join(' and ')} at least half`; }
    else { verdict = 'NO VERDICT'; why = 'between a quarter and a half: read the rows'; }
    return { n, hR2, hB, noB, verdict, why, left };
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
    // The diag log's side of each finished answer: one record per `word budget` line, with the LAST `first token`
    // line since the previous one (a superseded stream's first token is overwritten by the next answer's own).
    const diagAnswers = [];
    let ft = null;
    for (const e of [...g].sort((x, y) => x.t - y.t)) {
        if (e.kind === 'firstToken') ft = e;
        else if (e.kind === 'wordBudget') { diagAnswers.push({ t: e.t, firstToken: ft }); ft = null; }
    }
    // The engine writes the budget line and the diag line in one callback, so they are a few ms apart; 100 ms is
    // far under the distance between two answers.
    const diagFor = (t) => diagAnswers.filter((a) => Math.abs(a.t - t) <= 100).sort((x, y) => Math.abs(x.t - t) - Math.abs(y.t - t))[0] ?? null;
    // one row per finished answer: the last won-by and the last cues line since the previous budget line. A cues
    // line BEFORE that won-by (a redirect after a dead stream's report) gives a negative R1; the row says so.
    const rows = [];
    let w = null, c = null;
    for (const e of [...of('wonBy', 'cues', 'budget')].sort((x, y) => x.t - y.t)) {
        if (e.kind === 'wonBy') w = e;
        else if (e.kind === 'cues') c = e;
        else {
            const da = diagFor(e.t), first = da?.firstToken ?? null;
            rows.push({
                at: e.t, model: w?.model ?? null, words: e.words, emptyBlock: c ? c.empty : null,
                r1: w && c ? c.t - w.t : null, r2: c ? e.t - c.t : null, t: w ? e.t - w.t : null,
                b: first ? da.t - first.t : null,                      // first token -> word budget (both diag lines)
                c: first && w ? first.t - w.t : null,                  // won-by -> first token
                ft: first && c ? first.t - c.t : null,                 // the cues line -> first token
            });
            w = null; c = null;
        }
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
        console.log('     per finished answer, in log order (ms): R1 / R2 / T | B / C / cues->first token   words   (the whole log: the readiness probe\'s answers are in it)');
        const cell = (v) => String(v ?? '-').padStart(5);
        for (const x of r.rows) console.log(`       ${new Date(x.at).toISOString().slice(11, 19)}Z  ${cell(x.r1)} / ${cell(x.r2)} / ${cell(x.t)} | ${cell(x.b)} / ${cell(x.c)} / ${cell(x.ft)}  ${String(x.words).padStart(3)}  ${x.model ?? ''}${x.emptyBlock ? '  (empty block)' : ''}${x.r1 != null && x.r1 < 0 ? '  (cues before the last won-by: a redirect)' : ''}`);
    }
    if (LIST && r.C.gaps.length)
        console.log(`     C by winner: ${Object.entries(r.C.gaps.reduce((o, p) => { (o[p.a.model] ??= []).push(p.ms); return o; }, {})).map(([m, v]) => `${m} n ${v.length} median ${stats(v).median} ms`).join('; ')}`);
    const v = holdVerdict(r.rows);
    console.log(`the hold, by the early-close expectation: counted answers (won-by, a non-empty block, words, stream >= 50 ms) n ${v.n}; R2 under 15 ms ${v.hR2}; B under 15 ms ${v.hB}`);
    console.log(`     left out: no won-by line ${v.left.noWonBy}; no block, an empty block or a redirect ${v.left.emptyOrNoBlockOrRedirect}; no words ${v.left.noWords}; a stream under 50 ms ${v.left.shortStream}`);
    console.log(`     rule: GONE = both at most a quarter of n; NOT GONE = either at least half; else, or n under 12, NO VERDICT`);
    console.log(`HOLD ${v.verdict} (${v.why})`);
}
