// THROWAWAY: why did the calibration case not reproduce? Print what after8 actually
// holds around 07:36:26 and the join scores of every live dispatch.
import fs from 'node:fs';
import path from 'node:path';

const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-07T08-14-12-after8';
const log = fs.readFileSync(path.join(D, 'natively_debug.log'), 'utf8').split('\n');

const wordSet = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
function overlap(a, b) { const A = wordSet(a), B = wordSet(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; }
const windowMs = (t, wps = 2.24) => Math.min(60000, Math.max(15000, Math.round(((t.match(/[A-Za-z0-9']+/g) ?? []).length / wps) * 1000 + 8000)));

const speech = [], dispatch = [], liveQ = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"$/);
    if (m) { let t; try { t = JSON.parse('"' + m[3] + '"'); } catch { t = m[3]; } if (t.trim()) speech.push({ text: t, at: Date.parse(m[1]) }); continue; }
    const d = l.match(/^(\S+) \[LOG\] \[Main\] dispatch: (\w+) source=live .*? question=("(?:[^"\\]|\\.)*")$/);
    if (d) { dispatch.push({ at: Date.parse(d[1]), action: d[2], q: JSON.parse(d[3]) }); continue; }
    const q = l.match(/^(\S+) \[LOG\] \[Main\] Live question/);
    if (q) liveQ.push({ at: Date.parse(q[1]), line: l.slice(0, 220) });
}
console.log(`speech ${speech.length}   live dispatches ${dispatch.length}   "Live question" lines ${liveQ.length}\n`);

const rows = dispatch.map((d) => {
    const w = windowMs(d.q);
    const win = speech.filter((s) => s.at <= d.at && s.at >= d.at - w);
    let best = 0; for (const r of win) best = Math.max(best, overlap(d.q, r.text));
    return { ...d, best, join: overlap(d.q, win.map((r) => r.text).join(' ')), lines: win.length };
});
console.log('the 10 lowest-join dispatches (where a false claim would live):');
for (const r of rows.slice().sort((a, b) => a.join - b.join).slice(0, 10)) {
    console.log(`  ${new Date(r.at).toISOString().slice(11, 19)}  best ${r.best.toFixed(3)}  join ${r.join.toFixed(3)}  lines ${String(r.lines).padStart(2)}  ${JSON.stringify(r.q.slice(0, 72))}`);
}
console.log('\nanything joining between 0.20 and 0.55 (the band the MATCH guard protects):');
for (const r of rows.filter((x) => x.join >= 0.2 && x.join <= 0.55).sort((a, b) => a.join - b.join)) {
    console.log(`  ${new Date(r.at).toISOString().slice(11, 19)}  best ${r.best.toFixed(3)}  join ${r.join.toFixed(3)}  ${JSON.stringify(r.q.slice(0, 72))}`);
}
console.log('\n"Live question" lines near 07:36 (Live\'s own claim, truncated at 80 chars in the log):');
for (const q of liveQ) {
    const t = new Date(q.at).toISOString().slice(11, 19);
    if (t >= '07:35:00' && t <= '07:38:00') console.log('  ' + q.line);
}
