// REVIEW THROWAWAY (read-only): the echo test's false-absorption surface on NON-holdout hours. For every Live claim,
// attributed to its true item by livelag.mjs's rule (the item whose script covers >= 0.5 of the claim's content words),
// compare quote(claim, its OWN item's answered text) with the best quote(claim, answered text of any of the 3 previously
// answered OTHER items). If best-other >= 0.5 and best-other >= own, the spec's rule would absorb this claim as another
// item's echo whenever it arrives while its own turn is open (strict >: ties go to the open turn) or before its own
// finals exist. Question text only.
import fs from 'node:fs';
import path from 'node:path';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const W = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
const HOURS = ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9', '2026-09-11T08-22-32-s50b', '2026-09-12T08-22-49-s50c', '2026-09-13T08-22-36-s50d', '2026-09-14T08-22-28-s50e', '2026-09-15T08-22-29-s50f', '2026-09-16T08-42-43-s50g', '2026-09-16T11-41-44-s50h', '2026-09-18T08-22-57-s50i', '2026-09-19T08-22-41-s50j', '2026-09-20T11-22-43-s50k', '2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m', '2026-09-30T11-45-30-br1'].map((d) => `${R}/${d}`).concat(['2026-09-30T02-38-22-cuesmoke', '2026-09-30T13-46-52-cuesmoke'].map((d) => `${W}/${d}`));
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 19);
const STOP = new Set('the a an and or of to in on for with is are be that this it as at by from your you we our my i would how what which when where why do does can could should'.split(' '));
const content = (s) => new Set((s.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)));
const frac = (a, b) => { const A = content(a), B = content(b); let h = 0; for (const w of A) if (B.has(w)) h++; return A.size ? h / A.size : 0; };
const cw = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const quote = (a, b) => { const A = cw(a), B = cw(b); if (A.size < 4) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const QRE = /question="((?:[^"\\]|\\.)*)"/;
const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };
let claims = 0, attributed = 0; const risky = [], near = [];
for (const dir of HOURS) {
  const run = path.basename(dir).replace(/^2026-09-/, '');
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
  const OFF = tl.clock === 'playsync' ? 0 : 1150;
  const items = tl.items.map((i) => ({ id: i.id, q: i.q, from: tl.startedMs + OFF + i.startSec * 1000, end: tl.startedMs + OFF + (i.startSec + i.clipSecs) * 1000 }));
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  const attribute = (t, text) => { let best = null, bs = 0; for (const it of items) { if (it.from - 2000 > t) continue; if (t - it.end > 180000) continue; const s = frac(text, it.q); if (s > bs || (s === bs && best && it.from > best.from)) { bs = s; best = it; } } return bs >= 0.5 ? best : null; };
  // answered texts, attributed to items
  const answers = [];
  L.forEach((l) => { if (!/\[Main\] dispatch: answer source=/.test(l)) return; const m = l.match(QRE); if (!m) return; const text = unq(m[1]); const a = attribute(T(l), text); answers.push({ at: T(l), text, id: a?.id ?? null }); });
  L.forEach((l, i) => {
    const m = l.match(/\[Main\] Live question \((\w+), mode=\w+\): "(.*)"$/);
    if (!m) return;
    claims++;
    const at = T(l);
    let full = null;
    for (let j = i + 1; j < L.length && T(L[j]) - at < 50; j++) { if (/dispatch: (mark|drop|answer|chip|extend|hold) source=live/.test(L[j])) { const q = L[j].match(QRE); if (q) full = unq(q[1]); break; } }
    if (!full) return;
    const it = attribute(at, full);
    if (!it) return;
    attributed++;
    const own = answers.filter((a) => a.id === it.id).map((a) => quote(full, a.text));
    const ownBest = own.length ? Math.max(...own) : null;
    // the 3 most recently answered OTHER items before the claim (the machine remembers the last 3 dispatched turns)
    const prevIds = []; for (const a of [...answers].reverse()) { if (a.at >= at || a.id === null || a.id === it.id) continue; if (!prevIds.includes(a.id)) prevIds.push(a.id); if (prevIds.length === 3) break; }
    let bo = 0, boId = null; for (const pid of prevIds) for (const a of answers.filter((x) => x.id === pid && x.at < at)) { const s = quote(full, a.text); if (s > bo) { bo = s; boId = pid; } }
    const line = `${run.padEnd(18)} ${iso(at)} ${it.id.padEnd(7)} own ${ownBest === null ? ' -- ' : ownBest.toFixed(2)} best-other ${bo.toFixed(2)} (${boId ?? '-'})  q=${JSON.stringify(full.slice(0, 90))}`;
    if (bo >= 0.5 && (ownBest === null || bo >= ownBest)) risky.push(line);
    else if (bo >= 0.4) near.push(line);
  });
}
console.log(`claims ${claims}, attributed ${attributed}`);
console.log(`\nWOULD BE ABSORBED as another item's echo if it arrived while its own turn was open (best-other >= 0.5 and >= own): ${risky.length}\n  ${risky.join('\n  ')}`);
console.log(`\nnear (best-other 0.40-0.50, below own or under the bar): ${near.length}\n  ${near.join('\n  ')}`);
