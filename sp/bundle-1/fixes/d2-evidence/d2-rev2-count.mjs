// D2 rev 2 census: which Deepgram finals would the rev-2 rule absorb?
// Rule: onset < lastClose < final  AND  the closed turn was ANSWERED (a `dispatch: answer` line
// after the close before it)  AND  no voice-on (Deepgram speech-started; VAD is not logged) between
// that answer and the close  AND  the final's text is the stalled interim's (last interim text
// change before the close). Prints ids, counts, timings only — never text.
import fs from 'node:fs';
import path from 'node:path';
const D1 = process.argv[2] === '--d1'; const roots = process.argv.slice(D1 ? 3 : 2);
// --d1: D1 approximation: a turn dispatch the log shows dropped (a `dispatch: drop` within 100 ms of a `turn: gate`) counts as answered.
const T = (s) => Date.parse(s.slice(0, 24));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
let nLogs = 0, nFinals = 0;
const tally = { straddle: 0, answered: 0, noVoice: 0, stable: 0 };
const hits = [];
for (const root of roots) for (const run of fs.readdirSync(root)) {
  const log = path.join(root, run, 'natively_debug.log');
  if (!fs.existsSync(log)) continue;
  const lines = fs.readFileSync(log, 'utf8').split('\n');
  if (!lines.some((l) => l.includes('Transcript event'))) continue;
  nLogs++;
  let onset = null, lastText = null, lastChangeAt = null;
  let prevClose = -Infinity, lastClose = null, lastCloseReason = null;
  let answers = [], voiceOns = [], lastGateAt = -Infinity;
  for (const l of lines) {
    if (!/^\d{4}-/.test(l)) continue;
    const t = T(l);
    let m = l.match(/Transcript event — isFinal=(\w+), text=(.*)$/);
    if (m) {
      const txt = norm(m[2].replace(/^"|"$/g, '').replace(/^\(empty\)$/, ''));
      if (m[1] === 'false') {
        if (txt) { if (onset === null) onset = t; if (txt !== lastText) { lastText = txt; lastChangeAt = t; } }
        continue;
      }
      if (txt) {
        nFinals++;
        const o = onset ?? t;
        if (lastClose !== null && o < lastClose && lastClose < t) {
          tally.straddle++;
          const ans = answers.filter((a) => a > prevClose && a <= lastClose);
          const answered = ans.length > 0;
          const voice = answered && voiceOns.some((v) => v > ans[ans.length - 1] && v <= lastClose);
          const changeAt = txt === lastText ? lastChangeAt : t;
          const stable = changeAt !== null && changeAt < lastClose;
          if (answered) tally.answered++;
          if (answered && !voice) tally.noVoice++;
          if (answered && !voice && stable) { tally.stable++; hits.push({ run, at: l.slice(11, 23), words: txt.split(' ').length, closeReason: lastCloseReason, onsetBeforeCloseMs: lastClose - o }); }
          else if (answered) hits.push({ run, at: l.slice(11, 23), rejectedBy: voice ? 'voice' : 'text-changed-after-close' });
        }
      }
      onset = null; lastText = null; lastChangeAt = null; continue;
    }
    m = l.match(/turn: close reason=(\S+)/);
    if (m) { prevClose = lastClose ?? -Infinity; lastClose = t; lastCloseReason = m[1]; continue; }
    if (/turn: gate=/.test(l)) { lastGateAt = t; continue; }
    if (/dispatch: answer /.test(l) || (D1 && /dispatch: drop /.test(l) && t - lastGateAt <= 100)) { answers.push(t); continue; }
    if (/turn: deepgram speech-started/.test(l)) voiceOns.push(t);
  }
}
console.log(`mode=${D1 ? 'd1' : 'logged'} logs=${nLogs} finals=${nFinals} straddle=${tally.straddle} +answered=${tally.answered} +noVoice=${tally.noVoice} +textStable(absorbed)=${tally.stable}`);
for (const h of hits) console.log(JSON.stringify(h));
