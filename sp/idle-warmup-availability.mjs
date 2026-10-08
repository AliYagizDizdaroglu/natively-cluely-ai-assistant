// idle-warmup-availability.mjs — the idle app's warm-ups after the s50m flight, read as a free
// availability probe: per model and per LOCAL hour (UTC+3), how many 1-token pings succeeded,
// how many failed and why, and how long the successes took. API outcomes only; no speech.
import fs from 'node:fs';

const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const AFTER = process.argv[2] ?? '2026-09-22T08:22:51';
const rows = new Map();   // `${model} ${localHour}` -> { ok, highDemand, other, ms: [] }
const localHour = (ts) => String((Number(ts.slice(11, 13)) + 3) % 24).padStart(2, '0');
for (const line of fs.readFileSync(LOG, 'utf8').split(/\r?\n/)) {
    const ts = line.slice(0, 24);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(ts) || ts < AFTER) continue;
    let m = /\[LLMHelper\] (gemini-[\d.]+-flash-lite) warmed up in (\d+)ms/.exec(line);
    const ok = !!m;
    if (!m) m = /\[LLMHelper\] (gemini-[\d.]+-flash-lite) warmup failed \(non-critical\): (.*)$/.exec(line);
    if (!m) continue;
    const key = `${m[1]} ${localHour(ts)}`;
    const r = rows.get(key) ?? { ok: 0, highDemand: 0, other: 0, ms: [] };
    if (ok) { r.ok++; r.ms.push(Number(m[2])); }
    else if (/high demand/.test(m[2])) r.highDemand++;
    else r.other++;
    rows.set(key, r);
}
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : '-'; };
console.log('model                  local-hour  ok  high-demand  other  median-ok-ms');
for (const [k, r] of [...rows].sort((a, b) => a[0].localeCompare(b[0]))) {
    const [model, h] = k.split(' ');
    console.log(`${model.padEnd(22)} ${h}:00      ${String(r.ok).padStart(2)}  ${String(r.highDemand).padStart(11)}  ${String(r.other).padStart(5)}  ${String(med(r.ms)).padStart(12)}`);
}
