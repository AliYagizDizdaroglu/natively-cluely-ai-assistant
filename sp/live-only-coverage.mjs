// Throwaway spike script: what would Live ALONE have heard in the recorded runs?
// Reads each run folder's natively_debug.log + interview60.timeline.json.
// Claim rule (mirrors the harness): a Live detection belongs to the spoken item
// whose window [playedAt-2s, spokeEnd+60s] contains it and whose content-word
// overlap is highest (>= 0.25); otherwise it is "unclaimed" (invented / noise).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const runs = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, 'interview60.timeline.json')));

const STOP = new Set(['what', 'when', 'where', 'which', 'would', 'could', 'should', 'this', 'that', 'with', 'from', 'your', 'about', 'have', 'does', 'into', 'than', 'them', 'they', 'were', 'will', 'been', 'there', 'their', 'some', 'more', 'most', 'also', 'just', 'like', 'over', 'make', 'used', 'using', 'each', 'many', 'much', 'very', 'tell', 'walk', 'through', 'give', 'explain', 'describe']);
const words = (s) => (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3 && !STOP.has(w));
const overlap = (a, b) => {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return Math.max(n / A.size, n / B.size);
};
const ts = (s) => Date.parse(s);
const pct = (v) => (v == null ? 'n/a' : `${(v / 1000).toFixed(1)}s`);
const p = (arr, q) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

for (const run of runs) {
  const dir = path.join(ROOT, run);
  const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
  const items = tl.items.filter((i) => i.kind === 'spoken').map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round(i.clipSecs * 1000) }));

  // Raw Live detections (before dedup/hold) — this is what the ear produced.
  const liveQ = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=(\w+)\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), heard: m[4] }));
  // Whisper (STT→Groq) chips for comparison.
  const wq = [...dbg.matchAll(/^(\S+) \[LOG\] \[QuestionDetector\] chip emitted: intent=\w+ confidence=[\d.]+ q="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), heard: m[2] }));
  // Reconnects and their reasons; gap replays and their sizes.
  const recon = [...dbg.matchAll(/^(\S+) \[WARN\] \[LiveRouter\] reconnecting \(attempt (\d)\/3\) in \d+ms — (.*)$/gm)].map((m) => ({ at: ts(m[1]), attempt: +m[2], reason: m[3].trim() }));
  const replays = [...dbg.matchAll(/^(\S+) \[LOG\] \[LiveRouter\] replaying (\d+) buffered gap chunk\(s\)/gm)].map((m) => ({ at: ts(m[1]), chunks: +m[2] }));
  const failed = (dbg.match(/\[LiveRouter\] 3 quick attempts failed/g) ?? []).length;
  const fragments = (dbg.match(/\[LiveRouter\] ignored fragment/g) ?? []).length;

  const claim = (dets) => {
    const byItem = new Map(items.map((i) => [i.id, []]));
    const unclaimed = [];
    for (const d of dets) {
      let best = null, bestOv = 0;
      for (const it of items) {
        if (d.at < it.playedAt - 2000 || d.at > it.spokeEnd + 60000) continue;
        const ov = overlap(d.heard, it.q);
        if (ov > bestOv || (ov === bestOv && best && it.playedAt > best.playedAt && it.playedAt <= d.at)) { best = it; bestOv = ov; }
      }
      if (best && bestOv >= 0.25) byItem.get(best.id).push({ ...d, ov: bestOv, lat: d.at - best.spokeEnd });
      else unclaimed.push(d);
    }
    return { byItem, unclaimed };
  };
  const L = claim(liveQ), W = claim(wq);
  const liveHeard = items.filter((i) => L.byItem.get(i.id).length);
  const wHeard = items.filter((i) => W.byItem.get(i.id).length);
  const liveMissed = items.filter((i) => !L.byItem.get(i.id).length);
  const neither = liveMissed.filter((i) => !W.byItem.get(i.id).length);
  const liveLat = liveHeard.map((i) => Math.min(...L.byItem.get(i.id).map((d) => d.lat)));
  const wLat = wHeard.map((i) => Math.min(...W.byItem.get(i.id).map((d) => d.lat)));
  // Did a Live miss fall inside a reconnect gap (reconnect line within [spokeStart-5s, spokeEnd+5s])?
  const inGap = (it) => recon.some((r) => r.at >= it.playedAt - 5000 && r.at <= it.spokeEnd + 5000);
  const reasons = {};
  for (const r of recon.filter((r) => r.attempt === 1)) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  const gaps = recon.filter((r) => r.attempt === 1).map((r, i, a) => (i ? (r.at - a[i - 1].at) / 1000 : null)).filter(Boolean);

  console.log(`\n=== ${run} ===  spoken items: ${items.length}`);
  console.log(`Live alone heard   : ${liveHeard.length}/${items.length}   raw Live detections: ${liveQ.length}  unclaimed (invented/noise/paraphrase<0.25): ${L.unclaimed.length}  fragments ignored by router: ${fragments}`);
  console.log(`Whisper alone heard: ${wHeard.length}/${items.length}   raw chips: ${wq.length}  unclaimed: ${W.unclaimed.length}`);
  console.log(`Heard by neither   : ${neither.length}  [${neither.map((i) => i.id).join(', ')}]`);
  console.log(`Live missed        : ${liveMissed.map((i) => `${i.id}${inGap(i) ? '(reconnect gap)' : ''}`).join(', ') || '(none)'}`);
  console.log(`Live latency (detection − end of question): p50 ${pct(p(liveLat, 0.5))}  p90 ${pct(p(liveLat, 0.9))}  max ${pct(p(liveLat, 1))}   | whisper p50 ${pct(p(wLat, 0.5))} p90 ${pct(p(wLat, 0.9))}`);
  console.log(`Reconnects (attempt 1): ${Object.keys(reasons).length ? JSON.stringify(reasons) : 'none'}  median gap between reconnects ${gaps.length ? p(gaps, 0.5).toFixed(0) + 's' : 'n/a'}  hard-failed: ${failed}`);
  console.log(`Gap replays: ${replays.length}  chunks p50 ${p(replays.map((r) => r.chunks), 0.5) ?? 'n/a'}  max ${p(replays.map((r) => r.chunks), 1) ?? 'n/a'}`);
  if (L.unclaimed.length) console.log(`Unclaimed Live texts:\n  ${L.unclaimed.map((d) => `${new Date(d.at).toISOString().slice(11, 19)} "${d.heard}"`).join('\n  ')}`);
  const lowOv = items.flatMap((i) => L.byItem.get(i.id).filter((d) => d.ov < 0.5).map((d) => `${i.id} ov=${d.ov.toFixed(2)} live="${d.heard}" | script="${i.q}"`));
  if (lowOv.length) console.log(`Paraphrase drift (overlap < 0.5):\n  ${lowOv.join('\n  ')}`);
}
