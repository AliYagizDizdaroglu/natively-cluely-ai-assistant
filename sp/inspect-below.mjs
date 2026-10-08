// THROWAWAY: every Live claim whose best SINGLE-line overlap is below the 0.25 floor, with
// the joined window that would corroborate it. These are the cases joining changes, so they
// are the ones that decide whether joining is a fix or a false-corroboration risk.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const D = path.join(ROOT, 'electron/test/golden/interview60.runs/2026-09-08T08-44-56-after9');
const require = createRequire(import.meta.url);
const { reconcileWindowMs } = require(path.join(process.argv[2], 'questionReconcile.js'));

const log = fs.readFileSync(path.join(D, 'natively_debug.log'), 'utf8').split('\n');
const speech = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"$/);
    if (!m) continue;
    let t; try { t = JSON.parse('"' + m[3] + '"'); } catch { t = m[3]; }
    if (t.trim()) speech.push({ text: t, at: Date.parse(m[1]) });
}
const dispatch = [];
for (const l of log) {
    const m = l.match(/^(\S+) \[LOG\] \[Main\] dispatch: (\w+) source=live .*? question=("(?:[^"\\]|\\.)*")$/);
    if (m) dispatch.push({ at: Date.parse(m[1]), action: m[2], q: JSON.parse(m[3]) });
}
const bufAt = (t) => { const s = []; for (const x of speech) { if (x.at > t) break; s.push(x); if (s.length > 40) s.shift(); } return s; };
const win = (t, ms) => bufAt(t).filter((x) => x.at >= t - ms);
const W = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const ov = (a, b) => { const A = W(a), B = W(b); if (!A.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / A.size; };
const band = (s) => (s >= 0.5 ? 'match' : s >= 0.25 ? 'paraphrase' : 'below');

for (const d of dispatch) {
    const w = reconcileWindowMs(d.q);
    const rs = win(d.at, w);
    const b = rs.reduce((m, r) => Math.max(m, ov(d.q, r.text)), 0);
    const j = ov(d.q, rs.map((r) => r.text).join(' '));
    if (band(b) !== 'below') continue;
    console.log(`--- ${new Date(d.at).toISOString().slice(11, 19)}  logged=${d.action}  best=${b.toFixed(2)} join=${j.toFixed(2)} -> ${band(j)}  window=${Math.round(w / 1000)}s lines=${rs.length}`);
    console.log('    CLAIM:  ' + JSON.stringify(d.q.slice(0, 160)));
    console.log('    WINDOW: ' + JSON.stringify(rs.map((r) => r.text).join(' ').slice(0, 320)));
}
