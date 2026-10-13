// D2 measurement: Deepgram finals whose words were first heard (first non-empty interim)
// before a `turn: close` but finalized after it, and finals whose onset lies in an earlier
// item's play window than the one playing at the final. Prints ids, counts, timings only.
import fs from 'node:fs';
import path from 'node:path';
const roots = process.argv.slice(2);
const OFFSET = 1150; // timeline startedMs ~1.15 s early (memory: interview60 harness)
const T = (s) => Date.parse(s.slice(0, 24));
const rows = []; const lags = [];
let nFinals = 0, nLogs = 0;
for (const root of roots) for (const run of fs.readdirSync(root)) {
  const dir = path.join(root, run);
  const log = path.join(dir, 'natively_debug.log'), tl = path.join(dir, 'interview60.timeline.json');
  if (!fs.existsSync(log) || !fs.existsSync(tl)) continue;
  let items; try { items = JSON.parse(fs.readFileSync(tl, 'utf8')).items.filter((i) => i.playedAt).map((i) => ({ id: i.id, at: i.playedAt + OFFSET, end: i.playedAt + OFFSET + (i.clipSecs ?? 0) * 1000 })).sort((a, b) => a.at - b.at); } catch { continue; }
  const itemAt = (t) => { let r = null; for (const i of items) if (i.at <= t) r = i; else break; return r; };
  const lines = fs.readFileSync(log, 'utf8').split('\n');
  if (!lines.some((l) => l.includes('Transcript event'))) continue;
  nLogs++;
  let onset = null, lastClose = null, lastCloseReason = null, lastAnswerAt = null, pending = null;
  for (const l of lines) {
    if (!/^\d{4}-/.test(l)) continue;
    const t = T(l);
    let m = l.match(/Transcript event — isFinal=(\w+), text=(.*)$/);
    if (m) {
      const words = m[2].replace(/^"|"$/g, '').replace(/^\(empty\)$/, '').trim();
      const n = words ? words.split(/\s+/).length : 0;
      if (m[1] === 'false') { if (n > 0 && onset === null) onset = t; continue; }
      if (n > 0) {
        nFinals++;
        const o = onset ?? t; lags.push(t - o);
        const io = itemAt(o - 0), iF = itemAt(t);
        const straddle = lastClose !== null && o < lastClose && lastClose < t;
        const crossItem = io && iF && io.id !== iF.id;
        if (straddle || crossItem) pending = { run, at: l.slice(11, 23), words: n, lagMs: t - o, onsetItem: io?.id, finalItem: iF?.id, straddle, closeReason: straddle ? lastCloseReason : '-', closeBeforeFinalMs: straddle ? t - lastClose : null, prevAnsweredAgoMs: lastAnswerAt ? t - lastAnswerAt : null, nextGate: null };
        if (straddle || crossItem) rows.push(pending); else pending = null;
      }
      onset = null; continue;
    }
    m = l.match(/turn: close reason=(\S+)/);
    if (m) { lastClose = t; lastCloseReason = m[1]; continue; }
    m = l.match(/turn: gate=\d+ finals=(\d+) live=(\d+)/);
    if (m && pending && pending.nextGate === null && t - T(pending.run ? l : l) >= 0) { pending.nextGate = `finals=${m[1]} live=${m[2]}`; pending = null; continue; }
    if (/dispatch: answer /.test(l)) lastAnswerAt = t;
  }
}
lags.sort((a, b) => a - b);
const q = (p) => lags[Math.min(lags.length - 1, Math.floor(p * lags.length))];
console.log(`logs=${nLogs} finals=${nFinals} onset->final lag ms p50=${q(0.5)} p90=${q(0.9)} p99=${q(0.99)} max=${lags.at(-1)} >5s=${lags.filter((x) => x > 5000).length} >10s=${lags.filter((x) => x > 10000).length}`);
console.log(`flagged=${rows.length} straddle=${rows.filter((r) => r.straddle).length} crossItem=${rows.filter((r) => r.onsetItem !== r.finalItem).length} both=${rows.filter((r) => r.straddle && r.onsetItem !== r.finalItem).length}`);
for (const r of rows) console.log(JSON.stringify(r));
