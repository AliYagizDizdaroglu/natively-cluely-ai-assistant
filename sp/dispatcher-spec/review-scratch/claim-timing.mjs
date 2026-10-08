// REVIEW THROWAWAY (read-only): for a few named Live claims, which clip was playing/just ended when the claim arrived,
// the claim's lag from each candidate clip's end, and how many interviewer finals had arrived since that clip started.
import fs from 'node:fs';
import path from 'node:path';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const CASES = [['2026-09-14T08-22-28-s50e', '07:49:52'], ['2026-09-16T08-42-43-s50g', '08:09:57'], ['2026-09-08T08-44-56-after9', '07:18:36'], ['2026-09-30T11-45-30-br1', '11:22:15']];
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 23);
for (const [run, hhmmss] of CASES) {
  const dir = `${R}/${run}`;
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
  const OFF = tl.clock === 'playsync' ? 0 : 1150;
  const items = tl.items.map((i) => ({ id: i.id, from: tl.startedMs + OFF + i.startSec * 1000, end: tl.startedMs + OFF + (i.startSec + i.clipSecs) * 1000 }));
  const L = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  const day = new Date(items[0].from).toISOString().slice(0, 10);
  const lo = Date.parse(`${day}T${hhmmss}Z`);
  const claim = L.find((l) => T(l) >= lo && T(l) < lo + 1000 && /\[Main\] Live question/.test(l));
  if (!claim) { console.log(run, 'no claim'); continue; }
  const at = T(claim);
  const recent = items.filter((it) => it.from <= at).slice(-2);
  const finals = L.filter((l) => /\[Engine-timing\] segment-final speaker=interviewer/.test(l)).map(T);
  console.log(`${run.slice(-5)} claim ${iso(at)}: ${recent.map((it) => `${it.id} clip ${iso(it.from)}-${iso(it.end)} (claim ${((at - it.end) / 1000).toFixed(1)} s after its end; finals since its start before the claim: ${finals.filter((f) => f >= it.from && f < at).length})`).join(' | ')}`);
}
