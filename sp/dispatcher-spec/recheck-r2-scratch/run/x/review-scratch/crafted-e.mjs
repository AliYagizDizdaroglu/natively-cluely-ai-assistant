// REVIEW THROWAWAY: a statement that restates the previous question, declined, then a stale whisper re-fire of that
// previous question (the detector's 30 s context still holds it). Whisper positives are not echo-tested (spec §3.4).
import { createTurn } from './proto.ts';
const T = 1_000_000;
const turn = createTurn({ revive: true, echo: true }); const log = [];
const drain = (from, until) => { let clock = from; for (let g = 0; g < 80; g++) { let d = turn.tick(clock); while (d.kind !== 'idle' && d.kind !== 'hold') { log.push(`${((clock - T) / 1000).toFixed(1)}s ${d.kind}${d.reason ? ' ' + d.reason : ''}${d.finals !== undefined ? ' finals=' + d.finals : ''}${d.text && d.kind !== 'close' ? ' "' + d.text + '"' : ''}`); if (d.kind === 'classify') log.pending = d; d = turn.tick(clock); } const n = turn.nextTimerAt(clock); if (n === null || n > until) break; clock = n; } };
const Q0 = 'How would you shard a Postgres table by tenant?';
turn.speech(true, T); turn.final(Q0, T + 6700); turn.speech(false, T + 6000); turn.detected('whisper', T + 7200, undefined, undefined, { text: Q0 });
drain(T + 7200, T + 19000);
const S = 'Okay, so you would shard the Postgres table by tenant, got it.';
turn.speech(true, T + 20000); turn.speech(false, T + 22500); turn.final(S, T + 23200);
drain(T + 22500, T + 23700); const cls = log.pending;
log.push(`24.1s verdict no -> ${JSON.stringify(turn.detected('whisper', T + 24100, 'not-a-question', cls.turn, { finals: cls.finals }))}`);
log.push(`25.5s stale whisper re-fire of Q0 -> ${JSON.stringify(turn.detected('whisper', T + 25500, undefined, undefined, { text: Q0 }))}`);
drain(T + 25500, T + 40000);
const t2 = createTurn({ revive: true, echo: true });
t2.speech(true, T); t2.final(Q0, T + 6700); t2.speech(false, T + 6000); t2.detected('whisper', T + 7200, undefined, undefined, { text: Q0 });
for (let c = T + 7200; c < T + 19000; c += 100) t2.tick(c);
t2.speech(true, T + 20000); t2.speech(false, T + 22500); t2.final(S, T + 23200); const d = t2.tick(T + 23700);
t2.detected('whisper', T + 24100, 'not-a-question', d.turn, { finals: d.finals });
log.push(`(same, but the re-fire is a Live claim: ${JSON.stringify(t2.liveClaim(Q0, T + 25500)).slice(0, 120)})`);
console.log(log.join('\n'));
