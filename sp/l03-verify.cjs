// Does the commit actually fix the two REPLACED questions of the after9 flight?
const fs = require('fs');
const qr = require('./qr.cjs');
const { reconcileLiveQuestion, reconcileWindowMs, overlap } = qr;
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);
const TRE = /^(\S+Z) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="([\s\S]*)"$/;
const events = [];
for (const ln of lines) { const m = ln.match(TRE); if (m && m[3].trim()) events.push({ at: Date.parse(m[1]), text: m[3], final: m[2] === 'true' }); }
const WIN = (at, W) => events.filter(e => e.at >= at - W && e.at <= at);

function report(label, at, claim) {
  console.log(`\n===== ${label} =====`);
  const W = reconcileWindowMs(claim);
  console.log(`  claim words = ${(claim.match(/[A-Za-z0-9']+/g) || []).length}  ->  window = ${W} ms`);
  const w15 = WIN(at, 15000), wNew = WIN(at, W);
  console.log(`  window lines: 15s -> ${w15.length};  sized -> ${wNew.length}`);
  const oldR = reconcileLiveQuestion(claim, w15);   // new code, OLD window
  const newR = reconcileLiveQuestion(claim, wNew);  // new code, NEW window
  const bestOld = w15.length ? Math.max(...w15.map(l => overlap(claim, l.text))) : 0;
  const joinOld = w15.length ? overlap(claim, w15.map(l => l.text).join(' ')) : 0;
  const bestNew = wNew.length ? Math.max(...wNew.map(l => overlap(claim, l.text))) : 0;
  const joinNew = wNew.length ? overlap(claim, wNew.map(l => l.text).join(' ')) : 0;
  console.log(`  at 15s : best=${bestOld.toFixed(2)} join=${joinOld.toFixed(2)} -> ${oldR.verdict}, answers ${JSON.stringify(oldR.text.slice(0, 60))}`);
  console.log(`  at ${W}ms: best=${bestNew.toFixed(2)} join=${joinNew.toFixed(2)} -> ${newR.verdict}, answers ${JSON.stringify(newR.text.slice(0, 60))}`);
  console.log(`  anchor now = ${JSON.stringify(String(newR.anchor).slice(0, 80))}`);
  // and what the OLD algorithm (no join) would do at the NEW window, to separate the two changes
  const bestOnly = (c, win) => {
    if (!win.length) return 'unverifiable';
    const b = Math.max(...win.map(l => overlap(c, l.text)));
    return b >= 0.5 ? 'match' : b >= 0.25 ? 'paraphrase' : 'replaced/unverifiable';
  };
  console.log(`  [attribution] window widening alone (no join) at ${W}ms would give: ${bestOnly(claim, wNew)}`);
}

const L03_AT = Date.parse('2026-09-08T08:28:36.266Z');
// (a) the author's reconstruction, as used in the new unit test
const L03_TEST_CLAIM = 'Say you have twenty models in production, owned by four different teams, and today each team '
  + 'watches its own dashboards by hand. Design me a monitoring setup that catches data drift, prediction '
  + 'drift, and plain infrastructure problems, tells you which team owns the alert, and keeps the false '
  + 'alarm rate low enough that people do not start ignoring it.';
report('L03 — unit-test reconstruction of the claim', L03_AT, L03_TEST_CLAIM);

// (b) Live's OWN caption of the same utterance, logged verbatim at 08:28:33.984 — the closest
//     thing in the log to what Live actually reported (the dispatch log truncates at 80 chars).
const L03_CAPTION = "Let's talk about monitoring. Say you have twenty models in production, owned by four different teams, "
  + 'and today each team watches its own dashboards by hand. Design me a monitoring setup that catches data drift, '
  + 'prediction drift, and plane infrastructure. failures across all of them, and explain who gets paged for what, '
  + 'and how you would keep the false alarms low enough that people do not start ignoring it.';
report('L03 — Live\'s own caption of the utterance (log line 6784)', L03_AT, L03_CAPTION);

// (c) the 80-char prefix that IS in the log, to show what the window would be if Live had
//     reported only that much (the "Live compresses long questions" failure mode)
report('L03 — if Live had reported only the logged 80-char prefix', L03_AT,
  'Say you have 20 models in production, owned by 4 different teams, and today each');

// second replaced case
const ING_AT = Date.parse('2026-09-08T08:04:13.699Z');
report('the other replaced question (08:04:13) — 80-char prefix from the log',
  ING_AT, 'Describe how you would design a scalable data ingestion pipeline for machine lea');
