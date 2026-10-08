// REVIEW THROWAWAY: crafted event sequences through proto.ts (the spec's flag-on machine as I read it) that the spec's
// own fixture list does not cover. Each prints the decisions and the final state.
import { createTurn, C } from './proto.ts';
const T = 1_000_000;
const drain = (turn, from, until, log) => { let clock = from; for (let g = 0; g < 80; g++) { let d = turn.tick(clock); while (d.kind !== 'idle' && d.kind !== 'hold') { log.push(`${((clock - T) / 1000).toFixed(1)}s ${d.kind}${d.reason ? ' ' + d.reason : ''}${d.finals !== undefined ? ' finals=' + d.finals : ''}${d.text && d.kind !== 'close' ? ' "' + d.text.slice(0, 70) + '"' : ''}`); if (d.kind === 'classify') log.pending = d; d = turn.tick(clock); } const n = turn.nextTimerAt(clock); if (n === null || n > until) break; clock = n; } return clock; };
const on = { revive: true, echo: true };

// A. A final lands while the FIRST classify is in flight; the verdict (a "no" on the shorter text) is ignored as stale-finals;
//    no other ear fires. Then the next question starts 15 s later.
{
  const turn = createTurn(on); const log = [];
  turn.speech(true, T); turn.final('We have a batch job that writes daily partitions.', T + 3000); turn.speech(false, T + 3500);
  drain(turn, T + 3500, T + 4700, log); const cls = log.pending; // classify at 4.7 s, finals=1
  turn.final('It sometimes fails halfway through.', T + 4800);   // lands during the call
  const o = turn.detected('whisper', T + 5100, 'not-a-question', cls.turn, { finals: cls.finals });
  log.push(`5.1s verdict no on finals=${cls.finals} -> ${JSON.stringify(o)}; snapshot ${JSON.stringify(turn.snapshot())}`);
  drain(turn, T + 5100, T + 19000, log);
  log.push(`19.0s snapshot ${JSON.stringify(turn.snapshot())}`);
  turn.speech(true, T + 20000); turn.final('How would you make it restartable without duplicating writes?', T + 24000); turn.speech(false, T + 24500);
  turn.detected('whisper', T + 25000, undefined, undefined, { text: 'How would you make it restartable without duplicating writes?' });
  drain(turn, T + 25000, T + 40000, log);
  console.log(`A (stale-finals "no", no other ear, no re-arm for an undeclined turn):\n  ${log.join('\n  ')}`);
}
// A2. Same with the re-arm that the spec's E2 text implies ("the re-armed classify decides").
{
  const turn = createTurn(on, undefined, { rearmUndetected: true }); const log = [];
  turn.speech(true, T); turn.final('We have a batch job that writes daily partitions.', T + 3000); turn.speech(false, T + 3500);
  drain(turn, T + 3500, T + 4700, log); const cls = log.pending;
  turn.final('It sometimes fails halfway through.', T + 4800);
  const o = turn.detected('whisper', T + 5100, 'not-a-question', cls.turn, { finals: cls.finals });
  log.push(`5.1s verdict -> ${JSON.stringify(o)}`);
  drain(turn, T + 5100, T + 19000, log);
  console.log(`A2 (same, with a re-arm on any undetected turn):\n  ${log.join('\n  ')}`);
}
// B. A declined statement; the next real question is asked within the window and the detector says yes on it (a chip whose
//    text is the question only). The revive dispatches statement + question as one pinned text.
{
  const turn = createTurn(on); const log = [];
  turn.speech(true, T + 20000); turn.speech(false, T + 22500); turn.final('Great, thanks for walking me through that.', T + 23200);
  drain(turn, T + 22500, T + 23700, log); const cls = log.pending;
  log.push(`24.1s ${JSON.stringify(turn.detected('whisper', T + 24100, 'not-a-question', cls.turn, { finals: cls.finals }))}`);
  turn.speech(true, T + 27000); turn.speech(false, T + 31000); turn.final('What is the difference between a process and a thread?', T + 31700);
  log.push(`33.2s chip ${JSON.stringify(turn.detected('whisper', T + 33200, undefined, undefined, { text: 'What is the difference between a process and a thread?' }))}`);
  drain(turn, T + 33200, T + 50000, log);
  console.log(`B (S-3 with the chip after the gate):\n  ${log.join('\n  ')}`);
}
// C. A declined statement, then a SHORT real question inside the window whose chip text has 3 content words
//    ("Why use Kafka?"): quoteScore = 0 under the 4-content-word floor, so the positive REPLACES the declined turn and
//    the fresh turn has no text of its own.
{
  const turn = createTurn(on); const log = [];
  turn.speech(true, T + 20000); turn.speech(false, T + 22500); turn.final('Okay, that makes sense, thanks for that.', T + 23200);
  drain(turn, T + 22500, T + 23700, log); const cls = log.pending;
  log.push(`24.1s ${JSON.stringify(turn.detected('whisper', T + 24100, 'not-a-question', cls.turn, { finals: cls.finals }))}`);
  turn.speech(true, T + 26000); turn.speech(false, T + 27500); turn.final('So why would you use Kafka here?', T + 28100);
  log.push(`29.6s chip ${JSON.stringify(turn.detected('whisper', T + 29600, undefined, undefined, { text: 'Why would you use Kafka here?' }))}`);
  log.push(`snapshot ${JSON.stringify(turn.snapshot())}`);
  drain(turn, T + 29600, T + 50000, log);
  console.log(`C (a short real question after a declined statement; chip under the content-word floor):\n  ${log.join('\n  ')}`);
}
// D. The echo test vs a follow-up whose Live claim inlines the parent's terms (the s50g S2Q01F shape, real texts).
{
  const turn = createTurn(on); const log = [];
  const parent = 'Explain your rag pipeline precisely walk through ingestion, parsing, chunking, embedding, retrieval, re ranking, context assembly, and generation, and map those stages to your document intelligence experience.';
  turn.speech(true, T); turn.final(parent, T + 16000); turn.speech(false, T + 16300); turn.detected('whisper', T + 16500, undefined, undefined, { text: parent });
  drain(turn, T + 16500, T + 40000, log);
  // follow-up asked 60 s later; the classify is still in flight (or declined) when Live's on-time claim arrives
  turn.speech(true, T + 76000); turn.final('Which of those stages can cause a correct', T + 79000); turn.final('source document to produce an incorrect answer?', T + 81400); turn.speech(false, T + 81000);
  const c = turn.liveClaim('Of the RAG pipeline stages (ingestion, parsing, chunking, embedding, retrieval, re-ranking, context assembly, generation), which can cause a correct source document to produce an incorrect answer?', T + 83000);
  log.push(`83.0s liveClaim -> ${JSON.stringify(c).slice(0, 200)}; snapshot ${JSON.stringify(turn.snapshot())}`);
  console.log(`D (s50g S2Q01F shape):\n  ${log.join('\n  ')}`);
}
