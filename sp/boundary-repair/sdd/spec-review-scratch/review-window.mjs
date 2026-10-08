// Spec-review scratch (read-only, non-holdout logs): every rule-cut (reference definition, empties skipped as
// the wiring does), classed by its next non-empty final, with the F1->F2 gap and whether an empty final sat
// between them in the raw stream. Question: what did the 5000 ms window actually protect in the data?
import fs from 'node:fs';
import path from 'node:path';
import { tok, WINDOW_MS } from '../../rule-v3.mjs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const unq = (s) => JSON.parse(`"${s}"`);
const RE = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/;
const rows = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => !/h40/.test(d) && fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    let lastInterim = null, cut = null, emptyBetween = 0;
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(RE); if (!m) continue;
        const text = unq(m[3]), at = Date.parse(m[1]), isFinal = m[2] === 'true';
        if (!text) { if (isFinal && cut) emptyBetween++; continue; }
        if (!isFinal) { lastInterim = text; continue; }
        if (cut) {
            const f = tok(text), T = cut.T;
            let cls = f[0] === T[0] ? 'NORMAL' : 'OTHER';
            if (cls === 'OTHER') for (let k = 1; k <= 2 && k < T.length; k++) { const mm = Math.min(2, T.length - k); if (f.length >= mm && T.slice(k, k + mm).every((w, j) => w === f[j])) { cls = 'V3-MATCH'; break; } }
            if (cls === 'OTHER' && T.length === 1) cls = 'TAIL1';
            rows.push({ dir, cls, gap: at - cut.at, emptyBetween, I: cut.I, F1: cut.F1, F2: text });
        }
        cut = null; emptyBetween = 0;
        if (lastInterim) {
            const iw = tok(lastInterim), fw = tok(text);
            if (fw.length > 0 && fw.length < iw.length) {
                const s = fw.every((w, i) => w === iw[i]);
                const t = !s && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                if (s || t) cut = { T: iw.slice(fw.length), at, I: lastInterim, F1: text };
            }
        }
        lastInterim = null;
    }
}
const tally = {};
for (const r of rows) { const k = `${r.cls} ${r.gap <= WINDOW_MS ? 'in' : 'OUT'} emptyBetween=${r.emptyBetween > 0}`; tally[k] = (tally[k] ?? 0) + 1; }
console.log(`rule-cuts with a next final: ${rows.length}`); for (const [k, v] of Object.entries(tally).sort()) console.log(`  ${k.padEnd(40)} ${v}`);
const g = rows.filter((r) => r.cls === 'NORMAL').map((r) => r.gap).sort((a, b) => a - b);
console.log(`NORMAL gaps: p50 ${g[Math.floor(g.length / 2)]} p90 ${g[Math.floor(g.length * 0.9)]} max ${g[g.length - 1]}; NORMAL over ${WINDOW_MS}: ${g.filter((x) => x > WINDOW_MS).length}`);
console.log('\nV3-MATCH outside the window (what the window refused):');
for (const r of rows.filter((x) => x.cls === 'V3-MATCH' && x.gap > WINDOW_MS)) console.log(`  ${r.dir.slice(0, 22)} gap ${r.gap} empty=${r.emptyBetween}\n    I : ${JSON.stringify(r.I)}\n    F1: ${JSON.stringify(r.F1)}\n    F2: ${JSON.stringify(r.F2.slice(0, 80))}`);
console.log('\nOTHER (F2 neither resumes nor tail-1), any gap:');
for (const r of rows.filter((x) => x.cls === 'OTHER')) console.log(`  ${r.dir.slice(0, 22)} gap ${r.gap} empty=${r.emptyBetween} I=${JSON.stringify(r.I.slice(-50))} F1=${JSON.stringify(r.F1.slice(-30))} F2=${JSON.stringify(r.F2.slice(0, 50))}`);
