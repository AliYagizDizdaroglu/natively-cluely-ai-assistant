// THROWAWAY diagnosis: reconcileLiveQuestion scores a Live claim against the BEST SINGLE
// transcript line. Hypothesis: a long claim can never overlap one short line enough, so the
// window size was never the binding constraint — the per-line comparison is.
// Test: same windows, but score against the JOIN of the lines in the window.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const D = path.join(ROOT, 'electron/test/golden/interview60.runs/2026-09-08T08-44-56-after9');
const require = createRequire(import.meta.url);
const { reconcileWindowMs } = require(path.join(process.argv[2], 'questionReconcile.js'));

const log = fs.readFileSync(path.join(D, 'natively_debug.log'), 'utf8').split('\n');
const tl = JSON.parse(fs.readFileSync(path.join(D, 'interview60.timeline.json'), 'utf8')).items;

const speech = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"$/);
    if (!m) continue;
    let text; try { text = JSON.parse('"' + m[3] + '"'); } catch { text = m[3]; }
    if (text.trim()) speech.push({ text, at: Date.parse(m[1]), final: m[2] === 'true' });
}
const dispatch = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[Main\] dispatch: (\w+) source=live .*? question=("(?:[^"\\]|\\.)*")$/);
    if (m) dispatch.push({ at: Date.parse(m[1]), q: JSON.parse(m[3]) });
}
const bufferAt = (t) => { const seen = []; for (const s of speech) { if (s.at > t) break; seen.push(s); if (seen.length > 40) seen.shift(); } return seen; };
const windowed = (t, ms) => bufferAt(t).filter((s) => s.at >= t - ms);

const words = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const overlap = (a, b) => { const A = words(a), B = words(b); if (!A.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / A.size; };
const best = (claim, rs) => rs.reduce((m, r) => Math.max(m, overlap(claim, r.text)), 0);
const joined = (claim, rs) => overlap(claim, rs.map((r) => r.text).join(' '));

console.log('MATCH = 0.50, PARAPHRASE = 0.25\n');
console.log('id     lines15 lines_new   best@15  join@15   best@new  join@new');
for (const it of tl) {
    if (it.level !== 'long') continue;
    const end = it.playedAt + it.clipSecs * 1000;
    const d = dispatch.find((x) => x.at >= it.playedAt && x.at < end + 20000);
    if (!d) continue;
    const claim = it.id === 'L03' ? it.q : d.q;
    const w = reconcileWindowMs(claim);
    const a = windowed(d.at, 15_000), b = windowed(d.at, w);
    console.log(
        it.id.padEnd(6), String(a.length).padStart(7), String(b.length).padStart(9), '  ',
        best(claim, a).toFixed(2).padStart(7), joined(claim, a).toFixed(2).padStart(8),
        best(claim, b).toFixed(2).padStart(10), joined(claim, b).toFixed(2).padStart(9),
    );
}

// Blast radius of joining: every Live dispatch in the hour, best vs join at its own window.
console.log('\nAll Live dispatches — would joining change the verdict band?');
const band = (s) => (s >= 0.5 ? 'match' : s >= 0.25 ? 'paraphrase' : 'below');
const counts = new Map();
for (const d of dispatch) {
    const w = reconcileWindowMs(d.q);
    const rs = windowed(d.at, w);
    const k = band(best(d.q, rs)) + ' -> ' + band(joined(d.q, rs));
    counts.set(k, (counts.get(k) ?? 0) + 1);
}
for (const [k, v] of [...counts].sort((x, y) => y[1] - x[1])) console.log('  ' + String(v).padStart(3) + '  ' + k);
