// Review scratch (read-only): per answer-dispatch window, the gap G between the screen clock's t0
// (WhatToAnswerLLM.ts:310, recovered as first-token line time - its N ms) and the hedge's t0
// (LLMHelper.ts:3478, recovered as won-by line time - its "at N ms"). Numbers only.
//   node gap-g.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';
function logSince(file, from, to) {
    if (!fs.existsSync(file)) return '';
    const size = fs.statSync(file).size;
    const end = Math.min(to ?? size, size);
    if (end <= from) return '';
    const fd = fs.openSync(file, 'r');
    try { const buf = Buffer.alloc(end - from); fs.readSync(fd, buf, 0, buf.length, from); return buf.toString('utf8'); }
    finally { fs.closeSync(fd); }
}
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const dir = process.argv[2];
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const dbg = logSince(path.join(dir, 'natively_debug.log'), tl.startDebug, tl.endDebug);
const diag = logSince(path.join(dir, 'verbal-diag.log'), tl.startDiag, tl.endDiag);
const LVL = '\\[(?:LOG|WARN|ERROR)\\]';
const disp = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|supersede) /gm)].map((m) => ({ index: m.index, t: Date.parse(m[1]) }));
const won = [...dbg.matchAll(new RegExp(`^(\\S+) ${LVL} \\[LLMHelper\\] verbal hedge: won by (\\S+) at (\\d+)ms`, 'gm'))].map((m) => ({ index: m.index, t: Date.parse(m[1]), at: Number(m[3]) }));
const ft = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((m) => ({ t: Date.parse(m[1]), ms: Number(m[2]) })).sort((a, b) => a.t - b.t);
const G = [], S_minus_M = [], dispToWta = [];
for (let i = 0; i < disp.length; i++) {
    const s = disp[i].index, e = i + 1 < disp.length ? disp[i + 1].index : dbg.length;
    const w = won.filter((x) => x.index >= s && x.index < e).pop();
    if (!w) continue;
    const f = ft.find((x) => x.t >= w.t);
    if (!f) continue;
    const t0wta = f.t - f.ms, t0hedge = w.t - w.at;
    G.push(t0hedge - t0wta);
    S_minus_M.push(f.ms - w.at);
    dispToWta.push(t0wta - disp[i].t);
}
const st = (a) => { const z = [...a].sort((x, y) => x - y); return `n=${z.length} min=${z[0]} median=${pct(z, .5)} p90=${pct(z, .9)} max=${z[z.length - 1]}`; };
console.log(path.basename(dir));
console.log(`  G = hedge t0 - screen-clock t0 (ms): ${st(G)}`);
console.log(`  screen N - model N, same window (ms): ${st(S_minus_M)}`);
console.log(`  dispatch line -> screen-clock t0 (ms): ${st(dispToWta)}`);
