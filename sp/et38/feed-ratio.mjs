// How evenly a Live run fed its audio: per item, the time the clip took to send divided by the clip's length. The
// runner sends 60 ms of audio and then sleeps 60 ms, so the ratio is a little over 1 on an idle machine; a machine
// busy with other work stretches it. Used to mark items whose feed was slow, so that their latency is not read as
// the model's. Prints numbers only.
//   node feed-ratio.mjs <run.json> [<run.json> ...]
import fs from 'node:fs';
import path from 'node:path';

/** { id: ratio } for every played item of a run file (the last attempt of each item). */
export function feedRatios(R) {
    const out = {};
    const start = {};
    for (const e of R.events) {
        if (!e.item || String(e.item).includes('~')) continue;            // a failed attempt, relabelled by the runner
        if (e.kind === 'clipStart') start[e.item] = { t: e.t, seconds: e.seconds };
        else if (e.kind === 'clipEnd' && start[e.item]) out[e.item] = +(((e.t - start[e.item].t) / 1000) / start[e.item].seconds).toFixed(3);
    }
    return out;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'feed-ratio.mjs') {
    const all = [];
    for (const f of process.argv.slice(2)) {
        const r = Object.values(feedRatios(JSON.parse(fs.readFileSync(f, 'utf8')))).sort((a, b) => a - b);
        all.push(...r);
        console.log(`${path.basename(f)}: items ${r.length}, ratio min ${r[0]}, median ${r[Math.floor(r.length / 2)]}, max ${r.at(-1)}`);
    }
    all.sort((a, b) => a - b);
    if (all.length) console.log(`all: items ${all.length}, min ${all[0]}, median ${all[Math.floor(all.length / 2)]}, p90 ${all[Math.floor(all.length * 0.9)]}, max ${all.at(-1)}`);
}
