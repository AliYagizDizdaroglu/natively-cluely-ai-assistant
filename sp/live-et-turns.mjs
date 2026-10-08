// Throwaway: split the model's output into turns (closed by turnComplete or interrupted) in global time order,
// and time each turn against the question it answers (the last clip that ENDED before the turn's first word).
// Separates the quick holding line ("Let me explain...") from the substantive answer.
//   node live-et-turns.mjs <run.json>
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const clipEnd = {};
const turns = [];
let cur = null;
for (const e of R.events) {
    if (e.kind === 'clipEnd') clipEnd[e.item] = e.t;
    if (e.kind === 'outputTx') {
        if (!cur) {
            const owners = Object.entries(clipEnd).filter(([, t]) => t <= e.t).sort((a, b) => b[1] - a[1]);
            cur = { owner: owners[0]?.[0] ?? '-', playing: e.item, start: e.t, end: e.t, text: '' };
        }
        cur.end = e.t; cur.text += e.text;
    }
    if ((e.kind === 'turnComplete' || e.kind === 'interrupted') && cur) {
        cur.how = e.kind; turns.push(cur); cur = null;
    }
}
if (cur) { cur.how = 'open at end'; turns.push(cur); }
const rel = (t, owner) => ((t - clipEnd[owner]) / 1000).toFixed(1).padStart(5);
for (const t of turns) {
    const words = t.text.trim().split(/\s+/).filter(Boolean).length;
    const during = t.playing !== t.owner ? ` (while ${t.playing} was playing)` : '';
    console.log(`${t.owner.padEnd(7)} ${rel(t.start, t.owner)}s -> ${rel(t.end, t.owner)}s  ${String(words).padStart(3)} words  ${t.how.padEnd(13)}${during}  "${t.text.trim().slice(0, 70)}"`);
}
