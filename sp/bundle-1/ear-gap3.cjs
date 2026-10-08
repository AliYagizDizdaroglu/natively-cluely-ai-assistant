// throwaway (bundle-1 spec evidence, v3): in HEALTHY runs, the longest stretch of consecutive Deepgram utterances with
// no [LiveCaption] in [S, U+10 s], counted only after the run's first caption (the ear is up). Reports, per run, the max
// consecutive count, the speech seconds summed over that stretch, and its wall span (first S -> last U + 10 s).
// A silent-ear rule "no caption for N s of wall time while Deepgram hears speech" must stay above the healthy max.
const fs = require('fs'), path = require('path');
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const GRACE = 10000;
const rows = []; let pooledUtt = 0, pooledMiss = 0;
for (const d of fs.readdirSync(R)) {
  const f = path.join(R, d, 'natively_debug.log'); if (!fs.existsSync(f)) continue;
  const L = fs.readFileSync(f, 'utf8').split('\n'); const ev = [];
  for (const l of L) {
    const t = Date.parse(l.slice(0, 24)); if (isNaN(t)) continue;
    if (l.includes('[Main] turn: deepgram speech-started')) ev.push({ t, k: 'S' });
    else if (l.includes('[Main] turn: deepgram utterance-end')) ev.push({ t, k: 'U' });
    else if (l.includes('[LiveCaption] fragment')) ev.push({ t, k: 'C' });
  }
  const caps = ev.filter((e) => e.k === 'C').map((e) => e.t);
  if (caps.length < 10) continue;
  const utts = []; let S = null;
  for (const e of ev) { if (e.k === 'S' && S === null) S = e.t; if (e.k === 'U' && S !== null) { if (S >= caps[0]) utts.push({ S, U: e.t }); S = null; } }
  let cur = [], best = { n: 0, speech: 0, span: 0 };
  // the wall time a "last caption -> now" clock reads while Deepgram hears uncaptioned speech: last caption before the stretch -> last U + GRACE
  let maxSilentWall = 0;
  for (const u of utts) {
    pooledUtt++;
    const has = caps.some((c) => c >= u.S - 2000 && c <= u.U + GRACE);
    if (!has) { pooledMiss++; cur.push(u); const speech = cur.reduce((a, x) => a + (x.U - x.S), 0); const span = u.U + GRACE - cur[0].S;
      if (cur.length > best.n || (cur.length === best.n && span > best.span)) best = { n: cur.length, speech, span }; }
    else cur = [];
  }
  // wall-clock gap between captions during which at least one utterance ended (speech heard), measured to that utterance's U
  for (let i = 0; i + 1 < caps.length; i++) {
    const a = caps[i], b = caps[i + 1];
    const inside = utts.filter((u) => u.S > a && u.U < b);
    if (inside.length) { const lastU = inside[inside.length - 1].U; maxSilentWall = Math.max(maxSilentWall, lastU - a); }
  }
  rows.push({ d: d.slice(0, 34), utts: utts.length, ...best, maxSilentWall });
}
for (const r of rows) console.log(r.d.padEnd(34), 'utts', String(r.utts).padStart(3), 'maxConsecUncaptioned', r.n, 'speech_s', (r.speech / 1000).toFixed(1), 'span_s', (r.span / 1000).toFixed(1), 'maxWall_lastCaption->U_s', (r.maxSilentWall / 1000).toFixed(1));
console.log('POOLED runs', rows.length, 'utterances', pooledUtt, 'uncaptioned', pooledMiss, 'max consecutive', Math.max(...rows.map((r) => r.n)), 'max span_s', (Math.max(...rows.map((r) => r.span)) / 1000).toFixed(1));
const w = rows.map((r) => r.maxSilentWall).sort((a, b) => a - b);
console.log('per-run max wall (last caption -> an uncaptioned U) s: sorted', w.map((x) => (x / 1000).toFixed(0)).join(','));
