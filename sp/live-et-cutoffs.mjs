// Throwaway: was each answer finished, or cut off? Per item: last output word vs the next clip's start,
// 'interrupted' / 'turnComplete' / 'generationComplete' events, goAway events, and speaking rate (words/s).
//   node live-et-cutoffs.mjs <run.json>
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const E = R.events;
const starts = E.filter((e) => e.kind === 'clipStart');
for (const [i, id] of R.items.entries()) {
    const ev = E.filter((e) => e.item === id);
    const out = ev.filter((e) => e.kind === 'outputTx' && e.sinceClipEnd != null);
    const nextStart = starts[i + 1]?.t;
    const lastOut = out.length ? out[out.length - 1] : null;
    // events for this item's answer arrive before the next clip starts; anything after is tagged with the next item
    const kinds = ev.filter((e) => e.sinceClipEnd != null && ['interrupted', 'turnComplete', 'generationComplete'].includes(e.kind)).map((e) => `${e.kind}@${(e.sinceClipEnd / 1000).toFixed(1)}`);
    const words = out.map((e) => e.text).join('').trim().split(/\s+/).filter(Boolean).length;
    const span = out.length > 1 ? (out[out.length - 1].t - out[0].t) / 1000 : 0;
    const gapToNext = lastOut && nextStart ? ((nextStart - lastOut.t) / 1000).toFixed(1) : '-';
    console.log(`${id.padEnd(7)} words ${String(words).padStart(3)}  ${span ? (words / span).toFixed(2) : '-'} w/s  last word -> next clip ${gapToNext} s  ${kinds.join(' ')}`);
}
console.log(`goAway events: ${E.filter((e) => e.kind === 'goAway').length}; interrupted total: ${E.filter((e) => e.kind === 'interrupted').length}`);
