// Read-only: `dispatch: answer` lines with no `turn: gate=` line just before them = main.ts's R21 route (a supersede
// whose head dispatch never reached the answer branch, re-sent as a fresh dispatch). For each, the most recent
// Live-only turn (`turn: gate=N finals=0`) before it, whether the deduper dropped that one, and the gap.
// usage: node r21.mjs <runDir>...
import fs from 'node:fs';
import path from 'node:path';
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 19);
let n = 0, afterDroppedLiveOnly = 0;
for (const dir of process.argv.slice(2)) {
  const run = path.basename(dir).replace(/^2026-09-/, '');
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  let lastLiveOnly = null;
  L.forEach((l, i) => {
    const g = l.match(/\[Main\] turn: gate=\d+ finals=0 live=\d+/);
    if (g) lastLiveOnly = { at: T(l), dropped: /dispatch: drop source=/.test(L[i + 1] ?? '') };
    if (!/\[Main\] dispatch: answer source=/.test(l)) return;
    let k = i - 1; while (k >= 0 && !/\[Main\] (turn: gate=|dispatch: )/.test(L[k])) k--;
    if (k >= 0 && /\[Main\] turn: gate=/.test(L[k]) && T(l) - T(L[k]) < 50) return; // normal dispatch
    n++;
    const gap = lastLiveOnly ? ((T(l) - lastLiveOnly.at) / 1000).toFixed(1) : '-';
    const after = lastLiveOnly && lastLiveOnly.dropped && T(l) - lastLiveOnly.at < 40000;
    if (after) afterDroppedLiveOnly++;
    const q = (l.match(/question="((?:[^"\\]|\\.)*)"/) ?? [])[1] ?? '';
    console.log(`${run.padEnd(22)} ${iso(T(l))} R21-route; last Live-only turn ${lastLiveOnly ? iso(lastLiveOnly.at) : '-'} (${lastLiveOnly?.dropped ? 'deduper DROPPED it' : 'answered'}) gap ${gap}s  q=${JSON.stringify(q.slice(0, 50))}`);
  });
}
console.log(`\nR21 re-routed answers: ${n}; within 40 s after a Live-only turn the deduper dropped: ${afterDroppedLiveOnly}`);
