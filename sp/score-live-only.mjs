// Throwaway scorer for the LIVE-ONLY hour: per spoken item — Live detection,
// dispatch verdict, latency, caption accuracy vs the script (word error rate),
// plus reconnects, gap replays, inventions and Live token usage.
// usage: node score-live-only.mjs <run-folder-with natively_debug.log + interview60.timeline.json>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const items = tl.items.filter((i) => i.kind === 'spoken').map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round(i.clipSecs * 1000) }));
const cues = tl.items.filter((i) => i.kind !== 'spoken');
const ts = (s) => Date.parse(s);
const lines = (re) => [...dbg.matchAll(re)];

const liveQ = lines(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=(\w+)\): "([^"]*)"/gm).map((m) => ({ at: ts(m[1]), heard: m[4] }));
const finals = lines(/^(\S+) \[LOG\] \[LiveCaption\] final: (".*")$/gm).map((m) => ({ at: ts(m[1]), text: JSON.parse(m[2]) }));
const dispatches = lines(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?/gm)
  .map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse(`"${m[4]}"`), verdict: m[5] }));
const recon = lines(/^(\S+) \[WARN\] \[LiveRouter\] reconnecting \(attempt (\d)\/3\) in \d+ms — (.*)$/gm).map((m) => ({ at: ts(m[1]), attempt: +m[2], reason: m[3].trim() }));
const closes = lines(/^(\S+) \[LOG\] \[LiveRouter\] ws closed code=(\S+) reason=(".*")$/gm).map((m) => ({ at: ts(m[1]), code: m[2], reason: JSON.parse(m[3]) }));
const replays = lines(/replaying (\d+) buffered gap chunk/gm).map((m) => +m[1]);
const usage = lines(/\[LiveRouter\] usage prompt=(\S+) response=(\S+) total=(\S+)/gm).map((m) => ({ prompt: +m[1], response: +m[2], total: +m[3] }));
const goAways = lines(/\[LiveRouter\] goAway timeLeft=(\S+)/gm).map((m) => m[1]);
const failures = (dbg.match(/\[WhatToAnswerLLM\] Stream failed/g) ?? []).length;
const groq = (dbg.match(/GroqDetectionClient\] detect issued/g) ?? []).length;
const stt = (dbg.match(/\[RestSTT\] Transcript|\[DeepgramStreaming\] Transcript/g) ?? []).length;

const STOP = new Set(['what', 'when', 'where', 'which', 'would', 'could', 'should', 'this', 'that', 'with', 'from', 'your', 'about', 'have', 'does', 'into', 'than', 'them', 'they', 'were', 'will', 'been', 'there', 'their', 'some', 'more', 'most', 'also', 'just', 'like', 'over', 'make', 'used', 'using', 'each', 'many', 'much', 'very', 'tell', 'walk', 'through', 'give', 'explain', 'describe']);
const cw = (s) => (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3 && !STOP.has(w));
const overlap = (a, b) => { const A = new Set(cw(a)), B = new Set(cw(b)); if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return Math.max(n / A.size, n / B.size); };
const toks = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
function wer(ref, hyp) {
  const r = toks(ref), h = toks(hyp);
  const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return r.length ? d[r.length][h.length] / r.length : 0;
}
const p = (arr, q) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const secs = (v) => (v == null ? 'n/a' : `${(v / 1000).toFixed(1)}s`);

// Claim Live detections and dispatches to items (window + best overlap ≥ 0.25).
const claim = (dets, key) => {
  const by = new Map(items.map((i) => [i.id, []])); const un = [];
  for (const d of dets) {
    let best = null, bo = 0;
    for (const it of items) {
      if (d.at < it.playedAt - 2000 || d.at > it.spokeEnd + 60000) continue;
      const ov = overlap(d[key], it.q);
      if (ov > bo || (ov === bo && best && it.playedAt > best.playedAt && it.playedAt <= d.at)) { best = it; bo = ov; }
    }
    if (best && bo >= 0.25) by.get(best.id).push({ ...d, ov: bo }); else un.push(d);
  }
  return { by, un };
};
const L = claim(liveQ, 'heard');
const D = claim(dispatches, 'anchor');

// Caption accuracy: finals whose time falls in [playedAt-1s, spokeEnd+8s], joined.
const rows = items.map((it) => {
  const caps = finals.filter((f) => f.at >= it.playedAt - 1000 && f.at <= it.spokeEnd + 8000).map((f) => f.text).join(' ');
  const det = L.by.get(it.id); const disp = D.by.get(it.id);
  const ans = disp.find((d) => d.action === 'answer');
  const liveLat = det.length ? Math.min(...det.map((d) => d.at)) - it.spokeEnd : null;
  const capLat = finals.filter((f) => f.at >= it.playedAt && f.at <= it.spokeEnd + 8000).map((f) => f.at - it.spokeEnd);
  return { id: it.id, q: it.q, heard: det.length > 0, answered: !!ans, verdict: ans?.verdict ?? disp[0]?.verdict ?? null, liveLat, capLat: capLat.length ? Math.min(...capLat) : null, caps, wer: caps ? wer(it.q, caps) : null, drift: det.length ? Math.min(...det.map((d) => d.ov)) : null };
});

const heard = rows.filter((r) => r.heard);
const answered = rows.filter((r) => r.answered);
const werVals = rows.filter((r) => r.wer != null).map((r) => r.wer);
const verdicts = {}; for (const r of answered) verdicts[r.verdict] = (verdicts[r.verdict] ?? 0) + 1;
const reasons = {}; for (const r of recon.filter((r) => r.attempt === 1)) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
const gaps = recon.filter((r) => r.attempt === 1).map((r, i, a) => (i ? (r.at - a[i - 1].at) / 1000 : null)).filter(Boolean);
const inGap = (it) => recon.some((r) => r.at >= it.playedAt - 5000 && r.at <= it.spokeEnd + 5000);
const unclaimedReal = L.un.filter((d) => !cues.some((c) => overlap(d.heard, c.q) >= 0.25));

console.log(`=== LIVE-ONLY hour: ${path.basename(dir)}  spoken ${items.length}, cues ${cues.length}, ${tl.startedAt} → ${tl.endedAt}`);
console.log(`Heard by Live       : ${heard.length}/${items.length}   missed: ${rows.filter((r) => !r.heard).map((r) => r.id + (inGap(items.find((i) => i.id === r.id)) ? '(reconnect gap)' : '')).join(', ') || '(none)'}`);
console.log(`Answered hands-free : ${answered.length}/${items.length}   stream failures ${failures}   verdicts ${JSON.stringify(verdicts)}   dispatch lines unclaimed ${D.un.length}`);
console.log(`Live detect latency : p50 ${secs(p(heard.map((r) => r.liveLat), 0.5))}  p90 ${secs(p(heard.map((r) => r.liveLat), 0.9))}  max ${secs(p(heard.map((r) => r.liveLat), 1))}`);
console.log(`Caption final lag   : p50 ${secs(p(rows.filter((r) => r.capLat != null).map((r) => r.capLat), 0.5))}  p90 ${secs(p(rows.filter((r) => r.capLat != null).map((r) => r.capLat), 0.9))}   items with a caption ${rows.filter((r) => r.caps).length}/${items.length}`);
console.log(`Caption accuracy    : WER median ${werVals.length ? (p(werVals, 0.5) * 100).toFixed(0) + '%' : 'n/a'}  p90 ${werVals.length ? (p(werVals, 0.9) * 100).toFixed(0) + '%' : 'n/a'}  items with WER > 20%: ${rows.filter((r) => r.wer != null && r.wer > 0.2).map((r) => r.id).join(', ') || '(none)'}`);
console.log(`Paraphrase drift    : Live text overlap < 0.5 on ${rows.filter((r) => r.drift != null && r.drift < 0.5).map((r) => r.id).join(', ') || '(none)'}`);
console.log(`Inventions          : ${unclaimedReal.length} Live detections matching no item and no cue${unclaimedReal.length ? ':\n  ' + unclaimedReal.map((d) => `${new Date(d.at).toISOString().slice(11, 19)} "${d.heard}"`).join('\n  ') : ''}`);
console.log(`Reconnects          : ${JSON.stringify(reasons)}  median gap ${gaps.length ? p(gaps, 0.5).toFixed(0) + 's' : 'n/a'}  goAway ${goAways.length}  ws-closes ${closes.length} ${closes.length ? '(codes ' + [...new Set(closes.map((c) => c.code))].join(',') + ')' : ''}  gap replays ${replays.length} (max ${replays.length ? Math.max(...replays) : 0} chunks)`);
console.log(`Live usage          : ${usage.length} samples; last total=${usage.length ? usage[usage.length - 1].total : 'n/a'}  max total=${usage.length ? Math.max(...usage.map((u) => u.total)) : 'n/a'}`);
console.log(`Vendors              : Groq detect calls ${groq}, STT transcript lines ${stt}`);
console.log('\nPer item (id heard answered verdict liveLat capLag WER caption):');
for (const r of rows) console.log(`  ${r.id.padEnd(4)} ${r.heard ? 'H' : '-'} ${r.answered ? 'A' : '-'} ${(r.verdict ?? '-').padEnd(12)} ${secs(r.liveLat).padStart(6)} ${secs(r.capLat).padStart(6)} ${r.wer == null ? '   n/a' : (r.wer * 100).toFixed(0).padStart(4) + '%'}  ${r.caps.slice(0, 70)}`);
