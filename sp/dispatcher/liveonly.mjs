// Read-only: every Live-only turn dispatch (`turn: gate=N finals=0 live=K`) in a run and what became of it:
// deduper drop, or an answer. For answers, the closest EARLIER answered question (reconcile-style overlap of the
// claim's content words, len > 3) within 5 min, the age of that answer, and the item playing when the claim's
// Live question line arrived vs the item the earlier answer belongs to (by play window of the answer).
// usage: node liveonly.mjs <runDir>...   (question text only)
import fs from 'node:fs';
import path from 'node:path';
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 19);
const QRE = /question="((?:[^"\\]|\\.)*)"/;
const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };
const cw = (t) => new Set((t.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const overlap = (a, b) => { const A = cw(a), B = cw(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; };
const tot = { liveOnly: 0, dropped: 0, answered: 0, answeredDup: 0 };
for (const dir of process.argv.slice(2)) {
  const run = path.basename(dir).replace(/^2026-09-/, '');
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
  const OFF = tl.clock === 'playsync' ? 0 : 1150;
  const items = tl.items.map((i) => ({ id: i.id, from: tl.startedMs + OFF + i.startSec * 1000, end: tl.startedMs + OFF + (i.startSec + i.clipSecs) * 1000 }));
  items.forEach((it, k) => { it.winTo = (items[k + 1]?.from ?? it.end + 90000) - 2000; });
  const playing = (t) => items.find((it) => t >= it.from - 2000 && t < it.winTo)?.id ?? '-';
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  const answers = [];
  L.forEach((l, i) => {
    if (/\[Main\] dispatch: answer source=/.test(l)) { const q = l.match(QRE); answers.push({ at: T(l), q: q ? unq(q[1]) : '', i }); }
  });
  L.forEach((l, i) => {
    const g = l.match(/\[Main\] turn: gate=(\d+) finals=0 live=(\d+)/);
    if (!g) return;
    tot.liveOnly++;
    const at = T(l);
    const next = L[i + 1] ?? '';
    const dropped = /dispatch: drop source=/.test(next);
    const answered = /dispatch: answer source=/.test(next);
    const q = unq((next.match(QRE) ?? [])[1] ?? '');
    // the Live question line that fed this turn: last `Live question` before the gate line
    let lq = i; while (lq >= 0 && !/\[Main\] Live question/.test(L[lq])) lq--;
    const lqAt = lq >= 0 ? T(L[lq]) : at;
    let best = null, bs = 0;
    for (const a of answers) { if (a.at >= at - 50 || at - a.at > 300000) continue; const s = overlap(q, a.q); if (s > bs) { bs = s; best = a; } }
    const dup = answered && best && bs >= 0.5;
    if (dropped) tot.dropped++;
    if (answered) { tot.answered++; if (dup) tot.answeredDup++; }
    console.log(`${run.padEnd(22)} ${iso(at)} claimAt=${iso(lqAt)} playing=${playing(lqAt).padEnd(7)} ${dropped ? 'DEDUP-DROP' : answered ? 'ANSWERED  ' : 'other     '} ${best && bs >= 0.5 ? `~earlier answer ${iso(best.at)} (${playing(best.at)}) age=${((at - best.at) / 1000).toFixed(1)}s overlap=${bs.toFixed(2)}` : 'no earlier answer matches'}  q=${JSON.stringify(q.slice(0, 60))}`);
  });
}
console.log(`\nLive-only turn dispatches ${tot.liveOnly}: deduper dropped ${tot.dropped}, answered ${tot.answered} (of which match an earlier answer within 5 min: ${tot.answeredDup})`);
