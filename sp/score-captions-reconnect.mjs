// Throwaway: are Live 3.x's bad captions the session cuts (fixable by rotating
// sessions before the server limit) or recognition errors (the model)? Per
// spoken item: caption WER vs script, whether a [LiveRouter] reconnect fell
// inside the item's play window, and whether the caption is a truncation
// (missing head or tail words) or a garble. usage: node score-captions-reconnect.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';

const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
function wer(ref, hyp) {
    const r = words(ref), h = words(hyp);
    const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
    for (let j = 1; j <= h.length; j++) d[0][j] = j;
    for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
    return r.length ? d[r.length][h.length] / r.length : 0;
}
// Truncation: the caption's words are a contiguous run inside the script (allowing
// small recognition slips) and shorter than it. Head-cut if the run starts late,
// tail-cut if it ends early. Measured by the best-aligned substring WER.
function shape(ref, hyp) {
    const r = words(ref), h = words(hyp);
    if (!h.length) return 'nothing';
    if (h.length >= r.length * 0.85) return wer(ref, hyp) > 0.25 ? 'garbled' : 'ok';
    let best = { w: 1, at: 0 };
    for (let at = 0; at + h.length <= r.length; at++) {
        const w = wer(r.slice(at, at + h.length).join(' '), h.join(' '));
        if (w < best.w) best = { w, at };
    }
    if (best.w > 0.34) return 'garbled';
    const head = best.at > 0, tail = best.at + h.length < r.length;
    return head && tail ? 'both cut' : head ? 'head cut' : tail ? 'tail cut' : 'ok';
}

const dir = process.argv[2];
const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const ts = (s) => Date.parse(s);
const captions = [...dbg.matchAll(/^(\S+) \[LOG\] \[LiveCaption\] fragment (".*")$/gm)].map((m) => ({ at: ts(m[1]), text: JSON.parse(m[2]) }));
const reconnects = [...dbg.matchAll(/^(\S+) \[[A-Z]+\] \[LiveRouter\] reconnecting/gm)].map((m) => ts(m[1]));
const items = timeline.items.filter((i) => (i.kind ?? 'spoken') === 'spoken');
const rows = items.map((it) => {
    const spokeEnd = it.playedAt + Math.round((it.clipSecs ?? 0) * 1000);
    const from = it.playedAt - 1000, to = spokeEnd + 12000;
    const live = captions.filter((c) => c.at >= from && c.at <= to).map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim();
    // A reconnect while the sentence was being spoken, or in the 3 s before it.
    const cut = reconnects.find((t) => t >= it.playedAt - 3000 && t <= spokeEnd + 500) ?? null;
    return { id: it.id, q: it.q, live, w: wer(it.q, live), shape: shape(it.q, live), cut: cut ? Math.round((cut - it.playedAt) / 1000) : null };
});
const f = (x) => (x * 100).toFixed(0).padStart(3) + '%';
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };
console.log(`reconnects in the hour: ${reconnects.length}   median gap ${Math.round(pct(reconnects.slice(1).map((t, i) => t - reconnects[i]), .5) / 1000)} s\n`);
console.log('item   wer   shape      reconnect   heard');
for (const r of rows.filter((r) => r.w > 0.25 || r.cut != null)) console.log(`${r.id.padEnd(5)} ${f(r.w)}  ${r.shape.padEnd(9)}  ${r.cut == null ? '   —     ' : String(r.cut + ' s').padStart(6) + '   '}  ${JSON.stringify(r.live.slice(0, 80))}`);
const withCut = rows.filter((r) => r.cut != null), noCut = rows.filter((r) => r.cut == null);
const bad = (a) => a.filter((r) => r.w > 0.25).length;
console.log(`\nitems with a reconnect during the sentence: ${withCut.length}  bad(>25%) ${bad(withCut)}  median WER ${f(pct(withCut.map((r) => r.w), .5))}`);
console.log(`items without:                             ${noCut.length}  bad(>25%) ${bad(noCut)}  median WER ${f(pct(noCut.map((r) => r.w), .5))}`);
const shapes = {};
for (const r of rows.filter((r) => r.w > 0.25)) shapes[r.shape] = (shapes[r.shape] ?? 0) + 1;
console.log(`bad items by shape: ${Object.entries(shapes).map(([k, n]) => `${k} ${n}`).join(', ')}`);
console.log(`bad items by shape WITHOUT a reconnect: ${Object.entries(noCut.filter((r) => r.w > 0.25).reduce((a, r) => ({ ...a, [r.shape]: (a[r.shape] ?? 0) + 1 }), {})).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`);
