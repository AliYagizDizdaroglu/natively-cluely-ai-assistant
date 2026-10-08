// REVIEW THROWAWAY (read-only on the repo and the logs): replays a DS fixture through proto.ts in the spec's modes
// and reads the spec's §7 rows off it. Question text only; never prints answers.
// usage: node --experimental-strip-types --no-warnings replay-proto.mjs <fixture.json> <natively_debug.log> <mode> [--trace ID] [--rearm] [--echoAfterR15] [--dsPairing]
//   mode: calib | fixdet | fixunk | control
import fs from 'node:fs';
import { createTurn, quoteScore, unspec } from './proto.ts';
import { ChipDeduper } from '../../dispatcher/src/ChipDeduper.ts';

const [fxFile, logFile, mode, ...rest] = process.argv.slice(2);
const flag = (n) => rest.includes(n);
const traceId = flag('--trace') ? rest[rest.indexOf('--trace') + 1] : null;
const f = JSON.parse(fs.readFileSync(fxFile, 'utf8'));
const iso = (t) => new Date(t).toISOString().slice(11, 23);
const L = fs.readFileSync(logFile, 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
const T = (l) => Date.parse(l.slice(0, 24));
const since = f.items[0].playedAt - 120000;

// ---- detector calls: every issued/returned pair
const calls = [];
L.forEach((l, i) => {
  if (!/\[QD-timing\] detect issued/.test(l)) return;
  for (let j = i + 1; j < L.length; j++) {
    const r = L[j].match(/\[QD-timing\] detect returned \+(\d+)ms result=(.*)$/);
    if (r) {
      const res = r[2]; let v;
      if (res === 'null') v = 'unknown';
      else { const d = /detected=true/.test(res); const conf = Number((res.match(/conf=([\d.]+)/) ?? [])[1] ?? 0); const ql = Number((res.match(/q\.len=(\d+)/) ?? [])[1] ?? 0); v = d && conf >= 0.6 && ql > 0 ? 'question' : 'not-a-question'; }
      calls.push({ i, issuedAt: T(l), returnedAt: T(L[j]), res, v, prevDebounce: /debounce elapsed|coalesced/.test(L[i - 1] ?? '') });
      break;
    }
  }
});
// ---- recorded classifies: the spec's pairing (first issued within 3 s whose previous line is not `debounce elapsed`), or DS's (first issued after)
const recorded = [];
L.forEach((l, i) => {
  const m = l.match(/\[Main\] turn: classify finals=(\d+)/);
  if (!m) return;
  const askedAt = T(l);
  if (askedAt < since) return;
  let call;
  if (flag('--dsPairing')) call = calls.find((c) => c.i > i);
  else call = calls.find((c) => c.i > i && c.issuedAt - askedAt <= 3000 && !/debounce elapsed/.test(L[c.i - 1] ?? ''));
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
  recorded.push({ askedAt, finals: Number(m[1]), verdict, raw, latency, used: false, waited: call ? call.issuedAt - askedAt : null });
});
// ---- the log's own per-item reference: not-a-question closes, first admitted dispatch (a `dispatch: answer` line) and its source
const logCloses = L.filter((l) => /\[Main\] turn: close reason=not-a-question/.test(l)).map(T).filter((t) => t >= since);
const logAnswers = [];
L.forEach((l, i) => {
  if (!/\[Main\] dispatch: answer source=/.test(l)) return;
  let g = null; for (let j = i - 1; j >= 0 && T(L[i]) - T(L[j]) <= 50; j--) { const m = L[j].match(/\[Main\] turn: gate=(\d+) finals=(\d+)/); if (m) { g = m; break; } }
  logAnswers.push({ at: T(l), fromLive: g ? g[2] === '0' : null, r21: !g });
});

// ---- replay
const memory = mode === 'calib' ? { revive: false, echo: false } : mode === 'control' ? { revive: true, echo: false } : { revive: true, echo: true };
const turn = createTurn(memory, quoteScore, { rearmUndetected: flag('--rearm'), echoAfterR15: flag('--echoAfterR15') });
const events = [];
for (const it of f.items) for (const [on, off] of it.voice) { events.push({ at: on, order: 0, type: 'speech', on: true }); events.push({ at: off, order: 0, type: 'speech', on: false }); }
for (const x of f.finals) events.push({ at: x.at, order: 1, type: 'final', text: x.text });
for (const a of f.actual.filter((a) => a.action === 'mark')) events.push({ at: a.at, order: 2, type: 'detected', source: a.source, text: a.question || a.anchor, rverdict: a.verdict });
events.sort((a, b) => a.at - b.at || a.order - b.order);
const out = []; const absorbed = []; const outcomes = []; const subs = []; const unmatched = []; const throwsAt = [];
let clock = events[0]?.at ?? 0;
const dedup = new ChipDeduper({ now: () => clock });
let answeredId, drops = 0;
const pushEvent = (e) => { let k = events.length; while (k > 0 && (events[k - 1].at > e.at || (events[k - 1].at === e.at && events[k - 1].order > e.order))) k--; events.splice(k, 0, e); };
const finalsBetween = (a, b) => f.finals.some((x) => x.at > a && x.at < b);
let idx = 0;
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
        pushEvent({ at: clock + best.latency, order: 3, type: 'verdict', verdict: v, turn: d.turn, finals: d.finals, askedAt: clock });
        continue;
      }
      if (mode === 'calib') { unmatched.push({ at: clock, finals: d.finals }); continue; }
      let v = 'unknown', at = clock + 400, how = 'unknown';
      if (mode === 'fixdet' || mode === 'control') {
        const c = calls.find((c) => c.issuedAt > clock && c.issuedAt - clock <= 4000 && !finalsBetween(clock, c.issuedAt));
        if (c) { v = c.v; at = Math.max(clock + 1, c.returnedAt); how = `detector ${c.res.slice(0, 30)}`; }
      }
      subs.push({ at: clock, finals: d.finals, v, how, rearmed: !!d.rearmed });
      pushEvent({ at, order: 3, type: 'verdict', verdict: v, turn: d.turn, finals: d.finals, askedAt: clock });
      continue;
    }
    if (d.kind === 'dispatch') {
      const r = dedup.admit({ question: d.text, source: d.fromLive ? 'live' : 'whisper', ...(flag('--anchor') ? { anchor: d.text } : {}) });
      if (r.admitted) { dedup.markAnswered(r.id); answeredId = r.id; out.push({ at: clock, d }); } else { answeredId = undefined; drops++; out.push({ at: clock, d: { ...d, kind: 'drop' } }); }
      continue;
    }
    if (d.kind === 'supersede') {
      if (answeredId === undefined) { // R21: routed as a fresh dispatch
        const r = dedup.admit({ question: d.text, source: 'whisper', ...(flag('--anchor') ? { anchor: d.text } : {}) });
        if (r.admitted) { dedup.markAnswered(r.id); answeredId = r.id; out.push({ at: clock, d: { ...d, kind: 'dispatch', fromLive: false, r21: true } }); } else { drops++; out.push({ at: clock, d: { ...d, kind: 'drop', r21: true } }); }
        continue;
      }
      dedup.extend(answeredId, d.text); out.push({ at: clock, d }); continue;
    }
    if (d.kind === 'close') answeredId = answeredId; // the deduper entry survives the close
    out.push({ at: clock, d });
  }
};
for (let guard = 0; idx < events.length && guard < 1_000_000; guard++) {
  const e = events[idx];
  const t = turn.nextTimerAt(clock);
  if (t !== null && t <= e.at) { clock = t; settle(); continue; }
  idx++; clock = e.at;
  if (e.type === 'speech') turn.speech(e.on, e.at);
  else if (e.type === 'final') turn.final(e.text, e.at);
  else if (e.type === 'verdict') { const o = turn.detected('whisper', e.at, e.verdict, e.turn, { finals: e.finals }); outcomes.push({ at: e.at, src: 'verdict', verdict: e.verdict, o, askedAt: e.askedAt }); }
  else {
    try {
      if (e.source === 'live') {
        const c = turn.liveClaim(e.text, e.at);
        if (memory.echo || memory.revive) outcomes.push({ at: e.at, src: 'live', o: c, text: e.text, rverdict: e.rverdict });
        if (c.kind === 'absorbed') { absorbed.push({ at: e.at, ...c, text: e.text }); settle(); continue; }
      }
      const o = turn.detected(e.source, e.at, undefined, undefined, { text: e.text });
      outcomes.push({ at: e.at, src: e.source, o, text: e.text, rverdict: e.rverdict });
    } catch (err) { throwsAt.push({ at: e.at, msg: err.message }); }
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
  return { id: it.id, kind: it.kind ?? 'spoken', long: !!it.long || it.level === 'long', n: disp.length, early: disp.some((o) => o.at < voiceOff), first: disp[0]?.at ?? null, lat: disp.length ? disp[0].at - voiceOff : null, budget: Math.max(voiceOff + 1600, firstPos) + 100 - voiceOff, fromLive: disp[0]?.d.fromLive ?? null, finals: disp[0]?.d.finals ?? null, live: disp[0]?.d.live ?? [], cov: coverage(it.q, last && 'text' in last.d ? last.d.text : ''), closes: mine.filter((o) => o.d.kind === 'close').map((o) => o.d.reason), r21: disp.some((o) => o.d.r21), logFirst: la[0]?.at ?? null, logFromLive: la[0]?.fromLive ?? null, logR21: la[0]?.r21 ?? null, from, to };
});
const res = { run: f.run, mode, rows, absorbed, outcomes, subs, unmatched, throwsAt, drops, recorded, logCloses, unspec: { ...unspec }, closes: out.filter((o) => o.d.kind === 'close').map((o) => ({ at: o.at, reason: o.d.reason })) };
if (flag('--json')) { process.stdout.write(JSON.stringify(res)); process.exit(0); }
const once = rows.filter((r) => r.kind === 'spoken' && r.n === 1).length, spoken = rows.filter((r) => r.kind === 'spoken').length;
console.log(`${f.run} [${mode}${flag('--rearm') ? ' +rearm' : ''}${flag('--echoAfterR15') ? ' +echoAfterR15' : ''}]: ${once}/${spoken} once; doubles [${rows.filter((r) => r.n > 1).map((r) => `${r.id}:${r.n}`).join(' ')}]; never [${rows.filter((r) => r.kind === 'spoken' && r.n === 0).map((r) => r.id).join(' ')}]; drops ${drops}; absorbed ${absorbed.length}; subs ${subs.length}; unmatched ${unmatched.length}; throws ${throwsAt.length}; unspec ${JSON.stringify(unspec)}`);
if (traceId) {
  const r = rows.find((x) => x.id === traceId);
  console.log(`trace ${traceId}: ${JSON.stringify({ n: r.n, lat: r.lat, budget: r.budget, fromLive: r.fromLive, finals: r.finals, cov: r.cov.toFixed(2), closes: r.closes, live: r.live.map((x) => x.slice(0, 50)) })}`);
  for (const o of out.filter((o) => o.at >= r.from && o.at < r.to)) console.log(`  ${iso(o.at)} ${o.d.kind}${o.d.reason ? ' ' + o.d.reason : ''}${o.d.kind === 'classify' ? ` finals=${o.d.finals}${o.d.rearmed ? ' REARMED' : ''}` : ''}${'text' in o.d && o.d.kind !== 'classify' ? ` finals=${o.d.finals} fromLive=${o.d.fromLive} live=${o.d.live?.length}` : ''}`);
  for (const x of outcomes.filter((x) => x.at >= r.from && x.at < r.to)) console.log(`  ${iso(x.at)} <${x.src}${x.verdict ? ' ' + x.verdict : ''}${x.rverdict ? ' rv=' + x.rverdict : ''}> ${JSON.stringify(x.o).slice(0, 160)}`);
}
