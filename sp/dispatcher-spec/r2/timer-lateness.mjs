// r2 THROWAWAY (read-only): provenance for the replay's timer-jitter rule (C1). Every `turn: gate=G finals=N`
// dispatch with N > 0 is the app's gate timer firing: G - 1200 is how late the app acted after the voice-off + gate
// moment (a settle wait when the final came late inflates it, so the small-lateness subset is reported separately).
import fs from 'node:fs';
import { FX } from './fx.mjs';
const T = (l) => Date.parse(l.slice(0, 24));
const all = [], small = [];
const perRun = [];
for (const [name, , log] of FX) {
  if (name === 's50c-peritem') continue;
  const L = fs.readFileSync(log, 'utf8').split(/\r?\n/);
  const lags = [];
  for (const l of L) { const m = l.match(/\[Main\] turn: gate=(\d+) finals=(\d+)/); if (!m) continue; const g = Number(m[1]); if (Number(m[2]) === 0 || g >= 4000) continue; lags.push(g - 1200); }
  lags.sort((a, b) => a - b);
  const s = lags.filter((x) => x <= 300);
  all.push(...lags); small.push(...s);
  const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
  perRun.push(`${name.padEnd(9)} n=${lags.length} (<=300 ms: ${s.length}) lateness p50 ${q(s, 0.5)} p90 ${q(s, 0.9)} p99 ${q(s, 0.99)} max ${s[s.length - 1]} ms; over 300 ms: ${lags.length - s.length} (max ${lags[lags.length - 1]})`);
}
all.sort((a, b) => a - b); small.sort((a, b) => a - b);
const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
console.log(perRun.join('\n'));
console.log(`ALL runs: n=${all.length}; the <= 300 ms subset n=${small.length}: p50 ${q(small, 0.5)} p90 ${q(small, 0.9)} p95 ${q(small, 0.95)} p99 ${q(small, 0.99)} max ${small[small.length - 1]} ms; negative (timer early) ${small.filter((x) => x < 0).length}`);
