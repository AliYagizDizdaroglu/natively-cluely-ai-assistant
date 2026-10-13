// D2 replay: every recorded run log with Deepgram events, fed through the OLD (e9881c8e) and NEW (D2) turn
// machine with the real (D1) ChipDeduper. Prints ids, counts and timings only, never question text.
//   node build.mjs   (once, after any source change)    node d2-replay.mjs [--runs <substr>] [--d1-answered]
// Events per run: voice spans from the TTS WAVs (20 ms / -45 dBFS, as interview60.turns-fixture.mjs; a coarse
// [playedAt, playedAt+clip] span where no WAV is found), the log's finals WITH onset provenance (computed from the
// interim lines exactly as DeepgramStreamingSTT does), Deepgram speech-started (NEW only: voiceHeard), whisper/live
// detector fires (whole-turn era logs: the `dispatch: mark` lines; older logs: every dispatch line, as the fixture
// builder does), and the logged not-a-question / candidate closes (injected, since the classify verdict and the
// candidate's voice are not replayed). "Answered" = the replayed dispatchDetection tail: the real ChipDeduper admits
// the dispatch (a live text under 4 words is dropped first, as isFragment does); markAnswered -> turn.answered().
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OLD from './oldTurn.mjs';
import * as NEW from './newTurn.mjs';
import { ChipDeduper } from './chipDeduper.mjs';
import { isLateFinalChip } from './turnDispatch.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const RUNS = path.join(G, 'interview60.runs');
const ttsDirs = fs.readdirSync(G).filter((d) => /tts-local$/.test(d)).map((d) => path.join(G, d));
const onlyRun = process.argv.includes('--runs') ? process.argv[process.argv.indexOf('--runs') + 1] : null;

const FINAL_RE = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/;
const REPAIR_RE = /^\S+ \[LOG\] \[DeepgramStreaming\] boundary repair: restored "((?:[^"\\]|\\.)*)" before "/;
const unq = (s) => { try { return JSON.parse(`"${s}"`); } catch { return s; } };
const wordsOf = (t) => (t.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).join(' ');
const nWords = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const hms = (ms) => new Date(ms).toISOString().slice(11, 23);

function voiceSegments(file, at0) {
  const b = fs.readFileSync(file);
  const rate = b.readUInt32LE(24);
  const di = b.indexOf(Buffer.from('data', 'ascii'), 12);
  const pcm = b.subarray(di + 8, di + 8 + b.readUInt32LE(di + 4));
  const FR = Math.round(rate * 0.02);
  const n = Math.floor(pcm.length / 2 / FR);
  const loud = new Array(n);
  for (let f = 0; f < n; f++) { let s = 0; for (let k = 0; k < FR; k++) { const v = pcm.readInt16LE((f * FR + k) * 2); s += v * v; } loud[f] = 20 * Math.log10(Math.sqrt(s / FR) / 32768 + 1e-9) >= -45; }
  const out = []; let start = null, last = null;
  for (let f = 0; f < n; f++) {
    if (loud[f]) { if (start === null) start = f; last = f; }
    else if (start !== null && (f - last) * 20 >= 250) { out.push([at0 + start * 20, at0 + (last + 1) * 20]); start = null; }
  }
  if (start !== null) out.push([at0 + start * 20, at0 + (last + 1) * 20]);
  return out;
}

function loadRun(name) {
  const dir = path.join(RUNS, name);
  const tlf = path.join(dir, 'interview60.timeline.json'), lgf = path.join(dir, 'natively_debug.log');
  if (!fs.existsSync(tlf) || !fs.existsSync(lgf)) return null;
  const dbg = fs.readFileSync(lgf, 'utf8');
  if (!dbg.includes('Transcript event')) return null;
  const tl = JSON.parse(fs.readFileSync(tlf, 'utf8'));
  const OFFSET = tl.clock === 'playsync' ? 0 : 1150;
  const since = tl.startedMs - 2000;
  let coarse = 0, wavd = 0;
  const items = tl.items.map((i) => {
    const playedAt = tl.startedMs + OFFSET + Math.round(i.startSec * 1000);
    const kind = i.kind ?? 'spoken';
    let voice = [];
    if (kind === 'spoken') {
      const wav = ttsDirs.map((d) => path.join(d, `${i.id}.wav`)).find((p) => fs.existsSync(p));
      if (wav) { voice = voiceSegments(wav, playedAt); wavd++; } else { voice = [[playedAt, playedAt + Math.round(i.clipSecs * 1000)]]; coarse++; }
    }
    return { id: i.id, kind, playedAt, clipSecs: i.clipSecs, voice };
  });
  const lines = dbg.split('\n');
  const era = lines.some((l) => /\[Main\] turn: gate=/.test(l));
  // finals as the tracker saw them (boundary-repair restore joined), + provenance from the interim lines
  const finals = []; let onset = null, lastWords = null, changedAt = 0;
  const detRe = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|extend|hold|mark|supersede) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?:[^\n]*? question="((?:[^"\\]|\\.)*)")?/;
  const dets = [], voiceHeard = [], injected = [], loggedCloses = {}; let loggedGates = 0, loggedAnswers = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\S+ \[LOG\] \[DeepgramStreaming\] Connected/.test(l)) { onset = null; lastWords = null; continue; }
    let m = l.match(FINAL_RE);
    if (m) {
      const at = Date.parse(m[1]); const raw = unq(m[3]);
      const isFinal = m[2] === 'true'; const empty = raw === '' || raw === '(empty)';
      const w = empty ? '' : wordsOf(raw);
      if (!isFinal) { if (!empty) { if (onset === null) onset = at; if (w !== lastWords) { changedAt = at; lastWords = w; } } continue; }
      if (empty) { onset = null; lastWords = null; continue; }
      const rep = lines[i + 1]?.match(REPAIR_RE);
      const text = (rep ? `${unq(rep[1])} ${raw}` : raw).trim();
      const prov = onset !== null ? { onsetAt: onset, textSinceAt: w === lastWords ? changedAt : at } : undefined;
      onset = null; lastWords = null;
      if (text && at >= since) finals.push({ at, text, prov });
      continue;
    }
    m = l.match(detRe);
    if (m) {
      const at = Date.parse(m[1]); if (at < since) continue;
      if (m[2] === 'answer') loggedAnswers++;
      if (era ? m[2] === 'mark' : true) dets.push({ at, source: m[3], text: m[6] ? unq(m[6]) : unq(m[4]), action: m[2] });
      continue;
    }
    if (/\[Main\] turn: gate=/.test(l)) { loggedGates++; continue; }
    m = l.match(/^(\S+) \[LOG\] \[Main\] turn: close reason=(\S+)/);
    if (m) {
      const at = Date.parse(m[1]); loggedCloses[m[2]] = (loggedCloses[m[2]] ?? 0) + 1;
      if (m[2] === 'not-a-question' || m[2] === 'candidate') injected.push({ at, type: m[2] });
      continue;
    }
    m = l.match(/^(\S+) \[LOG\] \[Main\] turn: deepgram speech-started/);
    if (m) voiceHeard.push(Date.parse(m[1]));
  }
  return { name, tl, items, era, finals, dets, voiceHeard, injected, loggedCloses, loggedGates, loggedAnswers, wavd, coarse, since };
}

function windowOf(R, k) {
  const it = R.items[k];
  return [it.playedAt - 2000, (R.items[k + 1]?.playedAt ?? it.playedAt + it.clipSecs * 1000 + 90_000) - 2000];
}
const itemAt = (R, at) => { for (let k = 0; k < R.items.length; k++) { const [a, b] = windowOf(R, k); if (at >= a && at < b) return R.items[k].id; } return '-'; };

function replay(R, M, isNew) {
  const c = M.DEFAULT_TURN_CONSTANTS;
  const turn = M.createInterviewerTurn(c);
  const events = [];
  for (const it of R.items) for (const [on, off] of it.voice) { events.push({ at: on, order: 0, type: 'speech', on: true }); events.push({ at: off, order: 0, type: 'speech', on: false }); }
  if (isNew) for (const at of R.voiceHeard) events.push({ at, order: 0, type: 'heard' });
  R.finals.forEach((f, idx) => events.push({ at: f.at, order: 1, type: 'final', idx }));
  for (const d of R.dets) events.push({ at: d.at, order: 2, type: 'detected', source: d.source, text: d.text });
  for (const x of R.injected) events.push({ at: x.at, order: 3, type: x.type });
  events.sort((a, b) => a.at - b.at || a.order - b.order);
  const out = [], absorbed = [], chipDrops = [], absorbedFinals = [];
  let clock = events[0]?.at ?? 0;
  const dedup = new ChipDeduper({ now: () => clock });
  let answeredId; let answers = 0;
  const settle = () => {
    for (let g = 0; g < 8; g++) {
      const d = turn.tick(clock);
      if (d.kind === 'idle' || d.kind === 'hold') break;
      if (d.kind === 'dispatch' || d.kind === 'supersede') {
        const turnId = turn.snapshot().id;
        let admitted = false;
        const tooShortLive = d.kind === 'dispatch' && d.fromLive && nWords(d.text) < 4; // isFragment drop
        if (!tooShortLive) {
          if (d.kind === 'supersede' && answeredId !== undefined) { dedup.extend(answeredId, d.text); admitted = true; }
          else {
            const r = dedup.admit({ question: d.text, source: d.kind === 'dispatch' && d.fromLive ? 'live' : 'whisper' });
            if (r.admitted) { dedup.markAnswered(r.id); answeredId = r.id; admitted = true; } else answeredId = undefined;
          }
        } else answeredId = undefined;
        if (admitted) { answers++; if (turnId != null) turn.answered?.(turnId, clock); }
        out.push({ at: clock, d, answered: admitted });
        continue;
      }
      out.push({ at: clock, d });
    }
  };
  const runTimers = (until) => { for (let guard = 0; guard < 400; guard++) { const t = turn.nextTimerAt(clock); if (t === null || t > until) return; clock = t; settle(); } };
  for (const e of events) {
    runTimers(e.at); clock = e.at;
    if (e.type === 'speech') turn.speech(e.on, e.at);
    else if (e.type === 'heard') turn.voiceHeard?.(e.at);
    else if (e.type === 'final') {
      const f = R.finals[e.idx];
      const r = turn.final(f.text, e.at, isNew ? f.prov : undefined);
      if (r === 'absorbed') { absorbed.push(e.idx); absorbedFinals.push({ text: f.text, at: e.at }); }
    } else if (e.type === 'detected') {
      if (isNew && e.source === 'whisper' && isLateFinalChip(e.text, absorbedFinals, e.at)) { chipDrops.push(e.at); }
      else { if (e.source === 'live') turn.liveClaim(e.text, e.at); turn.detected(e.source, e.at); }
    } else if (e.type === 'not-a-question') { const id = turn.snapshot().id; if (id != null) turn.detected('whisper', e.at, 'not-a-question', id); }
    else if (e.type === 'candidate') turn.candidateSpoke(e.at);
    settle();
  }
  runTimers(clock + 60_000);
  // which decisions each final landed in (by text), over the finals the machine kept
  const kept = R.finals.map((f, idx) => ({ ...f, idx })).filter((f) => !absorbed.includes(f.idx));
  const assign = R.finals.map(() => []);
  for (const o of out) {
    if ((o.d.kind !== 'dispatch' && o.d.kind !== 'supersede') || !o.d.finals) continue;
    const n = o.d.finals;
    for (let i = kept.length - n; i >= 0; i--) {
      if (kept[i + n - 1].at > o.at) continue;
      if (kept.slice(i, i + n).map((f) => f.text).join(' ') === o.d.text) { for (let k = i; k < i + n; k++) assign[kept[k].idx].push(`${o.d.kind}@${hms(o.at)}`); break; }
    }
  }
  for (const idx of absorbed) assign[idx] = ['absorbed'];
  return { out, absorbed, chipDrops, assign, answers };
}

const names = fs.readdirSync(RUNS).filter((n) => (!onlyRun || n.includes(onlyRun))).sort();
const total = { runs: 0, finals: 0, changedFinals: 0, absorbed: 0, chipDrops: 0, decisionDiffs: 0 };
const changes = [];
for (const name of names) {
  let R; try { R = loadRun(name); } catch (e) { console.log(`${name}: LOAD ERROR ${e.message}`); continue; }
  if (!R) continue;
  const o = replay(R, OLD, false), n = replay(R, NEW, true);
  total.runs++; total.finals += R.finals.length;
  const closesOf = (r) => r.out.filter((x) => x.d.kind === 'close').reduce((a, x) => (a[x.d.reason] = (a[x.d.reason] ?? 0) + 1, a), {});
  const dec = (r) => r.out.filter((x) => x.d.kind !== 'classify').map((x) => `${x.d.kind}${x.d.reason ? ':' + x.d.reason : ''}@${hms(x.at)}#${x.d.text ? nWords(x.d.text) : '-'}w${x.d.finals ?? ''}`);
  const dO = dec(o), dN = dec(n);
  const diffsDec = [...dO.filter((x) => !dN.includes(x)).map((x) => `old-only ${x}`), ...dN.filter((x) => !dO.includes(x)).map((x) => `new-only ${x}`)];
  let changedFinals = 0;
  for (let i = 0; i < R.finals.length; i++) {
    if (JSON.stringify(o.assign[i]) !== JSON.stringify(n.assign[i])) {
      changedFinals++;
      changes.push({ run: name, at: hms(R.finals[i].at), item: itemAt(R, R.finals[i].at), words: nWords(R.finals[i].text), old: o.assign[i], neu: n.assign[i], onsetBeforeAtMs: R.finals[i].prov ? R.finals[i].at - R.finals[i].prov.onsetAt : null });
    }
  }
  // calibration: finals that straddle a close of the OLD replay (onset < close <= arrival), by the close's reason
  const closesO = o.out.filter((x) => x.d.kind === 'close');
  const strad = [];
  R.finals.forEach((f, i) => {
    const lc = [...closesO].reverse().find((x) => x.at <= f.at);
    if (lc && f.prov && f.prov.onsetAt < lc.at) strad.push(`${lc.d.reason}:${itemAt(R, f.at)}${n.absorbed.includes(i) ? ':ABSORBED' : ''}`);
  });
  total.straddles = (total.straddles ?? 0) + strad.length;
  if (strad.length) console.log(`    replay straddles (${strad.length}): ${strad.join(', ')}`);
  total.changedFinals += changedFinals; total.absorbed += n.absorbed.length; total.chipDrops += n.chipDrops.length; total.decisionDiffs += diffsDec.length;
  const cl = (x) => JSON.stringify(x);
  console.log(`${name} era=${R.era ? 'turn' : 'pre'} voice=wav${R.wavd}/coarse${R.coarse} finals=${R.finals.length} dets=${R.dets.length} | logged gates=${R.loggedGates} answers=${R.loggedAnswers} closes=${cl(R.loggedCloses)} | old: dispatch+supersede=${o.out.filter((x) => x.d.kind === 'dispatch' || x.d.kind === 'supersede').length} answered=${o.answers} closes=${cl(closesOf(o))} | new: same=${n.out.filter((x) => x.d.kind === 'dispatch' || x.d.kind === 'supersede').length} absorbed=${n.absorbed.length} chipDrops=${n.chipDrops.length} | changedFinals=${changedFinals} decisionDiffs=${diffsDec.length}`);
  for (const d of diffsDec) console.log(`    ${d}`);
}
console.log(`\nTOTAL runs=${total.runs} finals=${total.finals} changedFinals=${total.changedFinals} absorbed=${total.absorbed} chipDrops=${total.chipDrops} decisionDiffs=${total.decisionDiffs}`);
console.log('CHANGES (run, final time, item, words, old assignment, new assignment, onset-before-arrival ms):');
for (const c of changes) console.log(JSON.stringify(c));
