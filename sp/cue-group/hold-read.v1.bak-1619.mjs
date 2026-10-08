// The hold, measured (PREREGISTER-cuesmoke.md "Reported": two reads per answer; final review I2 and its condition 5).
// Reads a run folder's natively_debug.log and verbal-diag.log. Prints times and counts only: never an answer, never a
// prompt. Three reads, each from lines that already exist:
//   A  `[Answer] cues:` -> `[Answer] budget:`   (debug log)  under 15 ms = the cues and the whole answer came together
//   B  `first token`    -> `word budget`        (diag log)   the same gap in a build with no cue block
//   C  `verbal hedge: won by ... at N ms` -> `first token`   how long the winner's first text waited to reach the screen
//   node hold-read.mjs <run dir> [--list]
// The diag log is cumulative across runs, so only its lines inside the debug log's first..last timestamp are read.
// Pure parts (parse, pairs, stats) are calibrated by cal-hold-read.mjs on fixtures with known answers, and the real
// reads on three hours whose numbers the final reviewer counted independently.
import fs from 'node:fs';
import path from 'node:path';

const DEBUG_TS = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z) /;
const DIAG_TS = /^\[(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z)\] /;

/** Debug-log events: cues, budget, wonBy (with the hedge's own N ms), front (a hedge started). */
export function parseDebug(text) {
    const ev = [];
    let first = null, last = null;
    for (const line of text.split('\n')) {
        const m = line.match(DEBUG_TS);
        if (!m) continue;
        const t = Date.parse(m[1]);
        if (first == null) first = t;
        last = t;
        if (line.includes('[Answer] cues:')) ev.push({ t, kind: 'cues', empty: /\[Answer\] cues: \[\]\s*$/.test(line) });
        else if (line.includes('[Answer] budget:')) ev.push({ t, kind: 'budget' });
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
 * first means the earlier one never reached its `b`: a superseded or failed stream). Returns { gaps, unpaired }.
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

/** n, the count under `limit` ms, median, p90 (nearest rank), min, max. */
export function stats(ms, limit = 15) {
    const s = [...ms].sort((x, y) => x - y);
    const rank = (p) => (s.length ? s[Math.max(0, Math.ceil(p * s.length) - 1)] : null);
    return { n: s.length, under: s.filter((v) => v < limit).length, median: rank(0.5), p90: rank(0.9), min: s[0] ?? null, max: s[s.length - 1] ?? null };
}

export function read(debugText, diagText) {
    const d = parseDebug(debugText);
    if (d.first == null) throw new Error('the debug log has no timestamped line');
    const g = parseDiag(diagText, d.first, d.last);
    const A = pairs(d.ev.filter((e) => e.kind === 'cues' || e.kind === 'budget'), 'cues', 'budget');
    const B = pairs(g.filter((e) => e.kind === 'firstToken' || e.kind === 'wordBudget'), 'firstToken', 'wordBudget');
    const C = pairs([...d.ev.filter((e) => e.kind === 'wonBy'), ...g.filter((e) => e.kind === 'firstToken')], 'wonBy', 'firstToken');
    return {
        window: [new Date(d.first).toISOString(), new Date(d.last).toISOString()],
        counts: { cues: d.ev.filter((e) => e.kind === 'cues').length, emptyCues: d.ev.filter((e) => e.kind === 'cues' && e.empty).length, budget: d.ev.filter((e) => e.kind === 'budget').length, wonBy: d.ev.filter((e) => e.kind === 'wonBy').length, invoked: g.filter((e) => e.kind === 'invoked').length, firstToken: g.filter((e) => e.kind === 'firstToken').length, wordBudget: g.filter((e) => e.kind === 'wordBudget').length },
        A, B, C,
    };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'hold-read.mjs') {
    const RUN = process.argv[2];
    if (!RUN) { console.log('usage: node hold-read.mjs <run dir> [--list]'); process.exit(2); }
    const r = read(fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8'), fs.readFileSync(path.join(RUN, 'verbal-diag.log'), 'utf8'));
    console.log(`run ${path.basename(RUN)}  window ${r.window[0]} .. ${r.window[1]}`);
    console.log(`lines: cues ${r.counts.cues} (empty ${r.counts.emptyCues}), budget ${r.counts.budget}, won-by ${r.counts.wonBy}; diag: invoked ${r.counts.invoked}, first token ${r.counts.firstToken}, word budget ${r.counts.wordBudget}`);
    const show = (name, x) => {
        const s = stats(x.gaps.map((p) => p.ms));
        console.log(`${name}: n ${s.n}, under 15 ms ${s.under}, median ${s.median} ms, p90 ${s.p90} ms, min ${s.min} ms, max ${s.max} ms${x.unpaired ? `, unpaired ${x.unpaired}` : ''}`);
        if (process.argv.includes('--list')) console.log(`   ${x.gaps.map((p) => p.ms).join(' ')}`);
    };
    show('A  cues -> budget            ', r.A);
    show('B  first token -> word budget', r.B);
    show('C  won by -> first token     ', r.C);
    if (process.argv.includes('--list') && r.C.gaps.length)
        console.log(`   C by winner: ${Object.entries(r.C.gaps.reduce((o, p) => { (o[p.a.model] ??= []).push(p.ms); return o; }, {})).map(([m, v]) => `${m} n ${v.length} median ${stats(v).median} ms`).join('; ')}`);
}
