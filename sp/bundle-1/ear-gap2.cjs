// throwaway (bundle-1 spec evidence, v2): the ear's caption latency anchored at the END of the interviewer's speech.
// For each Deepgram utterance-end U (with its preceding speech-started S), the first [LiveCaption] in [S, U+60 s]:
// delay = caption - U (negative = captioned before the utterance-end). Also W = the longest stretch of interviewer
// finals with no caption at all (first uncaptioned final -> next caption), the quantity a "first final + N" rule sees.
const fs = require('fs'), path = require('path');
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const D = [], Wall = []; let runs = 0, utt = 0, none = 0; const noneRows = [];
for (const d of fs.readdirSync(R)) {
  const f = path.join(R, d, 'natively_debug.log'); if (!fs.existsSync(f)) continue;
  const L = fs.readFileSync(f, 'utf8').split('\n'); const ev = [];
  for (const l of L) {
    const t = Date.parse(l.slice(0, 24)); if (isNaN(t)) continue;
    if (l.includes('[Main] turn: deepgram speech-started')) ev.push({ t, k: 'S' });
    else if (l.includes('[Main] turn: deepgram utterance-end')) ev.push({ t, k: 'U' });
    else if (l.includes('[Engine-timing] segment-final speaker=interviewer')) ev.push({ t, k: 'F' });
    else if (l.includes('[LiveCaption] fragment')) ev.push({ t, k: 'C' });
  }
  const caps = ev.filter((e) => e.k === 'C').map((e) => e.t);
  if (caps.length < 10) continue; runs++;
  let S = null;
  for (const e of ev) {
    if (e.k === 'S' && S === null) S = e.t;
    if (e.k === 'U' && S !== null) {
      utt++;
      const c = caps.find((x) => x >= S && x <= e.t + 60000);
      if (c === undefined) { none++; noneRows.push(`${d.slice(0, 30)}@${new Date(e.t).toISOString().slice(11, 19)} speech ${((e.t - S) / 1000).toFixed(1)}s`); }
      else D.push(c - e.t);
      S = null;
    }
  }
  // W: first final after the last caption -> the next caption
  let firstUncap = null;
  for (const e of ev) {
    if (e.k === 'F' && firstUncap === null) firstUncap = e.t;
    if (e.k === 'C') { if (firstUncap !== null) Wall.push({ w: e.t - firstUncap, d }); firstUncap = null; }
  }
}
const q = (s, p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
const s = D.sort((a, b) => a - b);
console.log('runs', runs, 'utterances', utt, 'no caption in [S, U+60s]', none);
console.log('delay caption-U ms: p50', q(s, .5), 'p90', q(s, .9), 'p99', q(s, .99), 'max', s[s.length - 1], '>3s', s.filter((x) => x > 3000).length, '>5s', s.filter((x) => x > 5000).length, '>8s', s.filter((x) => x > 8000).length, '>10s', s.filter((x) => x > 10000).length);
const w = Wall.map((x) => x.w).sort((a, b) => a - b);
console.log('W first-uncaptioned-final -> caption ms: n', w.length, 'p50', q(w, .5), 'p90', q(w, .9), 'p99', q(w, .99), 'max', w[w.length - 1]);
console.log('NO-CAPTION utterances (first 40):', noneRows.slice(0, 40).join(' | '));
