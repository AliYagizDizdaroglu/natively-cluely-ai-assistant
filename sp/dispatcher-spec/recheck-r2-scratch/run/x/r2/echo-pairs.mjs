// r2 THROWAWAY (read-only; I7): the echo test's POSITIVE class on NON-holdout hours, with the three candidate metrics.
// Every Live-only turn dispatch (`turn: gate=… finals=0`) is a Live claim that arrived after its own turn closed; the
// closest earlier answered text within 5 min (by overlap, DS liveonly.mjs's rule) is what the machine would remember.
// Two sub-classes by what actually happened: DEDUP-DROP or a double (a true echo), and ANSWERED with no earlier match
// (a rescue of a false close: NOT an echo). Question text only.
import fs from 'node:fs';
import path from 'node:path';
import { cw } from './proto-r2.ts';
import { jaccardSimilarity } from '../../dispatcher/src/jaccardSimilarity.ts';
import { normalizeForContainment } from '../../dispatcher/src/containment.ts';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const W = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
const HOURS = ['2026-09-11T08-22-32-s50b', '2026-09-12T08-22-49-s50c', '2026-09-13T08-22-36-s50d', '2026-09-14T08-22-28-s50e', '2026-09-15T08-22-29-s50f', '2026-09-16T08-42-43-s50g', '2026-09-16T11-41-44-s50h', '2026-09-18T08-22-57-s50i', '2026-09-19T08-22-41-s50j', '2026-09-20T11-22-43-s50k', '2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m', '2026-09-30T11-45-30-br1'].map((d) => `${R}/${d}`).concat(['2026-09-30T02-38-22-cuesmoke', '2026-09-30T13-46-52-cuesmoke', '2026-10-01T02-37-41-cuesmoke'].map((d) => `${W}/${d}`));
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 19);
const QRE = /question="((?:[^"\\]|\\.)*)"/;
const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };
const overlap = (a, b) => { const A = cw(a), B = cw(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const contain = (a, b) => { const na = normalizeForContainment(a), nb = normalizeForContainment(b); return na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na)); };
const echoes = [], rescues = [];
for (const dir of HOURS) {
  const run = path.basename(dir).replace(/^2026-09-/, '');
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  const answers = []; L.forEach((l) => { if (/\[Main\] dispatch: answer source=/.test(l)) { const q = l.match(QRE); answers.push({ at: T(l), q: q ? unq(q[1]) : '' }); } });
  L.forEach((l, i) => {
    const g = l.match(/\[Main\] turn: gate=(\d+) finals=0 live=(\d+)/);
    if (!g) return;
    const at = T(l); const next = L[i + 1] ?? '';
    const dropped = /dispatch: drop source=/.test(next), answered = /dispatch: answer source=/.test(next);
    if (!dropped && !answered) return;
    const q = unq((next.match(QRE) ?? [])[1] ?? '');
    let best = null, bs = 0;
    for (const a of answers) { if (a.at >= at - 50 || at - a.at > 300000) continue; const s = overlap(q, a.q); if (s > bs) { bs = s; best = a; } }
    const jac = best ? jaccardSimilarity(q, best.q) : 0, con = best ? contain(q, best.q) : false;
    const line = `${run.padEnd(18)} ${iso(at)} ${dropped ? 'DEDUP-DROP' : 'ANSWERED  '} overlap ${bs.toFixed(2)} jaccard ${jac.toFixed(2)} containment ${con} cw=${cw(q).size} age ${best ? ((at - best.at) / 1000).toFixed(1) + 's' : '-'} q=${JSON.stringify(q.slice(0, 60))}`;
    if (dropped || bs >= 0.5) echoes.push({ line, bs, jac }); else rescues.push({ line, bs, jac });
  });
}
const mn = (arr, k) => arr.length ? Math.min(...arr.map((x) => x[k])) : null, mx = (arr, k) => arr.length ? Math.max(...arr.map((x) => x[k])) : null;
console.log(`TRUE ECHOES (deduper-dropped, or answered with an earlier match >= 0.5): ${echoes.length}; overlap min ${mn(echoes, 'bs')?.toFixed(2)}; Jaccard min ${mn(echoes, 'jac')?.toFixed(2)}, under 0.70: ${echoes.filter((e) => e.jac < 0.7).length}\n  ${echoes.map((e) => e.line).join('\n  ')}`);
console.log(`RESCUES (answered, no earlier match): ${rescues.length}; overlap max ${mx(rescues, 'bs')?.toFixed(2)}; Jaccard max ${mx(rescues, 'jac')?.toFixed(2)}\n  ${rescues.map((e) => e.line).join('\n  ')}`);
