// RECHECK THROWAWAY: the same inputs through TODAY's machine (run/dispatcher/src/interviewerTurn.ts, byte-identical to
// WT electron/services/interviewerTurn.ts apart from nothing: cmp says identical) and through r2's prototype, for
//   X1  the late inlining rescue after a declined window (today: does the follow-up get answered?)
//   X4  S-1L made realistic: the STT-missed question's own voice span lands on the declined turn (r2) / opens a turn
//       (today); its Live claim arrives 3 s after its voice-off. Same dispatch time in both?
//   X4b the same with the claim arriving after the declined window expired (voice span later in the window).
// The deduper is modelled for X1 with ChipDeduper (run/dispatcher/src/ChipDeduper.ts, import-specifier copy).
import { createInterviewerTurn } from './run/dispatcher/src/interviewerTurn.ts';
import { ChipDeduper } from './run/dispatcher/src/ChipDeduper.ts';
import { createTurn } from './run/x/r2/proto-r2.ts';
const T = 1_000_000;
const s = (ms) => ((ms - T) / 1000).toFixed(1) + 's';
// a driver that works for both APIs: today = { liveClaim + detected, detected(...verdict, forTurn) }, r2 = { evidence, verdict }
function driver(kind) {
  const m = kind === 'today' ? createInterviewerTurn() : createTurn({ revive: true, echo: true });
  const out = []; let pending = null; let clock = T;
  const dedup = new ChipDeduper({ now: () => clock });
  const drain = (from, until) => { clock = from; for (let g = 0; g < 200; g++) { let d = m.tick(clock); while (d.kind !== 'idle' && d.kind !== 'hold') { if (d.kind === 'classify') pending = d; if (d.kind === 'dispatch') { const r = dedup.admit({ question: d.text, source: d.fromLive ? 'live' : 'whisper', anchor: d.text }); if (r.admitted) dedup.markAnswered(r.id); out.push(`${s(clock)} dispatch finals=${d.finals} fromLive=${d.fromLive} ${r.admitted ? 'ADMITTED' : 'DEDUP-DROPPED'} "${d.text.slice(0, 50)}"`); } else out.push(`${s(clock)} ${d.kind}${d.reason ? ' ' + d.reason : ''}${d.finals !== undefined ? ' finals=' + d.finals : ''}`); d = m.tick(clock); } const n = m.nextTimerAt(clock); if (n === null || n > until) break; clock = n; } };
  const ev = (at, src, text) => { clock = at; if (kind === 'today') { if (src === 'live') m.liveClaim(text, at); m.detected(src, at); out.push(`${s(at)} ${src} mark`); } else { const o = m.evidence(src, text, at); out.push(`${s(at)} ${src} evidence -> ${o.kind}`); } };
  const vd = (at, v) => { clock = at; if (kind === 'today') m.detected('whisper', at, v === 'question' ? 'question' : 'not-a-question', pending.turn); else m.verdict(v, pending.turn, pending.finals, at); out.push(`${s(at)} verdict ${v}`); };
  return { m, out, drain, ev, vd };
}
const PARENT = 'Explain your rag pipeline precisely walk through ingestion, parsing, chunking, embedding, retrieval, re ranking, context assembly, and generation, and map those stages to your document intelligence experience.';
const INLINING = 'Of the RAG pipeline stages (ingestion, parsing, chunking, embedding, retrieval, re-ranking, context assembly, generation), which can cause a correct source document to produce an incorrect answer?';
for (const kind of ['today', 'r2']) {
  const d = driver(kind);
  d.m.speech(true, T); d.m.final(PARENT, T + 16000); d.m.speech(false, T + 16300); d.ev(T + 16500, 'whisper', PARENT); d.drain(T + 16500, T + 40000);
  d.m.speech(true, T + 76000); d.m.final('Which of those stages can cause a correct', T + 79000); d.m.speech(false, T + 81000); d.m.final('source document to produce an incorrect answer?', T + 81400);
  d.drain(T + 81000, T + 82300); d.vd(T + 82700, 'not-a-question'); d.drain(T + 82700, T + 91900);
  d.ev(T + 92000, 'live', INLINING); d.drain(T + 92000, T + 130000);
  const answered = d.out.some((l) => /ADMITTED/.test(l) && /Of the RAG|Which of those/.test(l));
  console.log(`== X1 ${kind}: the follow-up answered: ${answered}\n  ${d.out.join('\n  ')}\n`);
}
for (const [label, qOn, qOff, claimAt] of [['X4', 25000, 27000, 30000], ['X4b', 28000, 30000, 33000]]) {
  for (const kind of ['today', 'r2']) {
    const d = driver(kind);
    d.m.speech(true, T + 20000); d.m.speech(false, T + 22500); d.m.final('Great, thanks for walking me through that.', T + 23200);
    d.drain(T + 22500, T + 23700); d.vd(T + 24100, 'not-a-question'); d.drain(T + 24100, T + qOn - 1);
    d.m.speech(true, T + qOn); d.drain(T + qOn, T + qOff - 1); d.m.speech(false, T + qOff); d.drain(T + qOff, T + claimAt - 1);   // the missed question: VAD only, no finals
    d.ev(T + claimAt, 'live', 'How would you index those tables for range queries?'); d.drain(T + claimAt, T + 60000);
    console.log(`== ${label} ${kind} (question voice ${s(T + qOn)}-${s(T + qOff)}, claim ${s(T + claimAt)})\n  ${d.out.join('\n  ')}\n`);
  }
}
