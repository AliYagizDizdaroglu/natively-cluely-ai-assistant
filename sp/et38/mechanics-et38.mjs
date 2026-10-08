// ET38 mechanics (PREREGISTER-et38.md, conditions 4 and 5 and the early stop): per level, over the reps that exist.
//   answered   = the item played, its extracted answer is non-empty, and it is not a spoken system-error apology
//                (L20c's test, unchanged);
//   a hole     = a registered item that is not answered;
//   slow feed  = the clip took more than 1.30 times its length to send (the slowest of the 113 items of the six
//                L20b/L20c runs was 1.254): that item's times are left out of the latency numbers, its answer stays;
//   first word = the first word of the real answer (et-extract's ttftMs), after the question's last audio chunk;
//   last word  = the last word of the answer.
// The early stop (MEDIUM only): once its holes exceed 4 it can no longer answer 110 of 114, so its remaining reps are
// not run. LOW always plays three reps. Prints counts and times only. The last line is machine-readable:
// `ARM <level>: reps <n>, answered <a>/<t>, holes <h>, last run answered <l> -> CONTINUE|STOP|DONE`.
//   node mechanics-et38.mjs --level low|medium [--dir <folder with items.json and runs/>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feedRatios } from './feed-ratio.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
export const MAX_HOLES = 4, NEED = 110, SLOW_FEED = 1.30;
export const isAnswered = (a) => !!(a?.played && a.answer?.trim() && !/system error/i.test(a.answer));
export const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const sec = (x) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)} s` : '-');

/** One rep's numbers from its answers file `A` and run file `R`. */
export function repMechanics(ids, A, R) {
    const ratios = feedRatios(R);
    const answered = ids.filter((id) => isAnswered(A[id]));
    const slow = ids.filter((id) => (ratios[id] ?? 0) > SLOW_FEED);
    const timed = answered.filter((id) => !slow.includes(id));
    return {
        answered, slow,
        holes: ids.filter((id) => !answered.includes(id)),
        apologies: ids.filter((id) => A[id]?.played && /system error/i.test(A[id].answer ?? '')),
        notPlayed: ids.filter((id) => !A[id]?.played),
        first: timed.map((id) => A[id].ttftMs).filter(Number.isFinite),
        last: timed.map((id) => A[id].lastWordMs).filter(Number.isFinite),
        holding: answered.filter((id) => A[id].holding?.length).length,
        words: answered.map((id) => A[id].words),
        thoughts: answered.map((id) => A[id].thoughts),
        abnormal: R.sessions.filter((x) => x.abnormal).length, sessions: R.sessions.length, t0: R.t0Iso,
    };
}

/** DONE after three reps. Before that: MEDIUM stops once it can no longer meet condition 4; LOW always continues. */
export function armState(level, holesSoFar, reps) {
    if (reps >= 3) return 'DONE';
    return level === 'medium' && holesSoFar > MAX_HOLES ? 'STOP' : 'CONTINUE';
}

if (process.argv[1] && path.basename(process.argv[1]) === 'mechanics-et38.mjs') {
    const LEVEL = arg('--level'), DIR = arg('--dir', HERE);
    if (!['low', 'medium'].includes(LEVEL)) { console.log('usage: --level low|medium [--dir <folder>]'); process.exit(2); }
    const ids = JSON.parse(fs.readFileSync(`${DIR}/items.json`, 'utf8')).pairs.flat();
    const srt = (a) => [...a].sort((x, y) => x - y);
    const reps = [];
    for (const r of [1, 2, 3]) {
        const af = `${DIR}/runs/et-${LEVEL}-r${r}.answers.json`, rf = `${DIR}/runs/et-${LEVEL}-r${r}.json`;
        if (!fs.existsSync(af) || !fs.existsSync(rf)) break;
        const m = repMechanics(ids, JSON.parse(fs.readFileSync(af, 'utf8')), JSON.parse(fs.readFileSync(rf, 'utf8')));
        reps.push(m);
        const f = srt(m.first), l = srt(m.last);
        console.log(`${LEVEL} r${r}: answered ${m.answered.length}/${ids.length}; holes ${m.holes.join(' ') || 'none'}${m.apologies.length ? ` (system-error apologies: ${m.apologies.join(' ')})` : ''}${m.notPlayed.length ? ` (not played: ${m.notPlayed.join(' ')})` : ''}; abnormal sessions ${m.abnormal} of ${m.sessions}; window ${m.t0}`);
        console.log(`        first word of the real answer p50 ${f.length ? sec(pct(f, 0.5)) : '-'}, p90 ${f.length ? sec(pct(f, 0.9)) : '-'}, max ${f.length ? sec(f.at(-1)) : '-'}; last word p50 ${l.length ? sec(pct(l, 0.5)) : '-'}, p90 ${l.length ? sec(pct(l, 0.9)) : '-'}; a holding line on ${m.holding}/${m.answered.length}; words p50 ${m.words.length ? pct(srt(m.words), 0.5) : '-'}; thought tokens p50 ${m.thoughts.length ? pct(srt(m.thoughts), 0.5) : '-'}; slow feed ${m.slow.join(' ') || 'none'}`);
    }
    const answered = reps.reduce((s, m) => s + m.answered.length, 0), holes = reps.reduce((s, m) => s + m.holes.length, 0);
    const first = srt(reps.flatMap((m) => m.first)), last = srt(reps.flatMap((m) => m.last));
    if (reps.length) {
        console.log(`${LEVEL} pooled over ${reps.length} rep(s), answered items with a normal feed (${first.length}): first word p50 ${sec(pct(first, 0.5))}, p90 ${sec(pct(first, 0.9))}; last word p50 ${sec(pct(last, 0.5))}, p90 ${sec(pct(last, 0.9))}`);
        if (reps.length === 3) console.log(`condition 4 (reliability): answered ${answered}/${ids.length * 3}, need >= ${NEED} -> ${answered >= NEED ? 'PASS' : 'FAIL'}`);
    }
    console.log(`ARM ${LEVEL}: reps ${reps.length}, answered ${answered}/${ids.length * reps.length}, holes ${holes}, last run answered ${reps.length ? reps.at(-1).answered.length : 0} -> ${reps.length ? armState(LEVEL, holes, reps.length) : 'CONTINUE'}`);
}
