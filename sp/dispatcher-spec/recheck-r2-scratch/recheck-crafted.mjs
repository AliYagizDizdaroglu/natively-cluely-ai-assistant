// RECHECK THROWAWAY: three shapes the r2 crafted set does not pin, run through r2's own prototype (proto-r2.ts, the
// copy under run/x/r2), with r2's own helpers copied from crafted-r2.mjs (same T, same statement, same drain).
//   X1  a follow-up declined, its window expires, then its inlining Live claim arrives late (s50e's +11.0 s shape):
//       does the "late rescue takes today's path" claim (r2 §3.3, §9) hold?
//   X2  S-6's texts in the other real ordering: the re-armed classify (statement + question) answers BEFORE the
//       chip and says "no"; the chip then arrives: is the short question answered?
//   X3  S-6 as written but draining the machine's timers between the final and the chip (the crafted case skips it):
//       does the re-armed classify fire in between, and does the asserted outcome still hold?
// Synthetic texts only (scenario texts already quoted in r2). Prints the decision trail and a verdict per shape.
import { createTurn, judgeEvidence } from './run/x/r2/proto-r2.ts';
const T = 1_000_000;
const on = { revive: true, echo: true };
const s = (ms) => ((ms - T) / 1000).toFixed(1) + 's';
const mk = () => {
  const log = []; const turn = createTurn(on); const dispatches = []; const closes = []; const classifies = [];
  const drain = (from, until) => { let clock = from; for (let g = 0; g < 80; g++) { let d = turn.tick(clock); while (d.kind !== 'idle' && d.kind !== 'hold') { log.push(`${s(clock)} ${d.kind}${d.reason ? ' ' + d.reason : ''}${d.finals !== undefined ? ' finals=' + d.finals : ''}${d.path ? ' path=' + d.path : ''}${d.rearmed ? ' REARMED' : ''}${d.text && d.kind !== 'close' ? ' "' + d.text.slice(0, 60) + '"' : ''}`); if (d.kind === 'classify') { log.pending = d; classifies.push({ at: clock, ...d }); } if (d.kind === 'dispatch') dispatches.push({ at: clock, ...d }); if (d.kind === 'close') closes.push({ at: clock, reason: d.reason }); d = turn.tick(clock); } const n = turn.nextTimerAt(clock); if (n === null || n > until) break; clock = n; } return clock; };
  const ev = (at, src, text) => { const o = turn.evidence(src, text, at); log.push(`${s(at)} ${src} evidence -> ${JSON.stringify(o).slice(0, 170)} q=${JSON.stringify(text.slice(0, 40))}`); return o; };
  const vd = (at, v, cls) => { const o = turn.verdict(v, cls.turn, cls.finals, at); log.push(`${s(at)} verdict ${v} (finals=${cls.finals}) -> ${JSON.stringify(o)}`); return o; };
  return { turn, log, drain, ev, vd, dispatches, closes, classifies };
};
const show = (id, m, verdict) => console.log(`== ${id}: ${verdict}\n  ${m.log.join('\n  ')}\n`);

// X1 ---------------------------------------------------------------------------------------------------------------
{
  const PARENT = 'Explain your rag pipeline precisely walk through ingestion, parsing, chunking, embedding, retrieval, re ranking, context assembly, and generation, and map those stages to your document intelligence experience.';
  const INLINING = 'Of the RAG pipeline stages (ingestion, parsing, chunking, embedding, retrieval, re-ranking, context assembly, generation), which can cause a correct source document to produce an incorrect answer?';
  const m = mk();
  m.turn.speech(true, T); m.turn.final(PARENT, T + 16000); m.turn.speech(false, T + 16300); m.ev(T + 16500, 'whisper', PARENT); m.drain(T + 16500, T + 40000);
  // the follow-up: two finals, clip ends at 81.0 s; the classify on both finals says "no" (a model false negative)
  m.turn.speech(true, T + 76000); m.turn.final('Which of those stages can cause a correct', T + 79000); m.turn.speech(false, T + 81000); m.turn.final('source document to produce an incorrect answer?', T + 81400);
  m.drain(T + 81000, T + 82300); const cls = m.log.pending;
  m.vd(T + 82700, 'not-a-question', cls);
  m.drain(T + 82700, T + 91900);            // nothing fits within the window: it expires
  const j = judgeEvidence(INLINING, '', m.turn.remembered);
  m.log.push(`judge with no open finals: rem ${j.remScore.toFixed(2)} echo=${j.echo}`);
  const o = m.ev(T + 92000, 'live', INLINING); // the follow-up's own Live claim, +11.0 s after its clip end (s50e's lag)
  m.drain(T + 92000, T + 120000);
  const followUpAnswered = m.dispatches.some((d) => /incorrect answer/.test(d.text));
  show('X1 late inlining rescue after the declined window', m, `claim -> ${o.kind}; the follow-up answered: ${followUpAnswered} (dispatches ${m.dispatches.length}, closes [${m.closes.map((c) => c.reason)}])`);
}

// X2 ---------------------------------------------------------------------------------------------------------------
{
  const m = mk();
  m.turn.speech(true, T + 20000); m.turn.speech(false, T + 22500); m.turn.final('Okay, that makes sense, thanks for that.', T + 23200);
  m.drain(T + 22500, T + 23700); const cls = m.log.pending; m.vd(T + 24100, 'not-a-question', cls);
  m.turn.speech(true, T + 26000); m.turn.speech(false, T + 27500); m.turn.final('So why would you use Kafka here', T + 28100); // no '?': no fast path
  m.drain(T + 28100, T + 28800); const cls2 = m.log.pending;    // the re-armed classify at the first quiet (28.7 = stop 27.5 + gate 1.2)
  m.log.push(`(re-armed classify picked: finals=${cls2.finals} rearmed=${!!cls2.rearmed})`);
  m.vd(T + 29300, 'not-a-question', cls2);                       // the model says "no" on statement + question
  const o = m.ev(T + 29600, 'whisper', 'Why would you use Kafka here?'); // the debounce chip, 1.5 s after the final
  m.drain(T + 29600, T + 50000);
  const answered = m.dispatches.some((d) => /Kafka/.test(d.text));
  show('X2 S-6 texts, the re-armed classify first and "no"', m, `chip -> ${o.kind}${o.why ? ' ' + o.why : ''}; the question answered: ${answered}; closes [${m.closes.map((c) => c.reason)}]`);
}

// X3 ---------------------------------------------------------------------------------------------------------------
{
  const m = mk();
  m.turn.speech(true, T + 20000); m.turn.speech(false, T + 22500); m.turn.final('Okay, that makes sense, thanks for that.', T + 23200);
  m.drain(T + 22500, T + 23700); const cls = m.log.pending; m.vd(T + 24100, 'not-a-question', cls);
  m.turn.speech(true, T + 26000); m.turn.speech(false, T + 27500); m.turn.final('So why would you use Kafka here?', T + 28100);
  m.drain(T + 28100, T + 29590);                                 // S-6 skips this drain
  const o = m.ev(T + 29600, 'whisper', 'Why would you use Kafka here?');
  m.drain(T + 29600, T + 50000);
  const d = m.dispatches[0];
  show('X3 S-6 with the timers drained between the final and the chip', m, `re-armed classifies before the chip: ${m.classifies.filter((c) => c.rearmed && c.at < T + 29600).length}; chip -> ${o.kind}; dispatches ${m.dispatches.length}${d ? ` at ${s(d.at)} "${d.text}"` : ''}`);
}
