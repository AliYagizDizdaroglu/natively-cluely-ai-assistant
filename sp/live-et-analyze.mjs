// Throwaway: summarise a live-et-spike run: per item, first answer word after the clip ended (or BEFORE it
// ended = premature), time to the last word, answer text, usage per turn; tokens per rolling minute.
//   node live-et-analyze.mjs <run.json> [--text]
import fs from 'node:fs';
const [, , file] = process.argv;
const showText = process.argv.includes('--text');
const R = JSON.parse(fs.readFileSync(file, 'utf8'));
const E = R.events;
console.log(`${R.model} level=${R.level} modality=${R.modality} gap=${R.gapS}s items=${R.items.length} closed=${JSON.stringify(R.closed)}`);
const rows = [];
for (const id of R.items) {
    const ev = E.filter((e) => e.item === id);
    if (!ev.length) { rows.push({ id, note: 'never played' }); continue; }
    const out = ev.filter((e) => e.kind === 'outputTx' || e.kind === 'text');
    const clipEnd = ev.find((e) => e.kind === 'clipEnd');
    const before = out.filter((e) => e.sinceClipEnd == null);
    const after = out.filter((e) => e.sinceClipEnd != null);
    const usage = ev.filter((e) => e.kind === 'usage');
    const heard = ev.filter((e) => e.kind === 'inputTx').map((e) => e.text).join('');
    const text = out.map((e) => e.text).join('');
    rows.push({
        id, clipS: ev.find((e) => e.kind === 'clipStart')?.seconds,
        premature: before.length ? `${before.length} chunk(s) before the question ended: "${before.map((e) => e.text).join('').slice(0, 60)}"` : '',
        firstWordS: after[0] ? +(after[0].sinceClipEnd / 1000).toFixed(2) : null,
        lastWordS: after.length ? +(after[after.length - 1].sinceClipEnd / 1000).toFixed(2) : null,
        words: text.trim() ? text.trim().split(/\s+/).length : 0,
        turns: ev.filter((e) => e.kind === 'turnComplete').length,
        usage: usage.map((u) => `${u.prompt}+${u.response}(${u.thoughts ?? 0}th)`).join(' '),
        heard: heard.slice(0, 80), text, clipEnd: !!clipEnd,
    });
}
for (const r of rows) {
    console.log(`${r.id.padEnd(7)} clip ${String(r.clipS).padStart(5)}s  first ${String(r.firstWordS ?? '-').padStart(6)}s  last ${String(r.lastWordS ?? '-').padStart(6)}s  words ${String(r.words).padStart(3)}  turns ${r.turns}  usage ${r.usage}${r.premature ? `  PREMATURE ${r.premature}` : ''}`);
    if (showText) console.log(`        heard: ${r.heard}\n        said:  ${r.text.trim()}\n`);
}
const firsts = rows.map((r) => r.firstWordS).filter((x) => x != null).sort((a, b) => a - b);
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
console.log(`answered ${firsts.length}/${rows.length}; first word after question end p50 ${pct(firsts, 0.5)} s p90 ${pct(firsts, 0.9)} s; premature ${rows.filter((r) => r.premature).length}`);
// tokens per rolling 60 s window, from per-turn usage totals
const U = E.filter((e) => e.kind === 'usage').map((e) => ({ t: e.t, total: e.total ?? 0, prompt: e.prompt ?? 0 }));
let peak = 0, at = 0;
for (const u of U) { const w = U.filter((x) => x.t > u.t - 60000 && x.t <= u.t).reduce((s, x) => s + x.total, 0); if (w > peak) { peak = w; at = u.t; } }
const mins = (E[E.length - 1].t - E[0].t) / 60000;
console.log(`usage messages ${U.length}; prompt per turn ${U.map((u) => u.prompt).join(',')}; sum ${U.reduce((s, u) => s + u.total, 0)} over ${mins.toFixed(1)} min; peak rolling-minute ${peak} tokens at +${(at / 1000).toFixed(0)} s (limit 65,000)`);
