// The two mutants the suite did NOT catch: what do they cost on the real after9 flight?
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
const winMs = (t, wps, lag = 8000) => Math.min(60000, Math.max(15000, Math.round(((t.match(/[A-Za-z0-9']+/g) || []).length / wps) * 1000 + lag)));
const verdictOf = (claim, w, MATCH) => {
  const sp = w.filter(r => r.text.trim());
  if (!sp.length) return 'unverifiable';
  const best = Math.max(...sp.map(l => overlap(claim, l.text)));
  if (best >= MATCH) return 'match';
  if (overlap(claim, sp.map(l => l.text).join(' ')) >= MATCH) return 'match(join)';
  if (best >= 0.25) return 'paraphrase';
  return 'replaced/unverifiable';
};

console.log('=== mutant A: WORDS_PER_SEC 2.24 (p10, shipped) vs 2.66 (median) — no test catches this ===');
let diff = 0;
for (const d of live) {
  const a = verdictOf(d.q, WIN(d.at, winMs(d.q, 2.24)), 0.5);
  const b = verdictOf(d.q, WIN(d.at, winMs(d.q, 2.66)), 0.5);
  const wa = winMs(d.q, 2.24), wb = winMs(d.q, 2.66);
  if (a !== b) { diff++; console.log(`  ${a} -> ${b}   window ${wa} -> ${wb}   ${JSON.stringify(d.q.slice(0, 70))}`); }
}
console.log(`  verdicts that would change on the real flight: ${diff}/${live.length}`);
console.log(`  (L03-class claim of 59 words: window ${winMs('x '.repeat(59), 2.24)} -> ${winMs('x '.repeat(59), 2.66)} ms)`);

console.log('\n=== mutant B: MATCH 0.5 -> 0.4 — no test catches this ===');
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
let false05 = 0, false04 = 0, pairs = 0;
for (let i = 0; i < live.length; i++) {
  const d = live[i], W = winMs(d.q, 2.24);
  for (let j = 0; j < live.length; j++) {
    if (j === i) continue;
    if (norm(live[j].q) === norm(d.q)) continue;
    if (overlap(d.q, live[j].q) >= 0.5 || overlap(live[j].q, d.q) >= 0.5) continue;
    if (Math.abs(live[j].at - d.at) < W + 5000) continue;
    const w = WIN(live[j].at, W); if (!w.length) continue;
    pairs++;
    const join = overlap(d.q, w.map(x => x.text).join(' '));
    const best = Math.max(...w.map(l => overlap(d.q, l.text)));
    if (best < 0.5 && join >= 0.5) false05++;
    if (best < 0.4 && join >= 0.4) false04++;
  }
}
console.log(`  foreign windows falsely corroborated at MATCH=0.50: ${false05}/${pairs}`);
console.log(`  foreign windows falsely corroborated at MATCH=0.40: ${false04}/${pairs}  (${(false04/Math.max(1,false05)).toFixed(0)}x worse, silently)`);

console.log('\n=== how tight is the shipped 0.50? real join scores either side of it ===');
const all = [];
for (const d of live) {
  const W = winMs(d.q, 2.24), w = WIN(d.at, W);
  if (w.length) all.push(overlap(d.q, w.map(x => x.text).join(' ')));
}
const near = all.filter(s => s >= 0.45 && s <= 0.55).sort((a, b) => a - b);
console.log(`  true-pair joins within 0.45-0.55 of the threshold: ${near.map(x => x.toFixed(3)).join(' ')}`);
