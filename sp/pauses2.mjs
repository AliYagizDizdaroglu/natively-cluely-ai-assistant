// THROWAWAY: actual silences inside the s50a questions, as the STT saw them — a silence is a
// gap between consecutive transcript events that carried text (interim or final); during
// speech those arrive every few hundred ms. For each of the 13 doubled mains, the silence at
// the moment the early answer fired, versus every silence inside the clip. Read-only.
import fs from 'node:fs';
import path from 'node:path';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a';
const dbg = fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8');
const tl = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.timeline.json'), 'utf8'));
const ts = (s) => Date.parse(s);
const ev = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/gm)]
    .map((m) => ({ at: ts(m[1]), final: m[2] === 'true', text: m[3] })).filter((e) => e.text.trim() && e.at >= tl.startedMs);
const fires = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: answer source=(live|whisper) anchor="((?:[^"\\]|\\.)*)"/gm)].map((m) => ({ at: ts(m[1]), source: m[2], anchor: m[3] }));
console.log(`transcript events with text: ${ev.length} (${ev.filter((e) => e.final).length} finals)`);
const items = tl.items.map((i) => ({ ...i, playedAt: tl.startedMs + i.startSec * 1000, spokeEnd: tl.startedMs + (i.startSec + i.clipSecs) * 1000 }));
const DOUBLED = new Set(['S1Q02', 'S1Q03', 'S1Q04', 'S1Q05', 'S1Q06', 'S1Q08', 'S1Q09', 'S1Q10', 'S2Q02', 'S2Q03', 'S2Q05', 'S2Q07', 'S2Q09']);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[Math.min(s.length - 1, Math.floor(p * s.length))] / 1000).toFixed(2) : '—'; };
const insideAll = [], atFire = [];
console.log('\nsilences (> 0.4 s) inside each main, and the silence during which each EARLY answer fired');
for (const it of items) {
    if (it.level === 'followup') continue;
    const w = ev.filter((e) => e.at >= it.playedAt - 300 && e.at <= it.spokeEnd + 1500);
    const sil = [];
    for (let i = 1; i < w.length; i++) { const g = w[i].at - w[i - 1].at; if (g > 400) sil.push({ from: w[i - 1].at, to: w[i].at, ms: g }); }
    insideAll.push(...sil.map((s) => s.ms));
    const early = fires.filter((f) => f.at >= it.playedAt && f.at < it.spokeEnd);
    const fireNotes = early.map((f) => {
        const s = sil.find((x) => f.at >= x.from - 200 && f.at <= x.to + 200) ?? null;   // the silence around the fire
        if (s) atFire.push(s.ms);
        return `${f.source}@${((f.at - it.spokeEnd) / 1000).toFixed(1)}s in a ${s ? (s.ms / 1000).toFixed(1) + ' s' : '?'} silence`;
    });
    console.log(`  ${it.id.padEnd(6)} ${DOUBLED.has(it.id) ? 'DOUBLED' : '       '} silences ${sil.map((s) => (s.ms / 1000).toFixed(1)).join(' ').padEnd(34)} ${fireNotes.join('; ')}`);
}
console.log(`\nsilences inside mains (> 0.4 s): n=${insideAll.length}  p50 ${pct(insideAll, .5)}s  p90 ${pct(insideAll, .9)}s  max ${pct(insideAll, 1)}s`);
console.log(`silence in which an early answer fired: n=${atFire.length}  min ${pct(atFire, 0)}s  p50 ${pct(atFire, .5)}s  max ${pct(atFire, 1)}s`);
for (const t of [600, 800, 1000, 1200, 1500]) console.log(`  a hold of ${t} ms would have covered ${insideAll.filter((g) => g <= t).length} of ${insideAll.length} inside silences and stopped ${atFire.filter((g) => g <= t).length} of ${atFire.length} early fires`);
