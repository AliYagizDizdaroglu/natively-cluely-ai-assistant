// Old algorithm (pre-742b8fd) vs new, on the real after9 flight, at each side's OWN window.
const fs = require('fs');
const qr = require('./qr.cjs');
const { reconcileLiveQuestion, reconcileWindowMs, overlap } = qr;
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);

const TRE = /^(\S+Z) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="([\s\S]*)"$/;
const events = [];
for (const ln of lines) { const m = ln.match(TRE); if (m && m[3].trim()) events.push({ at: Date.parse(m[1]), text: m[3], final: m[2] === 'true' }); }
const DRE = /^(\S+Z) \[LOG\] \[Main\] dispatch: (\w+) source=(live|whisper) anchor=(".*?"|null) verdict=(\w+) (.*)$/;
const live = [];
for (const ln of lines) {
  const m = ln.match(DRE); if (!m || m[3] !== 'live') continue;
  const qm = m[6].match(/question=(".*")$/); if (!qm) continue;
  let q; try { q = JSON.parse(qm[1]); } catch { continue; }
  live.push({ at: Date.parse(m[1]), q });
}
const WIN = (at, W) => events.filter(e => e.at >= at - W && e.at <= at);

// Faithful copy of the OLD reconcileLiveQuestion (no join), verified below against the new
// one on inputs where the join cannot fire.
const { looksFragmentary } = (() => {
  // reuse the real predicate through the bundled module: replicate by probing behaviour
  return { looksFragmentary: null };
})();

function oldReconcile(liveText, recent) {
  const spoken = recent.filter(r => r.text.trim().length > 0);
  if (!spoken.length) return { verdict: 'unverifiable', text: liveText };
  let best = spoken[0], bestScore = -1;
  for (const r of spoken) { const s = overlap(liveText, r.text); if (s > bestScore) { best = r; bestScore = s; } }
  if (bestScore >= 0.5) return { verdict: 'match', text: liveText, anchor: best.text, score: bestScore };
  if (bestScore >= 0.25) return { verdict: 'paraphrase', text: liveText, anchor: best.text, score: bestScore };
  const latest = spoken.reduce((a, b) => (b.at > a.at ? b : a));
  // fragmentary check delegated to the real module by calling it with a single-line window
  const probe = reconcileLiveQuestion(liveText, [latest]);
  if (probe.verdict === 'unverifiable') return { verdict: 'unverifiable', text: liveText, score: bestScore };
  return { verdict: 'replaced', text: latest.text, anchor: latest.text, score: bestScore };
}

// CALIBRATION: on windows where the join score < 0.5, old and new must agree exactly.
let calOk = 0, calBad = 0;
for (const d of live) {
  const w = WIN(d.at, 15000);
  const join = w.length ? overlap(d.q, w.map(x => x.text).join(' ')) : 0;
  if (join >= 0.5) continue;
  const a = oldReconcile(d.q, w), b = reconcileLiveQuestion(d.q, w);
  if (a.verdict === b.verdict && a.text === b.text) calOk++; else { calBad++; console.log('CAL MISMATCH', a.verdict, b.verdict, JSON.stringify(d.q.slice(0,50))); }
}
console.log(`CALIBRATION of the old-algorithm replica: ${calOk} agree, ${calBad} disagree (must be 0 disagreements)\n`);

console.log('=== FULL effect of the commit: old(15s, no join) vs new(sized, join) ===');
let changed = 0, toMatch = 0, rescued = 0;
for (const d of live) {
  const W = reconcileWindowMs(d.q);
  const a = oldReconcile(d.q, WIN(d.at, 15000));
  const b = reconcileLiveQuestion(d.q, WIN(d.at, W));
  if (a.verdict === b.verdict && a.text === b.text) continue;
  changed++;
  const textChanged = a.text !== b.text;
  if (textChanged) rescued++;
  if (b.verdict === 'match') toMatch++;
  console.log(`  ${a.verdict}(${(a.score ?? 0).toFixed(2)}) -> ${b.verdict}(${b.score.toFixed(2)})${textChanged ? '  TEXT CHANGED' : ''}  W=${W}`);
  console.log(`     claim: ${JSON.stringify(d.q.slice(0, 90))}`);
  if (textChanged) console.log(`     old answered: ${JSON.stringify(a.text.slice(0, 90))}`);
}
console.log(`\n  verdicts changed: ${changed}/${live.length};  of those, the ANSWERED TEXT changed: ${rescued}`);

console.log('\n=== the one FALSE corroboration found in 6503 foreign pairs ===');
const claim = 'What is the difference between data drift and concept drift?';
const ref = live.find(d => /people do not start ignoring/i.test(d.q)) || live.find(d => /20 models in production/i.test(d.q));
const w = WIN(ref.at, 15000);
console.log('  foreign window lines:');
for (const l of w) console.log('    ', JSON.stringify(l.text.slice(0, 78)));
const oldV = oldReconcile(claim, w), newV = reconcileLiveQuestion(claim, w);
console.log(`  OLD verdict: ${oldV.verdict}  -> answered ${JSON.stringify(oldV.text.slice(0, 70))}`);
console.log(`  NEW verdict: ${newV.verdict} (score ${newV.score.toFixed(3)}) -> answered ${JSON.stringify(newV.text.slice(0, 70))}`);
console.log(`  join score exactly: ${overlap(claim, w.map(x => x.text).join(' '))}`);
