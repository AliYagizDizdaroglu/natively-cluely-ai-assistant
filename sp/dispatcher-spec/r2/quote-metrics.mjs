// r2 THROWAWAY (read-only; I7): the echo test's negative class on NON-holdout hours, with the three candidate metrics.
// Every on-time Live claim (<= 10 s after the clip that ended last: its own item's finals are what the open turn holds)
// is scored: own = overlap(claim, its finals so far); rem = best overlap(claim, answered text of the last 3 answered
// OTHER items); r2's residual rule; and Jaccard / containment of (claim, that remembered text). Built on the
// reviewer's ontime-echo.mjs. Question text only.
import fs from 'node:fs';
import path from 'node:path';
import { judgeEvidence, cw } from './proto-r2.ts';
import { jaccardSimilarity } from '../../dispatcher/src/jaccardSimilarity.ts';
import { normalizeForContainment } from '../../dispatcher/src/containment.ts';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const W = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
const HOURS = ['2026-09-11T08-22-32-s50b', '2026-09-12T08-22-49-s50c', '2026-09-13T08-22-36-s50d', '2026-09-14T08-22-28-s50e', '2026-09-15T08-22-29-s50f', '2026-09-16T08-42-43-s50g', '2026-09-16T11-41-44-s50h', '2026-09-18T08-22-57-s50i', '2026-09-19T08-22-41-s50j', '2026-09-20T11-22-43-s50k', '2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m', '2026-09-30T11-45-30-br1'].map((d) => `${R}/${d}`).concat(['2026-09-30T02-38-22-cuesmoke', '2026-09-30T13-46-52-cuesmoke', '2026-10-01T02-37-41-cuesmoke'].map((d) => `${W}/${d}`));
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 19);
const quote = (a, b) => { const A = cw(a), B = cw(b); if (A.size < 4) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const contain = (a, b) => { const na = normalizeForContainment(a), nb = normalizeForContainment(b); return na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na)); };
const QRE = /question="((?:[^"\\]|\\.)*)"/;
const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };
const FRE = /\[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/;
let ontime = 0, withFinals = 0; const r2abs = [], oldabs = [], remHigh = [], owns = [], jacs = [], cons = [];
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
    if (!it || at - it.end > 10000) return;
    ontime++;
    const ownText = finals.filter((f) => f.at >= it.from - 1500 && f.at < at).map((f) => f.text).join(' ');
    if (ownText) withFinals++;
    const own = quote(full, ownText);
    if (ownText) owns.push(own);
    const prev = []; for (const a of [...answers].reverse()) { if (a.at >= at || !a.id || a.id === it.id) continue; if (!prev.some((p) => p.id === a.id)) prev.push(a); if (prev.length === 3) break; }
    const remembered = [...prev].reverse().map((p) => ({ text: p.text, id: p.id }));
    const j = judgeEvidence(full, ownText, remembered);
    const remText = j.remIdx >= 0 ? remembered[j.remIdx].text : (remembered.length ? remembered.reduce((a, b) => (quote(full, b.text) > quote(full, a.text) ? b : a)).text : '');
    const remId = j.remIdx >= 0 ? remembered[j.remIdx].id : null;
    const jac = remText ? jaccardSimilarity(full, remText) : 0, con = remText ? contain(full, remText) : false;
    jacs.push(jac); if (con) cons.push(`${run} ${iso(at)} ${it.id}`);
    const line = `${run.padEnd(18)} ${iso(at)} ${it.id.padEnd(7)} +${((at - it.end) / 1000).toFixed(1)}s own ${own.toFixed(2)} rem ${j.remScore.toFixed(2)} (${remId ?? '-'}) residual ${j.hits}/${j.residual} quotesOpen=${j.quotesOpen} echo=${j.echo} jaccard ${jac.toFixed(2)} containment ${con} q=${JSON.stringify(full.slice(0, 70))}`;
    if (j.echo) r2abs.push(line);
    if (j.remScore >= 0.5 && j.remScore > own) oldabs.push(line);
    if (j.remScore >= 0.4) remHigh.push(line);
  });
}
owns.sort((a, b) => a - b); jacs.sort((a, b) => a - b);
const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
console.log(`on-time Live claims (<= 10 s after their clip) in 16 non-holdout whole-turn hours: ${ontime}; with interviewer finals so far: ${withFinals}`);
console.log(`ABSORBED by the r2 residual rule (a wrong absorption of an on-time claim): ${r2abs.length}\n  ${r2abs.join('\n  ')}`);
console.log(`absorbed by the r1 rule (rem >= 0.5 and rem > own): ${oldabs.length}\n  ${oldabs.join('\n  ')}`);
console.log(`every on-time claim with rem >= 0.40 (the negative class near the bar): ${remHigh.length}\n  ${remHigh.join('\n  ')}`);
console.log(`own (claim vs its own finals so far), n=${owns.length}: min ${owns[0].toFixed(2)} p1 ${q(owns, 0.01).toFixed(2)} p5 ${q(owns, 0.05).toFixed(2)} p10 ${q(owns, 0.1).toFixed(2)} p50 ${q(owns, 0.5).toFixed(2)}; under 0.50: ${owns.filter((x) => x < 0.5).length}; under 0.30: ${owns.filter((x) => x < 0.3).length}`);
console.log(`Jaccard(claim, best remembered other) over on-time claims: max ${jacs[jacs.length - 1].toFixed(2)} p99 ${q(jacs, 0.99).toFixed(2)}; containment hits: ${cons.length} [${cons.join(', ')}]`);
