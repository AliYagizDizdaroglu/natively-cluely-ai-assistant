// L20d mechanics (PREREGISTER-l20d.md, clauses 4 and 5 and the reported starter reads), over the reps that exist.
//   answered   = the item played, its extracted answer is non-empty, it is not a spoken system-error apology
//                (L20c's predicate, unchanged), and (QUOTA_CLOSE_IS_HOLE) its session did not close on a quota error;
//   a hole     = a registered item that is not answered. A rep is played at most once: a rep cut short counts as
//                played and its unplayed items are holes, never re-run (Opus review I2);
//   retries    = pairs that needed their second session; the registered limit is ONE transport retry per pair, so a pair
//                with more than two sessions makes clause 4 unreadable (INVALID), never a pass;
//   quota close= a close whose reason names quota or RESOURCE_EXHAUSTED: counted and listed here, distinctly. Pending
//                the registration's amendment it is a hole like any other (QUOTA_CLOSE_IS_HOLE, ONE constant);
//   slow feed  = the clip took more than 1.30 times its length to send (the slowest of the 113 items of the six
//                L20b/L20c runs was 1.254);
//   first word = the first word of the real answer (et-extract's ttftMs), after the question's last audio chunk.
// Clause 4: answered >= 110 of 114 slots after at most one retry per pair, over all three reps whatever window each ran
//           in. With fewer than three reps it reads FAIL once more than 4 holes exist (110 is out of reach), else NOT READABLE.
// Clause 5: n = the 114 slots minus the slow-feed items that were ANSWERED (their answers are graded, their latency is
//           left out); a hole is ALWAYS in, as +Infinity, slow feed or not; pooled over the three reps; first word
//           p50 <= 3.0 s and p90 <= 6.6 s; percentile = sorted[min(n-1, floor(n*p))] (l20c/score.mjs, as ET38).
// Prints counts and times only. The last line is machine-readable (go.mjs):
// `ARM l20d: reps <n>, answered <a>/<t>, holes <h>, last run answered <l> -> CONTINUE|DONE`.
//   node mechanics-l20d.mjs [--dir <folder with items.json and runs/>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feedRatios } from './feed-ratio.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
export const NEED = 110, SLOW_FEED = 1.30, P50_MS = 3000, P90_MS = 6600, PREFIX_MS = 6600, MAX_SESSIONS_PER_PAIR = 2;
export const QUOTA_CLOSE_IS_HOLE = true;   // pending the amendment on how a quota close counts; flip here only
export const isAnswered = (a) => !!(a?.played && a.answer?.trim() && !/system error/i.test(a.answer));
export const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const sec = (x) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)} s` : '-');
const wordsOf = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/** Words of the real answer that had arrived by `limitMs` after the question ended (events of the item, answer turns only). */
export function wordsBy(R, id, ttftMs, limitMs = PREFIX_MS) {
    let text = '', gap = false;
    for (const e of R.events) {
        if (e.item !== id) continue;
        if (e.kind === 'turnComplete' || e.kind === 'interrupted') { gap = true; continue; }
        if (e.kind !== 'outputTx' || e.sinceClipEnd == null || e.sinceClipEnd < ttftMs || e.sinceClipEnd > limitMs) continue;
        text += (gap && text ? ' ' : '') + e.text; gap = false;
    }
    return wordsOf(text);
}

/** Every close whose reason names quota / RESOURCE_EXHAUSTED: { item, final } (final = in the attempt whose answer stands; a failed attempt's events are relabelled `<id>~a1`). */
export function quotaCloses(R) {
    return R.events.filter((e) => e.kind === 'close' && /quota|RESOURCE_EXHAUSTED/i.test(String(e.reason ?? '')))
        .map((e) => ({ item: e.item == null ? null : String(e.item).replace(/~a\d+$/, ''), final: e.item != null && !String(e.item).includes('~') }));
}

/** One rep's numbers from its answers file `A` and run file `R`. */
export function repMechanics(ids, A, R, { quotaIsHole = QUOTA_CLOSE_IS_HOLE } = {}) {
    const ratios = feedRatios(R);
    const quota = quotaCloses(R);
    const quotaHoles = quotaIsHole ? [...new Set(quota.filter((q) => q.final && ids.includes(q.item)).map((q) => q.item))] : [];
    const answered = ids.filter((id) => isAnswered(A[id]) && !quotaHoles.includes(id));
    const slow = ids.filter((id) => (ratios[id] ?? 0) > SLOW_FEED);
    const slowAnswered = slow.filter((id) => answered.includes(id));
    const timed = ids.filter((id) => !slowAnswered.includes(id));
    const normal = answered.filter((id) => !slow.includes(id));
    const attempts = {};
    for (const x of R.sessions) attempts[x.pair[0]] = (attempts[x.pair[0]] ?? 0) + 1;
    return {
        answered, slow, slowAnswered,
        holes: ids.filter((id) => !answered.includes(id)),
        apologies: ids.filter((id) => A[id]?.played && /system error/i.test(A[id].answer ?? '')),
        notPlayed: ids.filter((id) => !A[id]?.played),
        quota, quotaHoles,
        // clause 5's population: every item except the slow-feed ones that were answered; a hole = no first word = Infinity
        latency: timed.map((id) => (answered.includes(id) && Number.isFinite(A[id].ttftMs) ? A[id].ttftMs : Infinity)),
        first: normal.map((id) => A[id].ttftMs).filter(Number.isFinite),
        last: normal.map((id) => A[id].lastWordMs).filter(Number.isFinite),
        holding: answered.filter((id) => A[id].holding?.length).length,
        premature: answered.filter((id) => A[id].premature?.length).length,
        words: answered.map((id) => A[id].words),
        thoughts: answered.map((id) => A[id].thoughts),
        wordsBy: answered.map((id) => wordsBy(R, id, A[id].ttftMs ?? 0)),
        retried: Object.entries(attempts).filter(([, n]) => n === 2).map(([m]) => m),
        overRetried: Object.entries(attempts).filter(([, n]) => n > MAX_SESSIONS_PER_PAIR).map(([m]) => m),
        abnormal: R.sessions.filter((x) => x.abnormal).length, sessions: R.sessions.length, t0: R.t0Iso,
    };
}

/** Clause 4 over the reps' mechanics (`perRep` = 38 slots each). */
export function clause4(reps, perRep) {
    const answered = reps.reduce((n, m) => n + m.answered.length, 0), of = perRep * reps.length;
    const over = reps.flatMap((m) => m.overRetried);
    if (reps.length !== 3) return { state: of - answered > 3 * perRep - NEED ? 'FAIL' : 'NOT READABLE', answered, of, over };
    if (over.length) return { state: 'INVALID', answered, of, over };
    return { state: answered >= NEED ? 'PASS' : 'FAIL', answered, of, over };
}

/** Clause 5 over the three reps' latency populations (arrays of ms, Infinity = no first word). */
export function clause5(reps) {
    const all = reps.flatMap((m) => m.latency).sort((a, b) => a - b);
    const p50 = all.length ? pct(all, 0.5) : Infinity, p90 = all.length ? pct(all, 0.9) : Infinity;
    return { state: reps.length !== 3 ? 'NOT READABLE' : all.length && p50 <= P50_MS && p90 <= P90_MS ? 'PASS' : 'FAIL', n: all.length, noFirstWord: all.filter((x) => !Number.isFinite(x)).length, p50, p90, slow: reps.reduce((n, m) => n + (m.slowAnswered?.length ?? 0), 0) };
}

export const armState = (reps) => (reps >= 3 ? 'DONE' : 'CONTINUE');

/** The reps' files in a folder: [{ n, A, R }] for the reps that exist, stopping at the first that does not. */
export function loadReps(dir) {
    const out = [];
    for (const r of [1, 2, 3]) {
        const af = `${dir}/runs/l20d-r${r}.answers.json`, rf = `${dir}/runs/l20d-r${r}.json`;
        if (!fs.existsSync(af) || !fs.existsSync(rf)) break;
        out.push({ n: r, A: JSON.parse(fs.readFileSync(af, 'utf8')), R: JSON.parse(fs.readFileSync(rf, 'utf8')) });
    }
    return out;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'mechanics-l20d.mjs') {
    const DIR = arg('--dir', HERE);
    const ids = JSON.parse(fs.readFileSync(`${DIR}/items.json`, 'utf8')).pairs.flat();
    const srt = (a) => [...a].sort((x, y) => x - y);
    const reps = [];
    for (const { n, A, R } of loadReps(DIR)) {
        const m = repMechanics(ids, A, R);
        reps.push(m);
        const f = srt(m.first), l = srt(m.last), lat = srt(m.latency);
        console.log(`l20d r${n}: answered ${m.answered.length}/${ids.length}; holes ${m.holes.join(' ') || 'none'}${m.apologies.length ? ` (system-error apologies: ${m.apologies.join(' ')})` : ''}${m.notPlayed.length ? ` (not played: ${m.notPlayed.join(' ')})` : ''}; abnormal sessions ${m.abnormal} of ${m.sessions}; retried pairs ${m.retried.join(' ') || 'none'}${m.overRetried.length ? ` ; MORE THAN ONE RETRY: ${m.overRetried.join(' ')}` : ''}; quota closes ${m.quota.length}${m.quota.length ? ` (items ${m.quota.map((q) => `${q.item ?? '-'}${q.final ? '' : ' [failed attempt]'}`).join(' ')}; ${QUOTA_CLOSE_IS_HOLE ? 'holes' : 'not holes'}: ${m.quotaHoles.join(' ') || 'none'})` : ''}; window ${m.t0}`);
        console.log(`        first word of the real answer (a hole = none; slow-feed answered items left out) p50 ${sec(pct(lat, 0.5))}, p90 ${sec(pct(lat, 0.9))}; answered only: p50 ${f.length ? sec(pct(f, 0.5)) : '-'}, max ${f.length ? sec(f.at(-1)) : '-'}; last word p50 ${l.length ? sec(pct(l, 0.5)) : '-'}, p90 ${l.length ? sec(pct(l, 0.9)) : '-'}; a holding line on ${m.holding}/${m.answered.length}; premature output on ${m.premature}; words p50 ${m.words.length ? pct(srt(m.words), 0.5) : '-'}; thought tokens p50 ${m.thoughts.length ? pct(srt(m.thoughts), 0.5) : '-'}; slow feed ${m.slow.join(' ') || 'none'}`);
    }
    const answered = reps.reduce((s, m) => s + m.answered.length, 0), holes = reps.reduce((s, m) => s + m.holes.length, 0);
    if (reps.length) {
        const c5 = clause5(reps), c4 = clause4(reps, ids.length);
        const ww = srt(reps.flatMap((m) => m.wordsBy)), lastAll = srt(reps.flatMap((m) => m.last));
        console.log(`l20d pooled over ${reps.length} rep(s): ${c5.n} slots in the latency numbers (${c5.slow} slow-feed answered items left out), ${c5.noFirstWord} without a first word: first word p50 ${sec(c5.p50)}, p90 ${sec(c5.p90)}; last word p50 ${sec(lastAll.length ? pct(lastAll, 0.5) : NaN)}, p90 ${sec(lastAll.length ? pct(lastAll, 0.9) : NaN)}; words of the answer arrived by ${sec(PREFIX_MS)}: p50 ${ww.length ? pct(ww, 0.5) : '-'} (n ${ww.length})`);
        console.log(`clause 4 (reliability): answered ${c4.answered}/${c4.of}${reps.length === 3 ? `, need >= ${NEED}` : ' so far'}${c4.over.length ? `, pairs retried more than once: ${c4.over.join(' ')}` : ''} -> ${c4.state}`);
        console.log(`clause 5 (speed): first word p50 ${sec(c5.p50)} <= ${sec(P50_MS)} and p90 ${sec(c5.p90)} <= ${sec(P90_MS)} over ${c5.n} slots -> ${c5.state}`);
    }
    console.log(`ARM l20d: reps ${reps.length}, answered ${answered}/${ids.length * reps.length}, holes ${holes}, last run answered ${reps.length ? reps.at(-1).answered.length : 0} -> ${armState(reps.length)}`);
}
