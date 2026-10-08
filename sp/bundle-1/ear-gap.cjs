// throwaway (bundle-1 spec evidence): per run log, delay from each interviewer Deepgram segment-final
// to the nearest [LiveCaption] line in [t-15 s, t+60 s]. Prints per run + pooled distribution.
const fs = require('fs'), path = require('path');
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const all = []; let runs = 0; const lateRows = [];
for (const d of fs.readdirSync(R)) {
  const f = path.join(R, d, 'natively_debug.log'); if (!fs.existsSync(f)) continue;
  const L = fs.readFileSync(f, 'utf8').split('\n'); const fin = [], cap = [];
  for (const l of L) {
    const t = Date.parse(l.slice(0, 24)); if (isNaN(t)) continue;
    if (l.includes('[Engine-timing] segment-final speaker=interviewer')) fin.push(t);
    else if (l.includes('[LiveCaption] fragment')) cap.push(t);
  }
  if (cap.length < 10 || fin.length < 10) continue; runs++;
  const ds = [];
  for (const t of fin) {
    let best = null;
    for (const c of cap) { if (c >= t - 15000 && c <= t + 60000) { best = c - t; break; } }
    ds.push(best);
  }
  // longest stretch of consecutive finals with no caption within 60 s
  let run = 0, maxRun = 0; for (const x of ds) { if (x === null) { run++; maxRun = Math.max(maxRun, run); } else run = 0; }
  const miss = ds.filter((x) => x === null).length; const pos = ds.filter((x) => x !== null && x > 0).sort((a, b) => a - b);
  all.push(...ds.filter((x) => x !== null));
  for (const x of ds) if (x !== null && x > 8000) lateRows.push(`${d.slice(0, 30)} ${x}`);
  console.log(d.slice(0, 44).padEnd(44), 'finals', fin.length, 'caps', cap.length, 'noCap60', miss, 'maxRunNoCap', maxRun, 'after>0', pos.length, 'p50', pos[Math.floor(pos.length / 2)] ?? '-', 'max', pos[pos.length - 1] ?? '-');
}
const s = all.sort((a, b) => a - b); const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
console.log('POOLED runs', runs, 'n', s.length, 'p50', q(.5), 'p90', q(.9), 'p99', q(.99), 'max', s[s.length - 1], '>5s', s.filter((x) => x > 5000).length, '>8s', s.filter((x) => x > 8000).length, '>10s', s.filter((x) => x > 10000).length, '>15s', s.filter((x) => x > 15000).length);
console.log('LATE>8s', lateRows.join(' | '));
