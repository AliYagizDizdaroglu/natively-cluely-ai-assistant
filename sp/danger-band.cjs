// The only transition that can KEEP an invented question is best < PARAPHRASE && join >= MATCH:
// below PARAPHRASE the old code would have REPLACED the claim (or held it as unverifiable).
// best in [PARAPHRASE, MATCH) -> paraphrase -> same text AND same anchor as a join-match, so inert.
const fs = require('fs');
const qr = require('./qr.cjs');
const { overlap } = qr;
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);
const TRE = /^(\S+Z) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="([\s\S]*)"$/;
const events = [];
for (const ln of lines) { const m = ln.match(TRE); if (m && m[3].trim()) events.push({ at: Date.parse(m[1]), text: m[3] }); }
const DRE = /^(\S+Z) \[LOG\] \[Main\] dispatch: (\w+) source=(live|whisper) anchor=(".*?"|null) verdict=(\w+) (.*)$/;
const live = [];
for (const ln of lines) {
  const m = ln.match(DRE); if (!m || m[3] !== 'live') continue;
  const qm = m[6].match(/question=(".*")$/); if (!qm) continue;
  let q; try { q = JSON.parse(qm[1]); } catch { continue; }
  live.push({ at: Date.parse(m[1]), q });
}
const WIN = (at, W) => events.filter(e => e.at >= at - W && e.at <= at);
const winMs = t => Math.min(60000, Math.max(15000, Math.round(((t.match(/[A-Za-z0-9']+/g) || []).length / 2.24) * 1000 + 8000)));
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

let danger = 0, inert = 0, pairs = 0, dangerWide = 0;
const worst = [];
for (let i = 0; i < live.length; i++) {
  const d = live[i], W = winMs(d.q);
  for (let j = 0; j < live.length; j++) {
    if (j === i) continue;
    if (norm(live[j].q) === norm(d.q)) continue;
    if (overlap(d.q, live[j].q) >= 0.5 || overlap(live[j].q, d.q) >= 0.5) continue;
    if (Math.abs(live[j].at - d.at) < W + 5000) continue;
    const w = WIN(live[j].at, W); if (!w.length) continue;
    pairs++;
    const best = Math.max(...w.map(l => overlap(d.q, l.text)));
    const join = overlap(d.q, w.map(x => x.text).join(' '));
    if (join >= 0.5) {
      if (best < 0.25) { danger++; if (W > 15000) dangerWide++; worst.push({ best, join, W, q: d.q, ref: live[j].q }); }
      else inert++;
    }
  }
}
console.log(`foreign pairs: ${pairs}`);
console.log(`  join >= MATCH with best in [0.25,0.5)  -> was already 'paraphrase', INERT: ${inert}`);
console.log(`  join >= MATCH with best < 0.25         -> would KEEP an invented question: ${danger}  (of which widened windows: ${dangerWide})`);
for (const w of worst.slice(0, 8)) console.log(`    best=${w.best.toFixed(2)} join=${w.join.toFixed(2)} W=${w.W} ${JSON.stringify(w.q.slice(0,60))}`);

// how much headroom before the dangerous band opens?
let maxJoinBelowP = 0, arg = null;
for (let i = 0; i < live.length; i++) {
  const d = live[i], W = winMs(d.q);
  for (let j = 0; j < live.length; j++) {
    if (j === i) continue;
    if (norm(live[j].q) === norm(d.q)) continue;
    if (overlap(d.q, live[j].q) >= 0.5 || overlap(live[j].q, d.q) >= 0.5) continue;
    if (Math.abs(live[j].at - d.at) < W + 5000) continue;
    const w = WIN(live[j].at, W); if (!w.length) continue;
    const best = Math.max(...w.map(l => overlap(d.q, l.text)));
    const join = overlap(d.q, w.map(x => x.text).join(' '));
    if (best < 0.25 && join > maxJoinBelowP) { maxJoinBelowP = join; arg = { best, join, W, q: d.q, ref: live[j].q }; }
  }
}
console.log(`\nhighest join among foreign pairs whose best < 0.25 (the band that matters): ${maxJoinBelowP.toFixed(3)} vs threshold 0.500`);
if (arg) console.log(`  claim : ${JSON.stringify(arg.q.slice(0,80))}\n  window: ${JSON.stringify(arg.ref.slice(0,80))}\n  W=${arg.W} best=${arg.best.toFixed(2)}`);
