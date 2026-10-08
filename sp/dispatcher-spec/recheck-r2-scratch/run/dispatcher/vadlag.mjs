// Read-only: how much later the APP's VAD saw the voice stop than the fixture's WAV-derived voice-off.
// App side: every `turn: gate=G finals=N` dispatch line with N > 0 gives lastVoiceOff = t - G; every
// `turn: classify` at time t whose last final is older than settle (400 ms) gives lastVoiceOff = t - 1200.
// Fixture side: the last voice span end of the item whose window holds that moment.
import fs from 'node:fs';
const [fxFile, logFile] = process.argv.slice(2);
const f = JSON.parse(fs.readFileSync(fxFile, 'utf8'));
const L = fs.readFileSync(logFile, 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
const T = (l) => Date.parse(l.slice(0, 24));
const finals = L.filter((l) => /\[Engine-timing\] segment-final speaker=interviewer/.test(l)).map(T);
const itemAt = (t) => { let best = null; for (const it of f.items) if (t >= it.playedAt) best = it; return best; };
const lags = [];
L.forEach((l) => {
  const t = T(l);
  let off = null, kind = '';
  const g = l.match(/\[Main\] turn: gate=(\d+) finals=(\d+)/);
  if (g && Number(g[2]) > 0 && Number(g[1]) < 4000) { off = t - Number(g[1]); kind = 'gate'; }
  if (/\[Main\] turn: classify/.test(l)) { const lastF = Math.max(...finals.filter((x) => x <= t)); if (t - lastF > 450) { off = t - 1200; kind = 'classify'; } }
  if (off === null) return;
  const it = itemAt(off); if (!it || !it.voice.length) return;
  const wavOff = it.voice[it.voice.length - 1][1];
  const lag = off - wavOff;
  if (Math.abs(lag) < 5000) lags.push({ id: it.id, kind, lag });
});
lags.sort((a, b) => a.lag - b.lag);
const q = (p) => lags[Math.min(lags.length - 1, Math.floor(p * lags.length))].lag;
console.log(`${f.run}: n=${lags.length} app VAD-off minus WAV voice-off: min ${lags[0].lag} p10 ${q(0.1)} p50 ${q(0.5)} p90 ${q(0.9)} max ${lags[lags.length - 1].lag} ms`);
console.log(lags.filter((x) => x.id.startsWith('S1Q08') || x.kind === 'classify').map((x) => `${x.id}:${x.kind}:${x.lag}`).join('  '));
