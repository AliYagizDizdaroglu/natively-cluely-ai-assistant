// Read-only on the repo: for each run, build a raw fixture into DS, measure the app-VAD offset from the run's own
// gate/classify lines (vadlag rule), rebuild with that offset, and print the offset's spread. Outputs go to DS only.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const [golden, tts, outDir, ...runs] = process.argv.slice(2);
const builder = path.join(golden, 'interview60.turns-fixture.mjs');
const T = (l) => Date.parse(l.slice(0, 24));
for (const run of runs) {
  const name = path.basename(run).replace(/^2026-09-\d\dT[\d-]+-/, '');
  const raw = path.join(outDir, `fx-${name}-raw.json`);
  execFileSync(process.execPath, [builder, run, tts, '--out', raw], { stdio: 'pipe' });
  const f = JSON.parse(fs.readFileSync(raw, 'utf8'));
  const L = fs.readFileSync(path.join(run, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  const finals = L.filter((l) => /\[Engine-timing\] segment-final speaker=interviewer/.test(l)).map(T);
  const itemAt = (t) => { let best = null; for (const it of f.items) if (t >= it.playedAt) best = it; return best; };
  const lags = [];
  L.forEach((l) => {
    const t = T(l); let off = null;
    const g = l.match(/\[Main\] turn: gate=(\d+) finals=(\d+)/);
    if (g && Number(g[2]) > 0 && Number(g[1]) < 4000) off = t - Number(g[1]);
    if (/\[Main\] turn: classify/.test(l)) { const lastF = Math.max(...finals.filter((x) => x <= t)); if (t - lastF > 450) off = t - 1200; }
    if (off === null) return;
    const it = itemAt(off); if (!it || !it.voice.length) return;
    const lag = off - it.voice[it.voice.length - 1][1];
    if (Math.abs(lag) < 5000) lags.push(lag);
  });
  lags.sort((a, b) => a - b);
  const q = (p) => lags[Math.min(lags.length - 1, Math.floor(p * lags.length))];
  const offset = q(0.5);
  const out = path.join(outDir, `fx-${name}-off.json`);
  execFileSync(process.execPath, [builder, run, tts, '--offset-ms', String(offset), '--out', out], { stdio: 'pipe' });
  console.log(`${name.padEnd(10)} offset ${offset} ms (n=${lags.length}, p10 ${q(0.1)}, p90 ${q(0.9)}) -> ${path.basename(out)}`);
}
