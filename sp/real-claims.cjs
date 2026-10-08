const fs = require('fs');
const qr = require('./qr.cjs');
const { reconcileLiveQuestion, reconcileWindowMs, overlap } = qr;
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);

// Transcript events (the buffer stores only non-empty ones).
const TRE = /^(\S+Z) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="([\s\S]*)"$/;
const events = [];
for (const ln of lines) { const m = ln.match(TRE); if (m && m[3].trim()) events.push({ at: Date.parse(m[1]), final: m[2] === 'true', text: m[3] }); }

// dispatch lines carry the FULL question as JSON (not sliced to 80).
const DRE = /^(\S+Z) \[LOG\] \[Main\] dispatch: (\w+) source=(live|whisper) anchor=(".*?"|null) verdict=(\w+) (.*)$/;
const disp = [];
for (const ln of lines) {
  const m = ln.match(DRE);
  if (!m) continue;
  const qm = m[6].match(/question=(".*")$/);
  if (!qm) continue;
  let q; try { q = JSON.parse(qm[1]); } catch { continue; }
  disp.push({ at: Date.parse(m[1]), action: m[2], source: m[3], verdict: m[5], q });
}
console.log('dispatch lines parsed:', disp.length, ' live:', disp.filter(d => d.source === 'live').length);

// CALIBRATION: full text must be longer than the 80-char Live log line for long ones
const live = disp.filter(d => d.source === 'live');
const lens = live.map(d => (d.q.match(/[A-Za-z0-9']+/g) || []).length).sort((a, b) => a - b);
console.log(`CALIBRATION: live claim word counts min=${lens[0]} p50=${lens[Math.floor(lens.length/2)]} max=${lens[lens.length-1]} (>80-char claims exist: ${live.filter(d=>d.q.length>80).length})`);

const WIN = (at, W) => events.filter(e => e.at >= at - W && e.at <= at);

console.log('\n=== window sizes actually produced by the REAL Live claims ===');
const widened = [];
for (const d of live) {
  const W = reconcileWindowMs(d.q);
  if (W > 15000) widened.push({ ...d, W });
}
console.log(`live dispatches: ${live.length};  window widened past the floor: ${widened.length}`);
const ws = widened.map(x => x.W).sort((a, b) => a - b);
if (ws.length) console.log(`  widened window ms: min=${ws[0]} p50=${ws[Math.floor(ws.length/2)]} max=${ws[ws.length-1]}`);

console.log('\n=== verdict at the OLD fixed 15s window vs the NEW sized window ===');
let changed = 0;
for (const d of widened) {
  const before = reconcileLiveQuestion(d.q, WIN(d.at, 15000));
  const after = reconcileLiveQuestion(d.q, WIN(d.at, d.W));
  const mark = before.verdict !== after.verdict ? '   <== CHANGED' : '';
  if (before.verdict !== after.verdict) changed++;
  console.log(`  W=${String(d.W).padStart(5)} ${before.verdict}(${before.score.toFixed(2)}) -> ${after.verdict}(${after.score.toFixed(2)})${mark}`);
  console.log(`      claim: ${JSON.stringify(d.q.slice(0, 95))}`);
  if (after.verdict === 'match') console.log(`      anchor: ${JSON.stringify(String(after.anchor).slice(0, 85))}`);
}
console.log(`verdicts changed by the widening: ${changed}/${widened.length}`);

console.log('\n=== 40-entry cap vs the widened windows (real claims) ===');
let trunc = 0;
for (const d of widened) {
  const before = events.filter(e => e.at <= d.at);
  const wanted = before.filter(e => e.at >= d.at - d.W).length;
  const got = before.slice(-40).filter(e => e.at >= d.at - d.W).length;
  if (got < wanted) { trunc++; console.log(`  TRUNCATED W=${d.W} wanted=${wanted} got=${got}  ${JSON.stringify(d.q.slice(0,60))}`); }
}
console.log(`  widened dispatches truncated by the 40-entry cap: ${trunc}/${widened.length}`);

console.log('\n=== the join threshold on REAL claims: TP vs TN separation ===');
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const tp = [], tn = [];
for (let i = 0; i < live.length; i++) {
  const d = live[i], W = reconcileWindowMs(d.q);
  const own = WIN(d.at, W);
  if (own.length) tp.push({ W, s: overlap(d.q, own.map(x => x.text).join(' ')) });
  for (let j = 0; j < live.length; j++) {
    if (j === i) continue;
    if (norm(live[j].q) === norm(d.q)) continue;
    if (overlap(d.q, live[j].q) >= 0.5 || overlap(live[j].q, d.q) >= 0.5) continue;
    if (Math.abs(live[j].at - d.at) < W + 5000) continue;
    const o = WIN(live[j].at, W);
    if (o.length) tn.push({ W, s: overlap(d.q, o.map(x => x.text).join(' ')), claim: d.q, ref: live[j].q });
  }
}
const q_ = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const tpS = tp.map(x => x.s), tnS = tn.map(x => x.s);
console.log(`  TP n=${tpS.length} min=${Math.min(...tpS).toFixed(3)} p10=${q_(tpS,0.1).toFixed(3)} p50=${q_(tpS,0.5).toFixed(3)}  below MATCH: ${tpS.filter(s=>s<0.5).length}`);
console.log(`  TN n=${tnS.length} p99=${q_(tnS,0.99).toFixed(3)} max=${Math.max(...tnS).toFixed(3)}  at/above MATCH: ${tnS.filter(s=>s>=0.5).length}  at/above PARAPHRASE: ${tnS.filter(s=>s>=0.25).length}`);
const tnWide = tn.filter(x => x.W > 15000);
if (tnWide.length) console.log(`  widened-window TN n=${tnWide.length} max=${Math.max(...tnWide.map(x=>x.s)).toFixed(3)}  at/above MATCH: ${tnWide.filter(x=>x.s>=0.5).length}`);
for (const w of tn.slice().sort((a,b)=>b.s-a.s).slice(0,5))
  console.log(`    TN ${w.s.toFixed(3)} W=${w.W}  ${JSON.stringify(w.claim.slice(0,58))}`);
