// Throwaway: reconstruct every answer streamed during a run from verbal-diag.log
// (raw model chunks per stream) and grade it: words, TTFT, filter interventions,
// bad-answer signatures. Pairs each stream with the dispatch that triggered it.
// usage: node grade-answers.mjs <run folder> [--show N]
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const show = Number((process.argv.find((a) => a.startsWith('--show=')) ?? '--show=6').split('=')[1]);
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const t0 = Date.parse(tl.startedAt) - 120_000, t1 = Date.parse(tl.endedAt ?? new Date().toISOString()) + 60_000;
const diag = fs.readFileSync(path.join(dir, 'verbal-diag.log'), 'utf8').split(/\r?\n/);
const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');

const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: answer source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)/gm)]
  .map((m) => ({ at: Date.parse(m[1]), source: m[2], anchor: JSON.parse(`"${m[3]}"`), verdict: m[4] }));
const items = tl.items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round(i.clipSecs * 1000) }));
const STOP = new Set(['what', 'when', 'where', 'which', 'would', 'could', 'should', 'this', 'that', 'with', 'from', 'your', 'about', 'have', 'does', 'into', 'than', 'them', 'they', 'were', 'will', 'been', 'there', 'their', 'some', 'more', 'most', 'also', 'just', 'like', 'over', 'make', 'used', 'using', 'each', 'many', 'much', 'very', 'tell', 'walk', 'through', 'give', 'explain', 'describe']);
const cw = (s) => (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3 && !STOP.has(w));
const overlap = (a, b) => { const A = new Set(cw(a)), B = new Set(cw(b)); if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return Math.max(n / A.size, n / B.size); };

// Streams: from "filterVerbalLines started" to the next one; chunks carry the raw text.
const streams = [];
let cur = null;
for (const line of diag) {
  const m = line.match(/^\[([^\]]+)\] (.*)$/);
  if (!m) continue;
  const at = Date.parse(m[1]); const body = m[2];
  if (at < t0 || at > t1) continue;
  if (body.startsWith('>>> filterVerbalLines started')) { cur = { at, chunks: [], rewrites: 0, drops: [], ttft: null }; streams.push(cur); continue; }
  if (!cur) continue;
  const c = body.match(/^ {2}chunk #\d+: "(.*)" \(lineBuffer pre:/);
  if (c) { cur.chunks.push(c[1]); continue; }
  if (/^rewrite( \(streaming\))?: "/.test(body)) cur.rewrites++;
  const d = body.match(/^HARD_DROP( \(streaming\))?: "(.*)"$/);
  if (d) cur.drops.push(d[2].slice(0, 40));
  const f = body.match(/^first token (\d+)ms/);
  if (f) cur.ttft = +f[1];
}
const unescape = (s) => s.replace(/\\n/g, '\n').replace(/\\"/g, '"');
const answers = streams.filter((s) => s.chunks.length).map((s) => {
  const text = unescape(s.chunks.join('')).replace(/\s+/g, ' ').trim();
  const disp = dispatches.filter((d) => d.at <= s.at + 500 && s.at - d.at < 20_000).sort((a, b) => b.at - a.at)[0] ?? null;
  const item = disp ? items.filter((i) => disp.at >= i.playedAt - 2000 && disp.at <= i.spokeEnd + 60000).sort((a, b) => overlap(disp.anchor, b.q) - overlap(disp.anchor, a.q))[0] ?? null : null;
  const words = text.split(/\s+/).filter(Boolean).length;
  const flags = [];
  if (/\bas an ai\b|language model/i.test(text)) flags.push('as-an-AI');
  if (/could you (repeat|clarify)|didn'?t catch|not sure (what|which) (you|question)|can you repeat/i.test(text)) flags.push('ask-back');
  if (/would you like me|let me know if|do you want me to/i.test(text)) flags.push('offer-tail');
  if (/```|^\s*[-*] |\*\*/m.test(text)) flags.push('markdown');
  if (/\b(time|space)\s*(complexity)?\s*:\s*o\(/i.test(text)) flags.push('complexity-line');
  if (/^(sure|certainly|great question|absolutely)[,!.]/i.test(text)) flags.push('sycophant-opener');
  if (words > 70) flags.push('over-70');
  if (words < 25) flags.push('under-25');
  if (item && overlap(text, item.q) === 0) flags.push('no-topic-overlap');
  return { at: s.at, id: item?.id ?? '?', q: item?.q ?? disp?.anchor ?? '(no dispatch within 20 s)', source: disp?.source ?? '?', words, ttft: s.ttft, rewrites: s.rewrites, drops: s.drops, flags, text };
});

const p = (arr, q) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const W = answers.map((a) => a.words);
const T = answers.map((a) => a.ttft).filter((x) => x != null);
const flagCounts = {}; for (const a of answers) for (const f of a.flags) flagCounts[f] = (flagCounts[f] ?? 0) + 1;
const dropKinds = {}; for (const a of answers) for (const d of a.drops) { const k = d.replace(/[0-9]+/g, 'N').slice(0, 24); dropKinds[k] = (dropKinds[k] ?? 0) + 1; }
console.log(`=== ${path.basename(dir)}: ${answers.length} answer streams in the run window (dispatch-paired ${answers.filter((a) => a.id !== '?').length})`);
console.log(`words: median ${p(W, 0.5)}  p90 ${p(W, 0.9)}  max ${p(W, 1)}  over-70: ${W.filter((w) => w > 70).length}  under-25: ${W.filter((w) => w < 25).length}`);
console.log(`TTFT (diag first token): n ${T.length}  p50 ${p(T, 0.5)} ms  p90 ${p(T, 0.9)} ms`);
console.log(`filter interventions: rewrites ${answers.reduce((n, a) => n + a.rewrites, 0)} in ${answers.filter((a) => a.rewrites).length} answers; hard drops ${answers.reduce((n, a) => n + a.drops.length, 0)} in ${answers.filter((a) => a.drops.length).length} answers  kinds ${JSON.stringify(dropKinds)}`);
console.log(`flags: ${JSON.stringify(flagCounts)}`);
const dup = new Map(); for (const a of answers) { const k = a.text.slice(0, 60); dup.set(k, (dup.get(k) ?? 0) + 1); }
console.log(`duplicate answer openings (same first 60 chars): ${[...dup.values()].filter((n) => n > 1).length}`);
console.log(`\nSamples (${show}):`);
for (const a of answers.filter((x) => x.id !== '?').slice(0, show)) {
  console.log(`  ${a.id} [${a.source}] ${a.words}w ttft=${a.ttft ?? '?'}ms flags=${a.flags.join(',') || '-'}\n     Q: ${a.q.slice(0, 90)}\n     A: ${a.text.slice(0, 230)}`);
}
const flagged = answers.filter((a) => a.flags.some((f) => !['over-70', 'offer-tail', 'complexity-line'].includes(f)));
if (flagged.length) { console.log(`\nFlagged answers (${flagged.length}):`); for (const a of flagged.slice(0, 8)) console.log(`  ${a.id} ${a.flags.join(',')}: ${a.text.slice(0, 160)}`); }
