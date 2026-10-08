// REVIEW THROWAWAY (read-only): the s50g shape across NON-holdout hours, attributed by TIME, not text. An "on-time" Live
// claim is one that arrives within 10 s after the end of the clip that was playing last (Live lag p90 4.1 s): its own
// item's finals are what the open turn holds. own = quote(claim, that item's interviewer finals so far);
// rem = best quote(claim, answered text of the last 3 answered OTHER items). The spec's echo rule absorbs the claim when
// rem >= 0.5 and rem > own. Question text only.
import fs from 'node:fs';
import path from 'node:path';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const W = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
const HOURS = ['2026-09-11T08-22-32-s50b', '2026-09-12T08-22-49-s50c', '2026-09-13T08-22-36-s50d', '2026-09-14T08-22-28-s50e', '2026-09-15T08-22-29-s50f', '2026-09-16T08-42-43-s50g', '2026-09-16T11-41-44-s50h', '2026-09-18T08-22-57-s50i', '2026-09-19T08-22-41-s50j', '2026-09-20T11-22-43-s50k', '2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m', '2026-09-30T11-45-30-br1'].map((d) => `${R}/${d}`).concat(['2026-09-30T02-38-22-cuesmoke', '2026-09-30T13-46-52-cuesmoke'].map((d) => `${W}/${d}`));
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 19);
const cw = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const quote = (a, b) => { const A = cw(a), B = cw(b); if (A.size < 4) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const QRE = /question="((?:[^"\\]|\\.)*)"/;
const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };
const FRE = /\[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/;
let ontime = 0; const hits = [], near = []; const margins = [];
for (const dir of HOURS) {
  const run = path.basename(dir).replace(/^2026-09-/, '');
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
  const OFF = tl.clock === 'playsync' ? 0 : 1150;
  const items = tl.items.map((i) => ({ id: i.id, from: tl.startedMs + OFF + i.startSec * 1000, end: tl.startedMs + OFF + (i.startSec + i.clipSecs) * 1000 }));
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  const itemAt = (t) => { let cur = null; for (const it of items) if (t >= it.from - 1500) cur = it; return cur; };
  const finals = []; L.forEach((l) => { const m = l.match(FRE); if (m) finals.push({ at: T(l), text: unq(m[1]) }); });
  const answers = []; L.forEach((l) => { if (!/\[Main\] dispatch: answer source=/.test(l)) return; const m = l.match(QRE); if (m) answers.push({ at: T(l), text: unq(m[1]), id: itemAt(T(l))?.id ?? null }); });
  L.forEach((l, i) => {
    if (!/\[Main\] Live question \(/.test(l)) return;
    const at = T(l);
    let full = null;
    for (let j = i + 1; j < L.length && T(L[j]) - at < 50; j++) { if (/dispatch: (mark|drop|answer|chip|extend|hold) source=live/.test(L[j])) { const q = L[j].match(QRE); if (q) full = unq(q[1]); break; } }
    if (!full) return;
    const it = [...items].reverse().find((x) => x.end <= at + 500);
    if (!it || at - it.end > 10000) return; // on-time only
    ontime++;
    const ownText = finals.filter((f) => f.at >= it.from - 1500 && f.at < at).map((f) => f.text).join(' ');
    const own = quote(full, ownText);
    const prevIds = []; for (const a of [...answers].reverse()) { if (a.at >= at || !a.id || a.id === it.id) continue; if (!prevIds.includes(a.id)) prevIds.push(a.id); if (prevIds.length === 3) break; }
    let rem = 0, remId = null; for (const pid of prevIds) for (const a of answers.filter((x) => x.id === pid && x.at < at)) { const s = quote(full, a.text); if (s > rem) { rem = s; remId = pid; } }
    margins.push(own - rem);
    const line = `${run.padEnd(18)} ${iso(at)} ${it.id.padEnd(7)} +${((at - it.end) / 1000).toFixed(1)}s own ${own.toFixed(2)} remembered ${rem.toFixed(2)} (${remId ?? '-'}) q=${JSON.stringify(full.slice(0, 80))}`;
    if (rem >= 0.5 && rem > own) hits.push(line); else if (rem >= 0.5 || (rem >= 0.4 && own - rem < 0.2)) near.push(line);
  });
}
margins.sort((a, b) => a - b);
console.log(`on-time Live claims (<= 10 s after their clip) in 15 non-holdout whole-turn hours: ${ontime}`);
console.log(`ABSORBED by the spec's echo rule while their own turn is open (remembered >= 0.5 and > own): ${hits.length}\n  ${hits.join('\n  ')}`);
console.log(`near (remembered >= 0.5 but own higher, or remembered >= 0.4 within 0.2 of own): ${near.length}\n  ${near.join('\n  ')}`);
console.log(`own - remembered margin: min ${margins[0]?.toFixed(2)}, p5 ${margins[Math.floor(margins.length * 0.05)]?.toFixed(2)}, p50 ${margins[Math.floor(margins.length / 2)]?.toFixed(2)}`);
