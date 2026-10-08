// Isolate the JOIN's own effect: cases where best-single-line < MATCH but the JOIN >= MATCH.
// Those are exactly the verdicts the join newly promotes to 'match'.
const fs = require('fs');
const qr = require('./qr.cjs');
const { reconcileWindowMs, overlap } = qr;
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
const MATCH = 0.5;

function scores(claim, window) {
  const best = window.length ? Math.max(...window.map(l => overlap(claim, l.text))) : 0;
  const join = window.length ? overlap(claim, window.map(l => l.text).join(' ')) : 0;
  return { best, join };
}

console.log('=== 1. TRUE pairs: how often does the join do the work? ===');
let promoted = 0;
for (const d of live) {
  const W = reconcileWindowMs(d.q);
  const { best, join } = scores(d.q, WIN(d.at, W));
  if (best < MATCH && join >= MATCH) {
    promoted++;
    console.log(`  best=${best.toFixed(2)} join=${join.toFixed(2)} W=${W}  ${JSON.stringify(d.q.slice(0, 78))}`);
  }
}
console.log(`  join newly corroborates ${promoted}/${live.length} real dispatches`);

console.log('\n=== 2. FALSE pairs: claim vs a FOREIGN window (the invention scenario) ===');
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
let falsePromoted = 0, pairs = 0;
const hits = [];
for (let i = 0; i < live.length; i++) {
  const d = live[i], W = reconcileWindowMs(d.q);
  for (let j = 0; j < live.length; j++) {
    if (j === i) continue;
    if (norm(live[j].q) === norm(d.q)) continue;
    if (overlap(d.q, live[j].q) >= 0.5 || overlap(live[j].q, d.q) >= 0.5) continue;
    if (Math.abs(live[j].at - d.at) < W + 5000) continue;
    const w = WIN(live[j].at, W); if (!w.length) continue;
    pairs++;
    const { best, join } = scores(d.q, w);
    if (best < MATCH && join >= MATCH) { falsePromoted++; hits.push({ best, join, W, claim: d.q, ref: live[j].q }); }
  }
}
console.log(`  foreign pairs tested: ${pairs}`);
console.log(`  join promotes a FOREIGN window to 'match': ${falsePromoted}  (${(100*falsePromoted/pairs).toFixed(3)}%)`);
for (const h of hits.slice(0, 10))
  console.log(`    best=${h.best.toFixed(2)} join=${h.join.toFixed(2)} W=${h.W}\n      claim : ${JSON.stringify(h.claim.slice(0,80))}\n      window: ${JSON.stringify(h.ref.slice(0,80))}`);

console.log('\n=== 3. same, if the join were held to PARAPHRASE (0.25) instead — the commit says this breaks ===');
let p25 = 0;
for (let i = 0; i < live.length; i++) {
  const d = live[i], W = reconcileWindowMs(d.q);
  for (let j = 0; j < live.length; j++) {
    if (j === i) continue;
    if (norm(live[j].q) === norm(d.q)) continue;
    if (overlap(d.q, live[j].q) >= 0.5 || overlap(live[j].q, d.q) >= 0.5) continue;
    if (Math.abs(live[j].at - d.at) < W + 5000) continue;
    const w = WIN(live[j].at, W); if (!w.length) continue;
    const { best, join } = scores(d.q, w);
    if (best < 0.25 && join >= 0.25) p25++;
  }
}
console.log(`  at a 0.25 join threshold, foreign windows corroborate ${p25} times (vs ${falsePromoted} at 0.50)`);

console.log('\n=== 4. headroom: how close do the real TRUE joins sit to the threshold? ===');
const tj = [];
for (const d of live) { const W = reconcileWindowMs(d.q); const { best, join } = scores(d.q, WIN(d.at, W)); if (best < MATCH) tj.push(join); }
tj.sort((a, b) => a - b);
console.log(`  joins that had to carry the verdict, sorted: ${tj.map(x => x.toFixed(2)).join(' ')}`);
