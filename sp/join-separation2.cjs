const fs = require('fs');
const qr = require('./qr.cjs');
const { reconcileLiveQuestion, reconcileWindowMs, overlap } = qr;
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);

const RE = /^(\S+Z) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="([\s\S]*)"$/;
const all = [];
for (const ln of lines) { const m = ln.match(RE); if (m) all.push({ at: Date.parse(m[1]), final: m[2] === 'true', text: m[3] }); }
// IntelligenceManager.handleTranscript pushes ONLY when segment.text.trim() is truthy.
const events = all.filter(e => e.text.trim().length > 0);
console.log(`transcript events: ${all.length} total, ${events.length} non-empty (the buffer only ever stores the non-empty ones)`);

const liveRe = /^(\S+Z) \[LOG\] \[Main\] Live question \((verbal|coding|behavioral), mode=\w+\): "([\s\S]*)"$/;
const dispatches = [];
for (const ln of lines) { const m = ln.match(liveRe); if (m) dispatches.push({ at: Date.parse(m[1]), text: m[3] }); }
console.log('Live dispatches:', dispatches.length);

// --- buffer pressure, non-empty only ---
console.log('\n=== A. buffer pressure (40-entry cap) on NON-EMPTY events ===');
function maxInWindow(W) {
  let best = 0, j = 0;
  for (let i = 0; i < events.length; i++) {
    while (events[j].at < events[i].at - W) j++;
    if (i - j + 1 > best) best = i - j + 1;
  }
  return best;
}
for (const W of [15000, 20000, 34339, 45500, 60000]) console.log(`  busiest ${W} ms held ${maxInWindow(W)} non-empty lines (cap = 40)`);

let truncated = 0;
for (const d of dispatches) {
  const W = reconcileWindowMs(d.text);
  const before = events.filter(e => e.at <= d.at);
  const wanted = before.filter(e => e.at >= d.at - W).length;
  const got = before.slice(-40).filter(e => e.at >= d.at - W).length;
  if (got < wanted) truncated++;
}
console.log(`  dispatches truncated by the cap in this flight: ${truncated}/${dispatches.length}`);

// --- join separation, non-empty, with repeats excluded ---
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const win = (at, W) => events.filter(e => e.at >= at - W && e.at <= at);

console.log('\n=== B. join separation (repeats of the SAME question excluded from negatives) ===');
const tp = [], tn = [];
for (let i = 0; i < dispatches.length; i++) {
  const d = dispatches[i], W = reconcileWindowMs(d.text);
  const own = win(d.at, W);
  if (own.length) tp.push({ W, s: overlap(d.text, own.map(x => x.text).join(' ')), text: d.text });
  for (let j = 0; j < dispatches.length; j++) {
    if (j === i) continue;
    // a negative must be a DIFFERENT question, and a window that does not touch this one's speech
    if (norm(dispatches[j].text) === norm(d.text)) continue;
    if (overlap(d.text, dispatches[j].text) >= 0.5 || overlap(dispatches[j].text, d.text) >= 0.5) continue;
    if (Math.abs(dispatches[j].at - d.at) < W + 5000) continue;
    const other = win(dispatches[j].at, W);
    if (!other.length) continue;
    tn.push({ W, s: overlap(d.text, other.map(x => x.text).join(' ')), claim: d.text, ref: dispatches[j].text });
  }
}
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const tpS = tp.map(x => x.s), tnS = tn.map(x => x.s);
console.log(`  TP n=${tpS.length} min=${Math.min(...tpS).toFixed(3)} p10=${q(tpS,0.1).toFixed(3)} p50=${q(tpS,0.5).toFixed(3)}`);
console.log(`  TN n=${tnS.length} p50=${q(tnS,0.5).toFixed(3)} p90=${q(tnS,0.9).toFixed(3)} p99=${q(tnS,0.99).toFixed(3)} max=${Math.max(...tnS).toFixed(3)}`);
console.log(`  TN >= MATCH(0.50): ${tnS.filter(s=>s>=0.5).length}   TN >= PARAPHRASE(0.25): ${tnS.filter(s=>s>=0.25).length}`);
console.log('  worst FALSE pairs:');
for (const w of tn.slice().sort((a,b)=>b.s-a.s).slice(0,6))
  console.log(`    ${w.s.toFixed(3)} W=${w.W} claim=${JSON.stringify(w.claim.slice(0,52))} vs window of ${JSON.stringify(w.ref.slice(0,42))}`);

console.log('\n=== C. widened dispatches only (W > 15000) ===');
const tpW = tp.filter(x => x.W > 15000), tnW = tn.filter(x => x.W > 15000);
console.log(`  widened TP n=${tpW.length}: ${tpW.map(x=>x.s.toFixed(2)).join(', ')}`);
if (tnW.length) console.log(`  widened TN n=${tnW.length} max=${Math.max(...tnW.map(x=>x.s)).toFixed(3)} p99=${q(tnW.map(x=>x.s),0.99).toFixed(3)}  >=0.50: ${tnW.filter(x=>x.s>=0.5).length}`);

console.log('\n=== D. every widened dispatch: verdict before vs after the widening ===');
for (const d of dispatches) {
  const W = reconcileWindowMs(d.text);
  if (W <= 15000) continue;
  const before = reconcileLiveQuestion(d.text, win(d.at, 15000));
  const after = reconcileLiveQuestion(d.text, win(d.at, W));
  const flag = before.verdict !== after.verdict ? '  <== CHANGED' : '';
  console.log(`  W=${W} ${before.verdict}(${before.score.toFixed(2)}) -> ${after.verdict}(${after.score.toFixed(2)})${flag}  ${JSON.stringify(d.text.slice(0,50))}`);
  if (after.verdict === 'match') console.log(`      anchor=${JSON.stringify(String(after.anchor).slice(0,70))}`);
}
