// Does the 40-entry recentInterviewerSpeech ring buffer actually hold the widened window?
// Replays the REAL after9 interviewer transcript events out of natively_debug.log.
const fs = require('fs');
const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';

const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);
const RE = /^(\S+Z) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="([\s\S]*)"$/;

const events = [];
for (const ln of lines) {
  const m = ln.match(RE);
  if (m) events.push({ at: Date.parse(m[1]), final: m[2] === 'true', text: m[3] });
}
console.log('interviewer transcript events parsed:', events.length);
if (!events.length) {
  // fall back: looser parse
  const RE2 = /^(\S+Z) \[LOG\] \[DeepgramStreaming\] Transcript event/;
  let n = 0; for (const ln of lines) if (RE2.test(ln)) n++;
  console.log('loose match count:', n, '(regex needs fixing)');
  process.exit(0);
}

// --- CALIBRATION (rule 8): the parse must not silently drop events. ---
const looseCount = lines.filter(l => /\[DeepgramStreaming\] Transcript event/.test(l)).length;
console.log('CALIBRATION: loose count =', looseCount, ' parsed =', events.length,
  looseCount === events.length ? ' OK (no events dropped)' : ' MISMATCH -> parse is lossy');

// 1) How many events land in a sliding window of W ms?
function maxInWindow(W) {
  let best = 0, bestAt = 0, j = 0;
  for (let i = 0; i < events.length; i++) {
    while (events[j].at < events[i].at - W) j++;
    if (i - j + 1 > best) { best = i - j + 1; bestAt = events[i].at; }
  }
  return { best, bestAt };
}
for (const W of [15000, 20000, 34339, 45500, 60000]) {
  const { best, bestAt } = maxInWindow(W);
  console.log(`  window ${W} ms -> max ${best} events (at ${new Date(bestAt).toISOString()})`);
}

// 2) The real question: with a 40-entry buffer, how many SECONDS does the buffer span
//    at the moment each Live question was dispatched?
const liveRe = /^(\S+Z) \[LOG\] \[Main\] Live question \((verbal|coding|behavioral), mode=\w+\): "([\s\S]*)"$/;
const dispatches = [];
for (const ln of lines) {
  const m = ln.match(liveRe);
  if (m) dispatches.push({ at: Date.parse(m[1]), text: m[3] });
}
console.log('\nLive question dispatches:', dispatches.length);

const WORDS_PER_SEC = 2.24, LAG_MS = 8000, MIN = 15000, MAX = 60000;
const windowMs = (t) => Math.min(MAX, Math.max(MIN, Math.round(((t.match(/[A-Za-z0-9']+/g) || []).length / WORDS_PER_SEC) * 1000 + LAG_MS)));

let truncated = 0;
const rows = [];
for (const d of dispatches) {
  const W = windowMs(d.text);
  // events actually in the buffer at time d.at: last 40 pushed before d.at
  const before = [];
  for (const e of events) { if (e.at <= d.at) before.push(e); else break; }
  const buf = before.slice(-40);
  const bufSpanMs = buf.length ? d.at - buf[0].at : 0;
  // what the window ASKS for vs what the buffer can supply
  const wanted = before.filter(e => e.at >= d.at - W).length;
  const supplied = buf.filter(e => e.at >= d.at - W).length;
  const lost = wanted - supplied;
  if (lost > 0) truncated++;
  rows.push({ at: d.at, W, bufSpanMs, wanted, supplied, lost, text: d.text.slice(0, 55) });
}
console.log(`dispatches whose window was truncated by the 40-entry cap: ${truncated}/${dispatches.length}`);
console.log('\nworst offenders (most lines lost to the cap):');
rows.sort((a, b) => b.lost - a.lost);
for (const r of rows.slice(0, 12)) {
  console.log(`  W=${String(r.W).padStart(5)}ms bufferSpan=${String(r.bufSpanMs).padStart(5)}ms wanted=${String(r.wanted).padStart(3)} got=${String(r.supplied).padStart(3)} LOST=${String(r.lost).padStart(3)}  ${JSON.stringify(r.text)}`);
}

// 3) For the widened dispatches only (W > 15000), how bad is it?
const widened = rows.filter(r => r.W > MIN);
console.log(`\ndispatches whose window widened past the 15s floor: ${widened.length}`);
console.log(`  of those, truncated by the cap: ${widened.filter(r => r.lost > 0).length}`);
const spans = widened.map(r => r.bufSpanMs).sort((a, b) => a - b);
if (spans.length) {
  console.log(`  buffer span at dispatch (ms): min=${spans[0]} p50=${spans[Math.floor(spans.length / 2)]} max=${spans[spans.length - 1]}`);
}
