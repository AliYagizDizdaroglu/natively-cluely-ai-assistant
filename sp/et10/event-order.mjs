// Throwaway: raw event order for one item after its question ended (audio chunks omitted, transcript chunks
// merged into runs), to see whether a usage report precedes or follows the transcript of the turn it counts.
//   node event-order.mjs <run.json> <id>
import fs from 'node:fs';
const [, , file, id] = process.argv;
const R = JSON.parse(fs.readFileSync(file, 'utf8'));
let buf = null;
const flush = () => { if (buf) { console.log(`  +${(buf.at / 1000).toFixed(1)}s outputTx x${buf.n} "${buf.text.trim().slice(0, 50)}"`); buf = null; } };
for (const e of R.events.filter((x) => x.item === id && x.sinceClipEnd != null && x.kind !== 'audio' && x.kind !== 'inputTx')) {
    if (e.kind === 'outputTx') { if (!buf) buf = { at: e.sinceClipEnd, n: 0, text: '' }; buf.n++; buf.text += e.text; continue; }
    flush();
    console.log(`  +${(e.sinceClipEnd / 1000).toFixed(1)}s ${e.kind}${e.kind === 'usage' ? ` thoughts=${e.thoughts ?? 0} response=${e.response ?? '-'}` : ''}`);
}
flush();
