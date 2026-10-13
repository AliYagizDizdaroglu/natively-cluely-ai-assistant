// Print transcript-event timing and word counts only (no text) in a time window.
import fs from 'node:fs';
const [file, from, to] = process.argv.slice(2);
for (const x of fs.readFileSync(file, 'utf8').split('\n')) {
  const ts = x.slice(0, 24);
  if (ts < from || ts > to) continue;
  let m = x.match(/Transcript event — isFinal=(\w+), text=(.*)$/);
  if (m) { const t = m[2].replace(/^"|"$/g, '').trim(); console.log(ts, 'dg isFinal=' + m[1], 'words=' + (t ? t.split(/\s+/).length : 0)); continue; }
  m = x.match(/dispatch: (\w+) source=(\w+) anchor="([^"]*)".*verdict=(\w+)/);
  if (m) { console.log(ts, 'dispatch:' + m[1], m[2], 'anchorWords=' + m[3].trim().split(/\s+/).length, m[4]); continue; }
  m = x.match(/Live question \(\w+[^)]*\): "(.*)"$/);
  if (m) { console.log(ts, 'live question words=' + m[1].trim().split(/\s+/).length); continue; }
  if (/turn: |segment-final|utterance-end|speech-started/.test(x)) console.log(ts, x.slice(25).replace(/"[^"]*"/g, '<..>').slice(0, 120));
}
