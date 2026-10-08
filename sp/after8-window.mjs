// Throwaway: print the dispatch / detection log lines in a window around given item keys,
// then list answer dispatches whose question overlaps no roster item (the "to nobody" answers).
import fs from 'node:fs';
import path from 'node:path';
const [dir, ...keys] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const log = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split('\n');
const ts = (l) => Date.parse(l.slice(0, 24));
const at = (it) => Number(it.playedAt);
const interesting = /dispatch: |\[Main\] suppressed|DeepgramStreaming\].*final|\[QuestionDetector\]|\[Answer\] (full|budget)|Live.*(question|Question)/;
for (const k of keys) {
  const it = tl.items.find((i) => (i.key || i.id) === k);
  if (!it) { console.log('no item', k); continue; }
  const start = at(it) - 3000, end = at(it) + 45000;
  console.log('=== ' + k + ' played ' + new Date(at(it)).toISOString() + ' ' + JSON.stringify(it.q).slice(0, 110));
  for (const l of log) {
    const t = ts(l); if (!(t >= start && t <= end)) continue;
    if (interesting.test(l)) console.log('  ' + l.slice(11, 23) + ' ' + l.replace(/^\S+ \[LOG\] /, '').slice(0, 200));
  }
}
const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
const overlap = (a, b) => { const A = words(a), B = words(b); let n = 0; for (const w of A) if (B.has(w)) n++; return A.size ? n / A.size : 0; };
console.log('=== answer dispatches with no roster match (overlap < 0.3 against every item)');
for (const l of log) {
  if (l.indexOf('dispatch: answer') < 0) continue;
  const qi = l.indexOf('question="');
  if (qi < 0) continue;
  const body = l.slice(qi + 'question="'.length, l.lastIndexOf('"'));
  let q; try { q = JSON.parse('"' + body + '"'); } catch { q = body; }
  const best = Math.max(...tl.items.map((i) => overlap(q, i.q)));
  if (best < 0.3) console.log('  ' + l.slice(11, 23) + ' best=' + best.toFixed(2) + ' ' + JSON.stringify(q).slice(0, 160));
}
