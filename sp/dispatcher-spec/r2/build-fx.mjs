// r2 THROWAWAY (read-only on the repo; writes only under r2/): builds three fixtures with the COMMITTED builder, exactly
// as DS/build-all.mjs built the eight: a raw fixture (offset 0), the run's app-VAD offset from its own gate and classify
// lines (DS/vadlag.mjs's rule: gate lines with N > 0 and G < 4000 give t - G; classify lines more than 450 ms after
// their last final give t - 1200; each minus the WAV voice-off of the item playing; median, p10, p90), then the offset
// fixture. cuesmoke2 = the 05:00 re-smoke (two real declines: S1Q07F's lead-in, S1Q08F's fragment); s50e and s50g pin
// the I1 echo shapes. Prints the offset table only.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { HERE, R, W } from './fx.mjs';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden';
const builder = path.join(G, 'interview60.turns-fixture.mjs');
const tts = `${G}/scenario50-tts-local`;
const T = (l) => Date.parse(l.slice(0, 24));
const RUNS = [['cuesmoke2', `${W}/2026-10-01T02-37-41-cuesmoke`], ['s50e', `${R}/2026-09-14T08-22-28-s50e`], ['s50g', `${R}/2026-09-16T08-42-43-s50g`]];
for (const [name, run] of RUNS) {
  const raw = path.join(HERE, `fx-${name}-raw.json`);
  execFileSync(process.execPath, [builder, run, tts, '--out', raw], { stdio: 'pipe' });
  const f = JSON.parse(fs.readFileSync(raw, 'utf8'));
  const L = fs.readFileSync(path.join(run, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  const finals = L.filter((l) => /\[Engine-timing\] segment-final speaker=interviewer/.test(l)).map(T);
  const itemAt = (t) => { let best = null; for (const it of f.items) if (t >= it.playedAt) best = it; return best; };
  const lags = [];
  L.forEach((l) => {
    const t = T(l); let off = null, kind = '';
    const g = l.match(/\[Main\] turn: gate=(\d+) finals=(\d+)/);
    if (g && Number(g[2]) > 0 && Number(g[1]) < 4000) { off = t - Number(g[1]); kind = 'gate'; }
    if (/\[Main\] turn: classify/.test(l)) { const lastF = Math.max(...finals.filter((x) => x <= t)); if (t - lastF > 450) { off = t - 1200; kind = 'classify'; } }
    if (off === null) return;
    const it = itemAt(off); if (!it || !it.voice.length) return;
    const lag = off - it.voice[it.voice.length - 1][1];
    if (Math.abs(lag) < 5000) lags.push({ id: it.id, kind, lag });
  });
  lags.sort((a, b) => a.lag - b.lag);
  const q = (p) => lags[Math.min(lags.length - 1, Math.floor(p * lags.length))].lag;
  const offset = q(0.5);
  const out = path.join(HERE, `fx-${name}-off.json`);
  execFileSync(process.execPath, [builder, run, tts, '--offset-ms', String(offset), '--out', out], { stdio: 'pipe' });
  const f2 = JSON.parse(fs.readFileSync(out, 'utf8'));
  console.log(`${name.padEnd(9)} offset ${offset} ms (n=${lags.length}, min ${lags[0].lag}, p10 ${q(0.1)}, p90 ${q(0.9)}, max ${lags[lags.length - 1].lag}; spread p10-p90 ${q(0.9) - q(0.1)}) -> ${path.basename(out)}: ${f2.items.length} items, ${f2.finals.length} finals, ${f2.actual.filter((a) => a.action === 'mark').length} marks`);
  if (name === 'cuesmoke2') console.log(`  per-measurement: ${lags.map((x) => `${x.id}:${x.kind}:${x.lag}`).join('  ')}`);
}
