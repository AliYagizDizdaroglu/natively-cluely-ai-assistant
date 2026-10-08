// Read-only: for every `turn: close reason=not-a-question` in a run, print the item playing (by play window),
// the classify line and its detect result, and the allow-listed lines from -25 s to +95 s.
// Never prints [Answer] lines. usage: node closes.mjs <runDir> [--brief]
import fs from 'node:fs';
import path from 'node:path';
const [dir, ...flags] = process.argv.slice(2);
const brief = flags.includes('--brief');
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const OFF = tl.clock === 'playsync' ? 0 : 1150;
const items = tl.items.map((i) => ({ id: i.id, q: i.q, kind: i.kind ?? 'spoken', from: tl.startedMs + OFF + i.startSec * 1000, to: tl.startedMs + OFF + (i.startSec + i.clipSecs) * 1000 }));
const itemAt = (t) => { let best = null; for (const it of items) if (t >= it.from - 2000) best = it; return best; };
const lines = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split(/\r?\n/);
const ALLOW = [/\[Main\] dispatch: (mark|answer|drop|supersede|hold)/, /\[Main\] turn: (classify|close|gate=|detection-fallback)/, /\[QD-timing\] detect returned/, /\[QuestionDetector\] (chip|degraded|dropping)/, /\[GroqDetectionClient\] (HTTP|Rate|Detection timed|Request failed)/, /\[Main\] Live question/, /\[DeepgramStreaming\] Transcript event — isFinal=true, text="[^"]/, /\[Engine-timing\] segment-final speaker=user/, /\[LiveRouter\] replaying/, /reconnecting \(attempt/];
const DENY = [/\[Answer\]/, /budget:/];
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 23);
lines.forEach((l, i) => {
  if (!/close reason=not-a-question/.test(l)) return;
  const at = T(l);
  const it = itemAt(at);
  console.log(`\n=== ${path.basename(dir)} close @${iso(at)}  item=${it ? `${it.id} [${iso(it.from)}–${iso(it.to)}] ${JSON.stringify(it.q.slice(0, 90))}` : 'before roster'}`);
  const lo = at - 25000, hi = at + (brief ? 15000 : 95000);
  for (let j = 0; j < lines.length; j++) {
    const x = lines[j]; const t = T(x);
    if (!(t >= lo && t <= hi)) continue;
    if (DENY.some((r) => r.test(x))) continue;
    if (!ALLOW.some((r) => r.test(x))) continue;
    const who = itemAt(t);
    console.log(`  ${iso(t)} ${who ? who.id.padEnd(7) : '-'.padEnd(7)} ${x.slice(25).replace('[LOG] ', '').slice(0, 210)}`);
  }
});
