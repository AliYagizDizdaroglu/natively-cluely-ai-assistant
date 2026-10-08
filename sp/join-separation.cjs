const fs = require('fs');
const qr = require('./qr.cjs');
const { reconcileLiveQuestion, reconcileWindowMs, overlap } = qr;
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);

const RE = /^(\S+Z) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="([\s\S]*)"$/;
const events = [];
for (const ln of lines) { const m = ln.match(RE); if (m) events.push({ at: Date.parse(m[1]), final: m[2] === 'true', text: m[3] }); }

const liveRe = /^(\S+Z) \[LOG\] \[Main\] Live question \((verbal|coding|behavioral), mode=\w+\): "([\s\S]*)"$/;
const dispatches = [];
for (const ln of lines) { const m = ln.match(liveRe); if (m) dispatches.push({ at: Date.parse(m[1]), text: m[3] }); }

console.log('=== A. are the busy windows real speech or a reconnect flood? ===');
const t = Date.parse('2026-09-08T16:54:06.672Z');
for (const e of events.filter(x => x.at >= t - 34339 && x.at <= t).slice(0, 8))
  console.log('  ', new Date(e.at).toISOString(), 'final=' + e.final, JSON.stringify(e.text.slice(0, 70)));
console.log('   ... (showing first 8 of the 64 in that 34s window)');

const win = (at, W) => events.filter(e => e.at >= at - W && e.at <= at);

console.log('\n=== B. join-score separation on the REAL flight, at the WIDENED window ===');
// True positive: each Live claim against its own window.
// True negative: each Live claim against a window centred on a DIFFERENT question
//                in the same interview (same domain, same speaker, same vocabulary).
const tp = [], tn = [];
for (let i = 0; i < dispatches.length; i++) {
  const d = dispatches[i];
  const W = reconcileWindowMs(d.text);
  const own = win(d.at, W);
  if (own.length) tp.push({ W, s: overlap(d.text, own.map(x => x.text).join(' ')), text: d.text });
  for (let j = 0; j < dispatches.length; j++) {
    if (j === i) continue;
    const other = win(dispatches[j].at, W);
    if (!other.length) continue;
    // skip windows that actually overlap this question's own speech
    if (Math.abs(dispatches[j].at - d.at) < W + 5000) continue;
    tn.push({ W, s: overlap(d.text, other.map(x => x.text).join(' ')), claim: d.text, at: dispatches[j].at });
  }
}
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const tpS = tp.map(x => x.s), tnS = tn.map(x => x.s);
console.log(`  true positives  n=${tpS.length}  min=${Math.min(...tpS).toFixed(3)} p10=${q(tpS,0.1).toFixed(3)} p50=${q(tpS,0.5).toFixed(3)}`);
console.log(`  true negatives  n=${tnS.length}  p50=${q(tnS,0.5).toFixed(3)} p90=${q(tnS,0.9).toFixed(3)} p99=${q(tnS,0.99).toFixed(3)} max=${Math.max(...tnS).toFixed(3)}`);
console.log(`  MATCH threshold = 0.50 ; PARAPHRASE = 0.25`);
console.log(`  true negatives >= 0.50 (would FALSELY corroborate): ${tnS.filter(s => s >= 0.5).length}`);
console.log(`  true negatives >= 0.25 (would corroborate at PARAPHRASE): ${tnS.filter(s => s >= 0.25).length}`);
console.log(`  true positives  <  0.50 (join fails to corroborate): ${tpS.filter(s => s < 0.5).length}`);

const worst = tn.slice().sort((a, b) => b.s - a.s).slice(0, 5);
console.log('\n  highest-scoring FALSE pairs:');
for (const w of worst) console.log(`    ${w.s.toFixed(3)}  W=${w.W}  claim=${JSON.stringify(w.claim.slice(0, 60))}`);

console.log('\n=== C. same separation restricted to the WIDENED dispatches only ===');
const tpW = tp.filter(x => x.W > 15000).map(x => x.s), tnW = tn.filter(x => x.W > 15000).map(x => x.s);
if (tpW.length) {
  console.log(`  widened TPs n=${tpW.length} min=${Math.min(...tpW).toFixed(3)}  -> ${tpW.filter(s=>s<0.5).length} below MATCH`);
  console.log(`  widened TNs n=${tnW.length} max=${Math.max(...tnW).toFixed(3)} p99=${q(tnW,0.99).toFixed(3)} -> ${tnW.filter(s=>s>=0.5).length} at/above MATCH`);
  console.log(`  margin between the worst widened TP and the best widened TN: ${(Math.min(...tpW) - Math.max(...tnW)).toFixed(3)}`);
}

console.log('\n=== D. what the 40-entry cap would do to the widened dispatches ===');
for (const d of dispatches) {
  const W = reconcileWindowMs(d.text);
  if (W <= 15000) continue;
  const before = events.filter(e => e.at <= d.at);
  const capped = before.slice(-40).filter(e => e.at >= d.at - W);
  const uncapped = before.filter(e => e.at >= d.at - W);
  const full = reconcileLiveQuestion(d.text, uncapped);
  const cap = reconcileLiveQuestion(d.text, capped);
  console.log(`  W=${W} lines ${uncapped.length}->${capped.length}  verdict ${full.verdict}(${full.score.toFixed(2)}) -> ${cap.verdict}(${cap.score.toFixed(2)})  ${JSON.stringify(d.text.slice(0, 45))}`);
}
