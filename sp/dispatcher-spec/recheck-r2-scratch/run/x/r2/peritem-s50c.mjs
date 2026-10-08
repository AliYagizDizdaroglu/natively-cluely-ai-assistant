// r2 THROWAWAY (read-only on the repo; C1 / E12): per-item app-VAD offsets for s50c, whose single-offset fixture is
// bimodal (600 / 1306 ms). From the RAW fixture (offset 0) and the log: for each item, the app's implied voice-off
// (gate lines with N > 0 and G < 4000: t - G; classify lines more than 450 ms after their last final: t - 1200) minus
// the WAV voice-off; the item's offset is the median of its own measurements, an item without one takes its nearest
// measured neighbour (marked). Writes fx-s50c-peritem.json (each item's playedAt and voice spans shifted by its own
// offset) next to this script and prints the table.
import fs from 'node:fs';
import path from 'node:path';
import { DS, HERE, R } from './fx.mjs';
const raw = JSON.parse(fs.readFileSync(path.join(DS, 'fx-s50c-raw.json'), 'utf8'));
const L = fs.readFileSync(`${R}/2026-09-12T08-22-49-s50c/natively_debug.log`, 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
const T = (l) => Date.parse(l.slice(0, 24));
const finals = L.filter((l) => /\[Engine-timing\] segment-final speaker=interviewer/.test(l)).map(T);
const offs = [];
L.forEach((l) => {
  const t = T(l);
  const g = l.match(/\[Main\] turn: gate=(\d+) finals=(\d+)/);
  if (g && Number(g[2]) > 0 && Number(g[1]) < 4000) offs.push({ at: t, off: t - Number(g[1]), kind: 'gate' });
  if (/\[Main\] turn: classify/.test(l)) { const lastF = Math.max(...finals.filter((x) => x <= t)); if (t - lastF > 450) offs.push({ at: t, off: t - 1200, kind: 'classify' }); }
});
const items = raw.items.map((it, k) => {
  const wavOff = it.voice.length ? it.voice[it.voice.length - 1][1] : it.playedAt + it.clipSecs * 1000;
  const next = raw.items[k + 1]?.playedAt ?? wavOff + 90000;
  const mine = offs.filter((o) => o.off >= wavOff - 5000 && o.off < next - 2000 && Math.abs(o.off - wavOff) < 5000).map((o) => o.off - wavOff).sort((a, b) => a - b);
  return { it, lag: mine.length ? mine[Math.floor(mine.length / 2)] : null, n: mine.length };
});
items.forEach((x, k) => { if (x.lag !== null) return; let best = null; for (let d = 1; d < items.length && best === null; d++) { for (const j of [k - d, k + d]) if (items[j] && items[j].lag !== null && items[j].n) { best = items[j]; break; } } x.lag = best ? best.lag : 1306; x.nearest = true; });
const fx = { ...raw, offsetMs: 'per-item', offset: { source: 'per-item', runMedian: 1306 }, items: items.map(({ it, lag, n, nearest }) => ({ ...it, playedAt: it.playedAt + lag, voice: it.voice.map(([a, b]) => [a + lag, b + lag]), offsetMs: lag, offsetSource: nearest ? 'nearest' : 'own', offsetN: n })) };
fs.writeFileSync(path.join(HERE, 'fx-s50c-peritem.json'), JSON.stringify(fx));
console.log(items.map(({ it, lag, n, nearest }) => `${it.id.padEnd(7)} lag ${String(lag).padStart(5)} ms ${nearest ? '(nearest)' : `(n=${n})`}`).join('\n'));
const own = items.filter((x) => !x.nearest).length;
console.log(`items with their own measurement: ${own}/${items.length}; lags: ${[...new Set(items.map((x) => Math.round(x.lag / 100) * 100))].sort((a, b) => a - b).join(' ')} (rounded to 100 ms)`);
