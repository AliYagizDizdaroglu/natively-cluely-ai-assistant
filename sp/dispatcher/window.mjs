// Read-only: print ONLY dispatcher / turn / detector / classify / Live-event / STT-final lines of a
// natively_debug.log inside a UTC time window. Never prints [Answer] lines or anything not allow-listed.
// usage: node window.mjs <log> <fromISO> <toISO> [--interims]
import fs from 'node:fs';
const [file, from, to, ...flags] = process.argv.slice(2);
const interims = flags.includes('--interims');
const lo = Date.parse(from), hi = Date.parse(to);
const ALLOW = [
  /\[Main\] dispatch:/,
  /\[Main\] turn:/,
  /\[QD-timing\]/,
  /\[GroqDetectionClient\]/,
  /\[QuestionDetector\]/,
  /\[Main\] Live question/,
  /\[Main\] Live Mode status/,
  /\[LiveCaption\] fragment/,
  /\[LiveRouter\]/,
  /\[Main\] answer source:/,
  /runWhatShouldISay: pinned/,
  /verbal hedge: won by/,
  /\[Engine-timing\] segment-final speaker=interviewer/,
  /\[Engine-timing\] segment-final speaker=user/,
  /\[DeepgramStreaming\] Transcript event — isFinal=true, text="[^"]/,
  /\[DeepgramStreaming\] (Connecting|Stale|Socket|closed|reconnect)/i,
  /boundary repair/,
  /\[Main\] follow-up parent/,
];
const DENY = [/\[Answer\]/, /budget:/, /suggested_answer/];
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
lines.forEach((l, i) => {
  const m = l.match(/^(\S+Z) /);
  if (!m) return;
  const t = Date.parse(m[1]);
  if (!(t >= lo && t <= hi)) return;
  if (DENY.some((r) => r.test(l))) return;
  const ok = ALLOW.some((r) => r.test(l)) || (interims && /\[DeepgramStreaming\] Transcript event — isFinal=false, text="[^"]/.test(l));
  if (!ok) return;
  console.log(`${String(i + 1).padStart(5)} ${l.replace(/ \[LOG\]/, '').slice(0, 260)}`);
});
