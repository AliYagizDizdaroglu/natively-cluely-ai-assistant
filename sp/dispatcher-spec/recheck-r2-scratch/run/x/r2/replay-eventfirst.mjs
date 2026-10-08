// r2 THROWAWAY (read-only on the repo and the logs): replays a fixture through proto-r2.ts in the r2 spec's modes and
// reads its §7 rows off it. Built on the reviewer's replay-proto.mjs; R2 marks the differences. Question text only.
// usage: node --experimental-strip-types --no-warnings replay-r2.mjs <fixture.json> <natively_debug.log> <mode> [--trace ID] [--jitter MS] [--json] [--no-anchor]
//   mode: calib (memory off, recorded verdicts) | fix (on, recorded + detector substitution) | fixunk (on, recorded + unknown)
//         | control (revive on, echo off) | control2 (revive off, echo on)
import fs from 'node:fs';
import { createTurn, readsFinished, C } from './proto-r2.ts';
import { ChipDeduper } from '../../dispatcher/src/ChipDeduper.ts';

const [fxFile, logFile, mode, ...rest] = process.argv.slice(2);
const flag = (n) => rest.includes(n);
const argv = (n, d) => (flag(n) ? rest[rest.indexOf(n) + 1] : d);
const traceId = argv('--trace', null);
const JITTER = Number(argv('--jitter', 0)); // R2 (C1): the race window — a recorded event within it after a due timer is ordered by the LOG's own timer footprints
const withAnchor = !flag('--no-anchor'); // R2 (I5): the harness passes the dedup anchor as main.ts's turnDispatchInput does
const f = JSON.parse(fs.readFileSync(fxFile, 'utf8'));
const iso = (t) => new Date(t).toISOString().slice(11, 23);
const L = fs.readFileSync(logFile, 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
const T = (l) => Date.parse(l.slice(0, 24));
const since = f.items[0].playedAt - 120000;

// ---- detector calls: every issued/returned pair (the reviewer's reading of the result line)
const calls = [];
L.forEach((l, i) => {
  if (!/\[QD-timing\] detect issued/.test(l)) return;
  for (let j = i + 1; j < L.length; j++) {
    const r = L[j].match(/\[QD-timing\] detect returned \+(\d+)ms result=(.*)$/);
    if (r) {
      const res = r[2]; let v;
      if (res === 'null') v = 'unknown';
      else { const d = /detected=true/.test(res); const conf = Number((res.match(/conf=([\d.]+)/) ?? [])[1] ?? 0); const ql = Number((res.match(/q\.len=(\d+)/) ?? [])[1] ?? 0); v = d && conf >= 0.6 && ql > 0 ? 'question' : 'not-a-question'; }
      calls.push({ i, issuedAt: T(l), returnedAt: T(L[j]), res, v });
      break;
    }
  }
});
// ---- recorded classifies: §6.1.1's pairing (first `detect issued` within 3 s whose previous line is not `debounce elapsed`),
// the verdict from the close that follows (pre-fix logs have no verdict line), raw = model | null | no-call
const recorded = [];
L.forEach((l, i) => {
  const m = l.match(/\[Main\] turn: classify finals=(\d+)/);
  if (!m) return;
  const askedAt = T(l);
  if (askedAt < since) return;
  const call = calls.find((c) => c.i > i && c.issuedAt - askedAt <= 3000 && !/debounce elapsed/.test(L[c.i - 1] ?? ''));
  let verdict = 'question', raw = 'no-call', latency = 400;
  if (call) {
    raw = call.res === 'null' ? 'null' : 'model';
    latency = call.returnedAt - askedAt;
    const closed = L.slice(i, i + 400).some((x) => /close reason=not-a-question/.test(x) && T(x) >= call.returnedAt && T(x) - call.returnedAt <= 2000);
    verdict = closed ? 'not-a-question' : 'question';
  } else {
    const closed = L.slice(i, i + 400).some((x) => /close reason=not-a-question/.test(x) && T(x) - askedAt <= 3000);
    verdict = closed ? 'not-a-question' : 'question';
  }
  recorded.push({ askedAt, finals: Number(m[1]), verdict, raw, latency, used: false });
});
// ---- the log's own per-item reference
const logCloses = L.filter((l) => /\[Main\] turn: close reason=not-a-question/.test(l)).map(T).filter((t) => t >= since);
const logAnswers = [];
L.forEach((l, i) => {
  if (!/\[Main\] dispatch: answer source=/.test(l)) return;
  let g = null; for (let j = i - 1; j >= 0 && T(L[i]) - T(L[j]) <= 50; j--) { const m = L[j].match(/\[Main\] turn: gate=(\d+) finals=(\d+)/); if (m) { g = m; break; } }
  logAnswers.push({ at: T(l), fromLive: g ? g[2] === '0' : null, r21: !g, gate: g ? Number(g[1]) : null });
});
const blips = L.filter((l) => /\[Main\] turn: deepgram speech-started vad=true/.test(l)).map(T);
// R2 (C1): the app's timer footprints — a `turn: classify` or `turn: gate=` line is the app's timer having fired
const footprints = L.filter((l) => /\[Main\] turn: (classify|gate=)/.test(l)).map(T);
// R2 (C1): the app's own VAD-off per item from its gate/classify lines (vadlag's rule), against the fixture's voice-off
const finalsT = L.filter((l) => /\[Engine-timing\] segment-final speaker=interviewer/.test(l)).map(T);
const impliedOffs = [];
L.forEach((l) => {
  const t = T(l);
  const g = l.match(/\[Main\] turn: gate=(\d+) finals=(\d+)/);
  if (g && Number(g[2]) > 0 && Number(g[1]) < 4000) impliedOffs.push({ at: t, off: t - Number(g[1]), kind: 'gate' });
  if (/\[Main\] turn: classify/.test(l)) { const lastF = Math.max(...finalsT.filter((x) => x <= t)); if (t - lastF > 450) impliedOffs.push({ at: t, off: t - 1200, kind: 'classify' }); }
});

// ---- replay
const memory = { calib: { revive: false, echo: false }, fix: { revive: true, echo: true }, fixunk: { revive: true, echo: true }, control: { revive: true, echo: false }, control2: { revive: false, echo: true } }[mode];
if (!memory) throw new Error(`mode ${mode}`);
const turn = createTurn(memory);
const events = [];
for (const it of f.items) for (const [on, off] of it.voice) { events.push({ at: on, order: 0, type: 'speech', on: true }); events.push({ at: off, order: 0, type: 'speech', on: false }); }
for (const x of f.finals) events.push({ at: x.at, order: 1, type: 'final', text: x.text });
for (const a of f.actual.filter((a) => a.action === 'mark')) events.push({ at: a.at, order: 2, type: 'detected', source: a.source, text: a.question || a.anchor, rverdict: a.verdict });
events.sort((a, b) => a.at - b.at || a.order - b.order);
const out = []; const absorbed = []; const outcomes = []; const subs = []; const unmatched = []; const reorders = [];
let clock = events[0]?.at ?? 0;
const dedup = new ChipDeduper({ now: () => clock });
let answeredId, drops = 0;
const pushEvent = (e) => { let k = events.length; while (k > 0 && (events[k - 1].at > e.at || (events[k - 1].at === e.at && events[k - 1].order > e.order))) k--; events.splice(k, 0, e); };
const finalsBetween = (a, b) => f.finals.some((x) => x.at > a && x.at < b);
let idx = 0;
const admit = (d, asFresh) => {
  const r = dedup.admit({ question: d.text, source: asFresh ? 'whisper' : d.fromLive ? 'live' : 'whisper', ...(withAnchor ? { anchor: d.text } : {}) });
  if (r.admitted) { dedup.markAnswered(r.id); answeredId = r.id; out.push({ at: clock, d: { ...d, kind: 'dispatch', ...(asFresh ? { fromLive: false, r21: true } : {}) } }); }
  else { answeredId = undefined; drops++; out.push({ at: clock, d: { ...d, kind: 'drop', ...(asFresh ? { r21: true } : {}) } }); }
};
const settle = () => {
  for (let g = 0; g < 8; g++) {
    const d = turn.tick(clock);
    if (d.kind === 'idle' || d.kind === 'hold') break;
    if (d.kind === 'classify') {
      out.push({ at: clock, d });
      let best = null;
      for (const r of recorded) if (!r.used && Math.abs(r.askedAt - clock) <= 2500 && r.finals === d.finals && (!best || Math.abs(r.askedAt - clock) < Math.abs(best.askedAt - clock))) best = r;
      if (best) {
        best.used = true;
        let v = best.verdict;
        if (mode !== 'calib' && best.raw === 'null' && v === 'not-a-question') v = 'unknown';
        pushEvent({ at: clock + best.latency, order: 3, type: 'verdict', verdict: v, turn: d.turn, finals: d.finals, askedAt: clock, rearmed: !!d.rearmed, substituted: false });
        continue;
      }
      if (mode === 'calib') { unmatched.push({ at: clock, finals: d.finals }); continue; }
      let v = 'unknown', at = clock + 400, how = 'unknown';
      if (mode !== 'fixunk') {
        const c = calls.find((c) => c.issuedAt > clock && c.issuedAt - clock <= 4000 && !finalsBetween(clock, c.issuedAt));
        if (c) { v = c.v; at = Math.max(clock + 1, c.returnedAt); how = `detector ${c.res.slice(0, 30)}`; }
      }
      subs.push({ at: clock, finals: d.finals, v, how, rearmed: !!d.rearmed });
      pushEvent({ at, order: 3, type: 'verdict', verdict: v, turn: d.turn, finals: d.finals, askedAt: clock, rearmed: !!d.rearmed, substituted: true });
      continue;
    }
    if (d.kind === 'dispatch') { admit(d, false); continue; }
    if (d.kind === 'supersede') {
      if (answeredId === undefined) { admit(d, true); continue; } // R21: routed as a fresh dispatch
      dedup.extend(answeredId, d.text); out.push({ at: clock, d }); continue;
    }
    out.push({ at: clock, d });
  }
};
for (let guard = 0; idx < events.length && guard < 1_000_000; guard++) {
  const e = events[idx];
  const t = turn.nextTimerAt(clock);
  // R2 (C1): a due timer and a RECORDED, LOGGED event (a mark or a final; not a replay-made verdict, not a WAV voice
  // edge) within JITTER of each other are a race the app resolved one way or the other. The log says which: a timer
  // footprint (`turn: classify` / `turn: gate=`) stamped at or before the event's own line means the timer went
  // first; none means the event did. Outside the window the due timer always runs first.
  let eventFirst = false;
  if ((e.type === 'detected' || e.type === 'final') && t !== null && t <= e.at && e.at - t <= JITTER) {
    const timerFirst = false; // RECHECK: event always first inside the window
    eventFirst = !timerFirst;
    if (eventFirst) reorders.push({ timerAt: t, eventAt: e.at, type: e.type });
  }
  if (t !== null && t <= e.at && !eventFirst) { clock = t; settle(); continue; }
  idx++; clock = e.at;
  if (e.type === 'speech') turn.speech(e.on, e.at);
  else if (e.type === 'final') turn.final(e.text, e.at);
  else if (e.type === 'verdict') { const o = turn.verdict(e.verdict, e.turn, e.finals, e.at); outcomes.push({ at: e.at, src: 'verdict', verdict: e.verdict, o, askedAt: e.askedAt, rearmed: e.rearmed, substituted: e.substituted }); }
  else {
    const o = turn.evidence(e.source, e.text, e.at);
    outcomes.push({ at: e.at, src: e.source, o, text: e.text, rverdict: e.rverdict });
    if (o.kind === 'absorbed') {
      const lastEnd = f.items.map((it) => it.playedAt + it.clipSecs * 1000).filter((x) => x <= e.at + 500).sort((a, b) => b - a)[0] ?? null;
      absorbed.push({ at: e.at, ...o, text: e.text, lagFromLastClipEnd: lastEnd === null ? null : e.at - lastEnd });
    }
  }
  settle();
}
for (let g = 0; g < 400; g++) { const t = turn.nextTimerAt(clock); if (t === null || t > clock + 60000) break; clock = t; settle(); }

// ---- rows
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'be', 'that', 'this', 'it', 'as', 'at', 'by', 'from', 'your', 'you', 'we', 'our', 'my', 'i', 'would', 'how', 'what', 'which', 'when', 'where', 'why', 'do', 'does', 'can', 'could', 'should']);
const wds = (s) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
const content = (s) => new Set(wds(s).filter((w) => w.length >= 3 && !STOP.has(w)));
const coverage = (script, text) => { const a = content(script), b = content(text); let hit = 0; for (const w of a) if (b.has(w)) hit++; return a.size ? hit / a.size : 1; };
const windowOf = (k) => { const it = f.items[k]; return [it.playedAt - 2000, (f.items[k + 1]?.playedAt ?? it.playedAt + it.clipSecs * 1000 + 90_000) - 2000]; };
const rows = f.items.map((it, k) => {
  const [from, to] = windowOf(k);
  const mine = out.filter((o) => o.at >= from && o.at < to);
  const disp = mine.filter((o) => o.d.kind === 'dispatch');
  const voiceOff = it.voice.length ? it.voice[it.voice.length - 1][1] : it.playedAt + it.clipSecs * 1000;
  const marks = f.actual.filter((a) => a.action === 'mark' && a.at >= from && a.at < to).map((a) => a.at);
  const posVerd = outcomes.filter((x) => x.src === 'verdict' && x.verdict === 'question' && x.at >= from && x.at < to).map((x) => x.at);
  const firstPos = [...marks, ...posVerd].sort((a, b) => a - b)[0] ?? 0;
  const last = [...mine].reverse().find((o) => o.d.kind === 'dispatch' || o.d.kind === 'supersede');
  const la = logAnswers.filter((a) => a.at >= from && a.at < to);
  const first = disp[0] ?? null;
  const finished = first ? readsFinished(first.d.text) : true;
  // R2 (C2): the budget carries the unfinished hold when the dispatched text does not read finished, and (the re-smoke's
  // S1Q08F: a final 3.1 s after the voice-off) the settle after the last final the dispatched text holds
  const lastFinalIn = first ? (f.finals.filter((x) => x.at >= from && x.at <= first.at).map((x) => x.at).sort((a, b) => b - a)[0] ?? 0) : 0;
  const budget = Math.max(voiceOff + C.gateMs + C.settleMs + (finished ? 0 : C.unfinishedHoldMs), firstPos, lastFinalIn + C.settleMs) + 100 - voiceOff;
  const budgetOld = Math.max(voiceOff + C.gateMs + C.settleMs, firstPos) + 100 - voiceOff;
  const logFirst = la[0]?.at ?? null;
  // R2 (C1): the app's dispatch rode on a mark's turnTick (within 50 ms after a mark line) at a gate value that is
  // neither the gate nor the unfinished hold: the app's own timer had not fired when the machine would have
  const replayAtMark = first !== null && marks.some((m) => first.at - m >= 0 && first.at - m <= 50);
  const markTriggered = logFirst !== null && !replayAtMark && marks.some((m) => logFirst - m >= 0 && logFirst - m <= 50) && la[0].gate !== null && Math.abs(la[0].gate - C.gateMs) > 100 && Math.abs(la[0].gate - (C.gateMs + C.unfinishedHoldMs)) > 100;
  const dev = impliedOffs.filter((x) => x.at >= from && x.at < to && Math.abs(x.off - voiceOff) < 5000).map((x) => x.off - voiceOff);
  const itemBlips = blips.filter((b) => b > voiceOff + 500 && logFirst !== null && b < logFirst).length;
  const subsHere = subs.filter((s) => s.at >= from && s.at < to);
  const restsOnSub = outcomes.some((x) => x.src === 'verdict' && x.substituted && x.at >= from && x.at < to && x.o.kind !== 'ignored');
  return { id: it.id, kind: it.kind ?? 'spoken', long: !!it.long || it.level === 'long', n: disp.length, early: disp.some((o) => o.at < voiceOff), first: first?.at ?? null, lat: first ? first.at - voiceOff : null, budget, budgetOld, finished, path: first?.d.path ?? null, fromLive: first?.d.fromLive ?? null, finals: first?.d.finals ?? null, live: first?.d.live ?? [], text: first?.d.text ?? null, cov: coverage(it.q, last && 'text' in last.d ? last.d.text : ''), closes: mine.filter((o) => o.d.kind === 'close').map((o) => o.d.reason), supersedes: mine.filter((o) => o.d.kind === 'supersede').length, r21: disp.some((o) => o.d.r21), logFirst, logFromLive: la[0]?.fromLive ?? null, logR21: la[0]?.r21 ?? null, logGate: la[0]?.gate ?? null, markTriggered, lastFinalIn, vadDev: dev.length ? dev[0] : null, blips: itemBlips, subs: subsHere.length, restsOnSub, voiceOff, from, to };
});
const res = { run: f.run, mode, jitter: JITTER, rows, absorbed, outcomes, subs, unmatched, reorders, drops, recorded, logCloses, closes: out.filter((o) => o.d.kind === 'close').map((o) => ({ at: o.at, reason: o.d.reason })) };
if (flag('--json')) { process.stdout.write(JSON.stringify(res)); process.exit(0); }
const once = rows.filter((r) => r.kind === 'spoken' && r.n === 1).length, spoken = rows.filter((r) => r.kind === 'spoken').length;
console.log(`${f.run} [${mode} jitter=${JITTER}${withAnchor ? '' : ' no-anchor'}]: ${once}/${spoken} once; doubles [${rows.filter((r) => r.n > 1).map((r) => `${r.id}:${r.n}`).join(' ')}]; never [${rows.filter((r) => r.kind === 'spoken' && r.n === 0).map((r) => r.id).join(' ')}]; drops ${drops}; absorbed ${absorbed.length} (whisper ${absorbed.filter((a) => a.source === 'whisper').length}); subs ${subs.length}; unmatched ${unmatched.length}; reorders ${reorders.length}; supersedes ${rows.reduce((s, r) => s + r.supersedes, 0)}`);
if (traceId) {
  const r = rows.find((x) => x.id === traceId);
  console.log(`trace ${traceId}: ${JSON.stringify({ n: r.n, lat: r.lat, budget: r.budget, path: r.path, finished: r.finished, fromLive: r.fromLive, finals: r.finals, cov: r.cov.toFixed(2), closes: r.closes, live: r.live.map((x) => x.slice(0, 50)), logFirst: r.logFirst ? iso(r.logFirst) : null, logGate: r.logGate, vadDev: r.vadDev, blips: r.blips, voiceOff: iso(r.voiceOff) })}`);
  const evs = events.filter((e) => e.at >= r.from && e.at < r.to && (e.type === 'final' || e.type === 'speech'));
  for (const e of evs) console.log(`  ${iso(e.at)} ${e.type === 'speech' ? (e.on ? 'voice ON' : 'voice OFF') : `final "${e.text.slice(0, 70)}"`}`);
  for (const o of out.filter((o) => o.at >= r.from && o.at < r.to)) console.log(`  ${iso(o.at)} ${o.d.kind}${o.d.reason ? ' ' + o.d.reason : ''}${o.d.kind === 'classify' ? ` finals=${o.d.finals}${o.d.rearmed ? ' REARMED' : ''}` : ''}${'text' in o.d && o.d.kind !== 'classify' ? ` finals=${o.d.finals} fromLive=${o.d.fromLive} live=${o.d.live?.length}${o.d.path ? ' path=' + o.d.path : ''} "${o.d.text.slice(0, 60)}"` : ''}`);
  for (const x of outcomes.filter((x) => x.at >= r.from && x.at < r.to)) console.log(`  ${iso(x.at)} <${x.src}${x.verdict ? ' ' + x.verdict : ''}${x.substituted ? ' SUBSTITUTED' : ''}${x.rverdict ? ' rv=' + x.rverdict : ''}> ${JSON.stringify(x.o).slice(0, 200)}${x.text ? ' q=' + JSON.stringify(x.text.slice(0, 50)) : ''}`);
}
