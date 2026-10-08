// Throwaway replay (read-only on the repo): the REAL interviewerTurn machine and the REAL ChipDeduper (copied into
// DS/src by copy-src.mjs, loaded with Node type stripping) fed a run's recorded events, exactly as
// interviewerTurn.replay.test.ts feeds them, PLUS the one input that test never feeds: the recorded verdict of each
// `turn: classify` the machine asks for (matched to the log's classify by time, delivered after the recorded latency,
// scoped to the turn id the replay's own classify decision carried — main.ts's R20 call).
// Detections for a new-app log are its `dispatch: mark` lines only (the mark block is where every detection lands in
// Auto); a Live mark feeds its full `question=` text (the `anchor=` field is cut at 80 chars).
// usage: node --experimental-strip-types replay.mjs <fixture.json> <natively_debug.log> [--trace <itemId>] [--no-verdicts]
import fs from 'node:fs';
import { createInterviewerTurn, DEFAULT_TURN_CONSTANTS } from './src/interviewerTurn.ts';
import { ChipDeduper } from './src/ChipDeduper.ts';

const [fxFile, logFile, ...rest] = process.argv.slice(2);
const traceId = rest.includes('--trace') ? rest[rest.indexOf('--trace') + 1] : null;
const noVerdicts = rest.includes('--no-verdicts');
const f = JSON.parse(fs.readFileSync(fxFile, 'utf8'));
const iso = (t) => new Date(t).toISOString().slice(11, 23);

// ---- recorded classifications from the log
const L = fs.readFileSync(logFile, 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
const T = (l) => Date.parse(l.slice(0, 24));
const recorded = [];
L.forEach((l, i) => {
  const m = l.match(/\[Main\] turn: classify finals=(\d+)/);
  if (!m) return;
  const askedAt = T(l);
  let issued = -1, j = i + 1;
  for (; j < L.length; j++) if (/\[QD-timing\] detect issued/.test(L[j])) { issued = j; break; }
  let res = null, resAt = null;
  for (j = issued + 1; issued >= 0 && j < L.length; j++) { const r = L[j].match(/\[QD-timing\] detect returned \+\d+ms result=(.*)$/); if (r) { res = r[1]; resAt = T(L[j]); break; } }
  // outcome as the machine saw it: a not-a-question close right after the result, else a question
  const closed = L.slice(j, j + 6).some((x) => /close reason=not-a-question/.test(x));
  recorded.push({ askedAt, finals: Number(m[1]), verdict: closed ? 'not-a-question' : 'question', latency: resAt ? resAt - askedAt : 400, res, used: false });
});

// ---- the replay (mirrors interviewerTurn.replay.test.ts's replay(), plus the verdict feed)
const c = DEFAULT_TURN_CONSTANTS;
const turn = createInterviewerTurn(c);
const events = [];
for (const it of f.items) for (const [on, off] of it.voice) { events.push({ at: on, order: 0, type: 'speech', on: true }); events.push({ at: off, order: 0, type: 'speech', on: false }); }
for (const x of f.finals) events.push({ at: x.at, order: 1, type: 'final', text: x.text });
// --old: the committed test's own feed (every fixture detection, text = anchor) — the calibration mode for the s50a/after9 fixtures
if (rest.includes('--old')) for (const x of f.detections) events.push({ at: x.at, order: 2, type: 'detected', source: x.source, text: x.text });
else for (const a of f.actual.filter((a) => a.action === 'mark')) events.push({ at: a.at, order: 2, type: 'detected', source: a.source, text: a.source === 'live' ? a.question : a.anchor });
events.sort((a, b) => a.at - b.at || a.order - b.order);
const out = [];
let clock = events[0]?.at ?? 0;
const dedup = new ChipDeduper({ now: () => clock });
let answeredId, drops = 0; const dropped = [];
const unmatched = [];
const pushEvent = (e) => { let k = events.length; while (k > 0 && (events[k - 1].at > e.at || (events[k - 1].at === e.at && events[k - 1].order > e.order))) k--; events.splice(k, 0, e); };
let idx = 0;
const settle = () => {
  for (let g = 0; g < 8; g++) {
    const d = turn.tick(clock);
    if (d.kind === 'idle' || d.kind === 'hold') break;
    if (d.kind === 'classify') {
      out.push({ at: clock, d });
      if (noVerdicts) continue;
      let best = null;
      for (const r of recorded) if (!r.used && Math.abs(r.askedAt - clock) <= 2500 && (!best || Math.abs(r.askedAt - clock) < Math.abs(best.askedAt - clock))) best = r;
      if (!best) { unmatched.push(clock); continue; }
      best.used = true;
      out.push({ at: clock, d: { kind: 'matched', note: `replay classify ${iso(clock)} f=${d.finals} <- log classify ${iso(best.askedAt)} f=${best.finals} verdict=${best.verdict} due ${iso(clock + best.latency)}` } });
      pushEvent({ at: clock + best.latency, order: 3, type: 'verdict', verdict: best.verdict, turn: d.turn });
      continue;
    }
    if (d.kind === 'dispatch') {
      const r = dedup.admit({ question: d.text, source: d.fromLive ? 'live' : 'whisper' });
      if (r.admitted) { dedup.markAnswered(r.id); answeredId = r.id; out.push({ at: clock, d }); }
      else { answeredId = undefined; drops++; dropped.push({ at: clock, text: d.text, age: r.duplicateAgeMs }); }
      continue;
    }
    if (d.kind === 'supersede') { dedup.extend(answeredId, d.text); out.push({ at: clock, d }); continue; }
    out.push({ at: clock, d });
  }
};
const runTimers = (until) => { for (let guard = 0; guard < 200; guard++) { const t = turn.nextTimerAt(clock); if (t === null || t > until) return; clock = t; settle(); } };
// One step at a time: a timer due at or before the next event runs first, and because a classify decided at that
// timer can insert its verdict ahead of the pending event, the pending event is re-read after every timer.
for (let guard = 0; idx < events.length && guard < 1_000_000; guard++) {
  const e = events[idx];
  const t = turn.nextTimerAt(clock);
  if (t !== null && t <= e.at) { clock = t; settle(); continue; }
  idx++;
  clock = e.at;
  if (e.type === 'speech') turn.speech(e.on, e.at);
  else if (e.type === 'final') turn.final(e.text, e.at);
  else if (e.type === 'verdict') turn.detected('whisper', e.at, e.verdict, e.turn);
  else { if (e.source === 'live') turn.liveClaim(e.text, e.at); turn.detected(e.source, e.at); }
  settle();
}
runTimers(clock + 60_000);

// ---- score like the test does
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'be', 'that', 'this', 'it', 'as', 'at', 'by', 'from', 'your', 'you', 'we', 'our', 'my', 'i', 'would', 'how', 'what', 'which', 'when', 'where', 'why', 'do', 'does', 'can', 'could', 'should']);
const words = (s) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
const content = (s) => new Set(words(s).filter((w) => w.length >= 3 && !STOP.has(w)));
const coverage = (script, text) => { const a = content(script), b = content(text); let hit = 0; for (const w of a) if (b.has(w)) hit++; return a.size ? hit / a.size : 1; };
const windowOf = (k) => { const it = f.items[k]; return [it.playedAt - 2000, (f.items[k + 1]?.playedAt ?? it.playedAt + it.clipSecs * 1000 + 90_000) - 2000]; };
const rows = f.items.map((it, k) => {
  const [from, to] = windowOf(k);
  const mine = out.filter((o) => o.at >= from && o.at < to);
  const disp = mine.filter((o) => o.d.kind === 'dispatch');
  const voiceOff = it.voice.length ? it.voice[it.voice.length - 1][1] : it.playedAt + it.clipSecs * 1000;
  const last = [...mine].reverse().find((o) => o.d.kind === 'dispatch' || o.d.kind === 'supersede');
  return { id: it.id, long: !!it.long, n: disp.length, early: disp.some((o) => o.at < voiceOff), lat: disp.length ? disp[0].at - voiceOff : null, fromLive: disp[0]?.d.fromLive ?? null, finals: disp[0]?.d.finals ?? null, cov: coverage(it.q, last && 'text' in last.d ? last.d.text : ''), closes: mine.filter((o) => o.d.kind === 'close').map((o) => o.d.reason) };
});
const once = rows.filter((r) => r.n === 1).length, doubles = rows.filter((r) => r.n > 1), never = rows.filter((r) => r.n === 0);
const lat = rows.map((r) => r.lat).filter((x) => x !== null).sort((a, b) => a - b);
console.log(`${f.run}: ${once}/${rows.length} once, doubles [${doubles.map((r) => `${r.id}:${r.n}`).join(' ')}], never [${never.map((r) => r.id).join(' ')}], early [${rows.filter((r) => r.early).map((r) => r.id).join(' ')}], long-whole ${rows.filter((r) => r.long && r.cov >= 0.8).length}/${rows.filter((r) => r.long).length}, median ${lat[Math.floor(lat.length / 2)]} ms, max ${lat[lat.length - 1]} ms, drops ${drops}${noVerdicts ? ' (NO verdicts fed)' : ''}`);
console.log(`classify decisions ${out.filter((o) => o.d.kind === 'classify').length}, recorded ${recorded.length}, matched ${recorded.filter((r) => r.used).length}, unmatched replay classifies ${unmatched.length}${unmatched.length ? ' @ ' + unmatched.map(iso).join(',') : ''}`);
for (const r of rows.filter((r) => r.n !== 1 || r.lat > 5000 || r.fromLive || r.closes.includes('not-a-question') || r.closes.includes('nothing-heard'))) console.log(`  ${r.id.padEnd(7)} dispatches=${r.n} firstLatency=${r.lat} ms fromLive=${r.fromLive} finals=${r.finals} cov=${r.cov.toFixed(2)} closes=[${r.closes.join(',')}]`);
if (traceId) {
  const k = f.items.findIndex((i) => i.id === traceId); const [from, to] = windowOf(k);
  const it = f.items[k]; const voiceOff = it.voice[it.voice.length - 1][1];
  console.log(`trace ${traceId}: played ${iso(it.playedAt)}, voice off ${iso(voiceOff)}`);
  for (const o of out.filter((o) => o.at >= from && o.at < to)) console.log(`  ${iso(o.at)} ${o.d.kind}${o.d.note ? ' ' + o.d.note : ''}${o.d.reason ? ' ' + o.d.reason : ''}${o.d.kind === 'classify' ? ` finals=${o.d.finals} turn=${o.d.turn}` : ''}${o.d.kind === 'dispatch' ? ` finals=${o.d.finals} live=${o.d.live.length} fromLive=${o.d.fromLive} text=${JSON.stringify(o.d.text.slice(0, 60))}` : ''}`);
  for (const x of dropped.filter((x) => x.at >= from && x.at < to)) console.log(`  ${iso(x.at)} (dedup drop, age ${x.age} ms) ${JSON.stringify(x.text.slice(0, 60))}`);
}
