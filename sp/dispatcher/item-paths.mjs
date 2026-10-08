// Read-only: for one roster item in many runs, the detector verdict sequence inside the item's window
// (Q = chip-worthy detected=true, n = detected=false / low conf, 0 = null), whether a classify was asked and what
// it said, and how the item was first answered (source, delay after clip end, finals/live of the dispatch).
// usage: node item-paths.mjs <itemId> <runDir>...
import fs from 'node:fs';
import path from 'node:path';
const [id, ...dirs] = process.argv.slice(2);
const T = (l) => Date.parse(l.slice(0, 24));
for (const dir of dirs) {
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
  const OFF = tl.clock === 'playsync' ? 0 : 1150;
  const k = tl.items.findIndex((i) => i.id === id);
  if (k < 0) continue;
  const it = tl.items[k];
  const from = tl.startedMs + OFF + it.startSec * 1000 - 2000;
  const end = tl.startedMs + OFF + (it.startSec + it.clipSecs) * 1000;
  const to = Math.min(end + 90000, tl.items[k + 1] ? tl.startedMs + OFF + tl.items[k + 1].startSec * 1000 - 2000 : Infinity);
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l) && T(l) >= from && T(l) < to);
  const seq = [];
  let classify = '-', first = null, closes = [];
  L.forEach((l, i) => {
    const r = l.match(/\[QD-timing\] detect returned \+\d+ms result=(.*)$/);
    if (r) { const m = r[1].match(/detected=(\w+) conf=([\d.]+) q\.len=(\d+)/); seq.push(r[1].startsWith('null') ? '0' : m && m[1] === 'true' && Number(m[2]) >= 0.6 && Number(m[3]) > 0 ? 'Q' : 'n'); }
    if (/\[Main\] turn: classify/.test(l)) { classify = `asked(f=${l.match(/finals=(\d+)/)[1]})`; seq.push('|C|'); }
    const c = l.match(/turn: close reason=([\w-]+)/); if (c) closes.push(c[1]);
    if (!first && /\[Main\] dispatch: answer source=/.test(l)) { let g = ''; for (let j = i - 1; j >= 0 && j > i - 3; j--) { const m = L[j].match(/turn: gate=\d+ finals=(\d+) live=(\d+)/); if (m) { g = `f${m[1]}l${m[2]}`; break; } } first = `${l.match(/source=(\w+)/)[1]}/${g || 'R21'} +${((T(l) - end) / 1000).toFixed(1)}s`; }
  });
  console.log(`${path.basename(dir).replace(/^2026-09-/, '').padEnd(24)} detector: ${seq.join(' ').padEnd(28)} classify: ${classify.padEnd(12)} first answer: ${(first ?? 'NONE').padEnd(22)} closes: ${closes.join(',')}`);
}
