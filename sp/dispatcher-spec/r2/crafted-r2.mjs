// r2 THROWAWAY: the r2 spec's crafted fixtures S-1..S-16 (§6.7) through proto-r2.ts, each with its asserted outcomes
// checked in code (rule 8: a crafted case that cannot fail proves nothing). Synthetic times; verdict latency 400 ms
// unless the case copies a run. Prints PASS/FAIL per case and the decision trail. Question text only.
import { createTurn, judgeEvidence } from './proto-r2.ts';
const T = 1_000_000;
const on = { revive: true, echo: true };
const s = (ms) => ((ms - T) / 1000).toFixed(1) + 's';
const mk = () => {
  const log = []; const turn = createTurn(on); const dispatches = []; const closes = []; const classifies = [];
  const drain = (from, until) => { let clock = from; for (let g = 0; g < 80; g++) { let d = turn.tick(clock); while (d.kind !== 'idle' && d.kind !== 'hold') { log.push(`${s(clock)} ${d.kind}${d.reason ? ' ' + d.reason : ''}${d.finals !== undefined ? ' finals=' + d.finals : ''}${d.path ? ' path=' + d.path : ''}${d.live ? ' live=' + d.live.length : ''}${d.text && d.kind !== 'close' ? ' "' + d.text.slice(0, 70) + '"' : ''}`); if (d.kind === 'classify') { log.pending = d; classifies.push({ at: clock, ...d }); } if (d.kind === 'dispatch') dispatches.push({ at: clock, ...d }); if (d.kind === 'close') closes.push({ at: clock, reason: d.reason }); d = turn.tick(clock); } const n = turn.nextTimerAt(clock); if (n === null || n > until) break; clock = n; } return clock; };
  const ev = (at, src, text) => { const o = turn.evidence(src, text, at); log.push(`${s(at)} ${src} evidence -> ${JSON.stringify(o).slice(0, 160)} q=${JSON.stringify(text.slice(0, 40))}`); return o; };
  const vd = (at, v, cls) => { const o = turn.verdict(v, cls.turn, cls.finals, at); log.push(`${s(at)} verdict ${v} (finals=${cls.finals}) -> ${JSON.stringify(o)}`); return o; };
  return { turn, log, drain, ev, vd, dispatches, closes, classifies, outcomes: [] };
};
const Q0 = 'How would you shard a Postgres table by tenant?';
const answerQ0 = (m) => { m.turn.speech(true, T); m.turn.final(Q0, T + 6700); m.turn.speech(false, T + 6000); m.ev(T + 7200, 'whisper', Q0); m.drain(T + 7200, T + 19000); };
const STATEMENT = 'Great, thanks for walking me through that.';
const declineStatement = (m, text = STATEMENT) => { m.turn.speech(true, T + 20000); m.turn.speech(false, T + 22500); m.turn.final(text, T + 23200); m.drain(T + 22500, T + 23700); const cls = m.log.pending; m.vd(T + 24100, 'not-a-question', cls); return cls; };
const results = [];
const run = (id, title, fn) => {
  const m = mk(); const checks = [];
  const expect = (name, ok) => checks.push({ name, ok });
  try { fn(m, expect); } catch (e) { checks.push({ name: `threw ${e.message}`, ok: false }); }
  const pass = checks.every((c) => c.ok);
  results.push({ id, pass });
  console.log(`== ${id} ${pass ? 'PASS' : 'FAIL'}: ${title}\n  ${m.log.join('\n  ')}\n  checks: ${checks.map((c) => `${c.ok ? 'ok' : 'FAIL'}:${c.name}`).join('; ')}`);
};
const lastDispatch = (m) => m.dispatches[m.dispatches.length - 1];

run('S-1', 'a declined statement; a stale non-quoting whisper chip -> ignored (no unjudged tail); the window expires as not-a-question', (m, expect) => {
  declineStatement(m);
  const o = m.ev(T + 25500, 'whisper', 'What is a consumer group in Kafka and why does it matter?');
  m.drain(T + 25500, T + 45000);
  expect('ignored no-quote', o.kind === 'ignored' && o.why === 'no-quote');
  expect('no dispatch', m.dispatches.length === 0);
  expect('close not-a-question at 32.1', m.closes.length === 1 && m.closes[0].reason === 'not-a-question' && m.closes[0].at === T + 32100);
});
run('S-1L', 'a declined statement; a non-quoting LIVE claim (a question the STT missed) -> split-replace with 0 moved finals: a Live-only turn, dispatched on the unfinished hold', (m, expect) => {
  declineStatement(m);
  const o = m.ev(T + 25500, 'live', 'How would you index those tables for range queries?');
  m.drain(T + 25500, T + 45000);
  expect('replaced-declined moved=0', o.kind === 'replaced-declined' && o.moved === 0 && o.closed === 'not-a-question');
  expect('one Live-only dispatch', m.dispatches.length === 1 && m.dispatches[0].fromLive === true && m.dispatches[0].finals === 0);
  expect('dispatched on the unfinished hold at 26.2 (voice stop 22.5 + 3.7)', m.dispatches[0]?.at === T + 26200 && m.dispatches[0].path === 'unfinished');
});
run('S-2', 'a declined statement and nothing after it -> exactly one close, not-a-question, at verdict + 8 s', (m, expect) => {
  declineStatement(m);
  m.drain(T + 24100, T + 45000);
  expect('no dispatch', m.dispatches.length === 0);
  expect('one close at 32.1', m.closes.length === 1 && m.closes[0].at === T + 32100 && m.closes[0].reason === 'not-a-question');
});
run('S-3', 'a declined statement, then a question inside the window; its chip (before the gate) quotes the joined finals -> revive; ONE dispatch of statement + question at the gate', (m, expect) => {
  declineStatement(m);
  m.turn.speech(true, T + 27000); m.turn.speech(false, T + 31000); m.turn.final('What is the difference between a process and a thread?', T + 31700);
  const o = m.ev(T + 32000, 'whisper', 'What is the difference between a process and a thread?');
  m.drain(T + 32000, T + 50000);
  expect('revived forward 1.0 finals=2', o.kind === 'revived' && o.rule === 'forward' && o.score === 1 && o.finals === 2);
  expect('one dispatch at 32.2 finals=2', m.dispatches.length === 1 && m.dispatches[0].at === T + 32200 && m.dispatches[0].finals === 2 && m.dispatches[0].fromLive === false);
  expect('text = statement + question', m.dispatches[0]?.text === `${STATEMENT} What is the difference between a process and a thread?`);
});
run('S-3b', 'as S-3 with no chip: the re-armed classify (finals=2) gets a crafted "question" -> revive by verdict; one dispatch from both finals', (m, expect) => {
  declineStatement(m);
  m.turn.speech(true, T + 27000); m.turn.speech(false, T + 31000); m.turn.final('What is the difference between a process and a thread?', T + 31700);
  m.drain(T + 31700, T + 32300); const cls = m.log.pending;
  expect('re-armed classify at 32.2 finals=2', cls && cls.finals === 2 && cls.rearmed === true && m.classifies[m.classifies.length - 1].at === T + 32200);
  const o = m.vd(T + 32600, 'question', cls);
  m.drain(T + 32600, T + 50000);
  expect('revived by verdict', o.kind === 'revived' && o.by === 'verdict');
  expect('one dispatch at 32.6 finals=2', m.dispatches.length === 1 && m.dispatches[0].at === T + 32600 && m.dispatches[0].finals === 2);
});
run('S-4', 'Q0 answered; the STT silent; a Live claim for a NEW question reusing Q0\'s words -> absorbed (the accepted residual, pinned)', (m, expect) => {
  answerQ0(m);
  const o = m.ev(T + 40000, 'live', 'Would you shard that Postgres table by tenant or by region?');
  m.drain(T + 40000, T + 60000);
  expect('absorbed at 0.71', o.kind === 'absorbed' && Math.abs(o.score - 5 / 7) < 1e-9);
  expect('Q0 answered once, nothing else', m.dispatches.length === 1);
});
run('S-5', 'Q0 at 7 s and Q1 at 60 s answered; Q2\'s finals open at 120 s; a Live claim with Q0\'s text at 121 s -> absorbed (two turns back); Q2 dispatches with live=[]', (m, expect) => {
  answerQ0(m);
  m.turn.speech(true, T + 55000); m.turn.final('What is a DAG?', T + 59000); m.turn.speech(false, T + 59200); m.ev(T + 60000, 'whisper', 'What is a directed acyclic graph?'); m.drain(T + 60000, T + 75000);
  m.turn.speech(true, T + 115000); m.turn.final('How would you index those tables, and what changes if history is kept?', T + 120000); m.turn.speech(false, T + 120200);
  const o = m.ev(T + 121000, 'live', Q0);
  m.ev(T + 121500, 'whisper', 'How would you index those tables, and what changes if history is kept?');
  m.drain(T + 121500, T + 140000);
  expect('absorbed, echo of Q0 (two back)', o.kind === 'absorbed' && o.of === Q0 && o.score === 1);
  expect('Q2 dispatched once with live=[]', m.dispatches.length === 3 && lastDispatch(m).live.length === 0 && lastDispatch(m).finals === 1);
});
run('S-6', 'C3: a declined statement, then a SHORT question whose chip has 3 content words (unscorable; the reverse rule scores 3/8) -> split-replace: the question\'s own final moves to the fresh turn and is answered alone, as today', (m, expect) => {
  declineStatement(m, 'Okay, that makes sense, thanks for that.');
  m.turn.speech(true, T + 26000); m.turn.speech(false, T + 27500); m.turn.final('So why would you use Kafka here?', T + 28100);
  const o = m.ev(T + 29600, 'whisper', 'Why would you use Kafka here?');
  m.drain(T + 29600, T + 50000);
  expect('split-replace, 1 final moved, unscorable', o.kind === 'replaced-declined' && o.moved === 1 && o.unscorable === true && o.closed === 'not-a-question');
  expect('one dispatch of the question alone at 29.6', m.dispatches.length === 1 && m.dispatches[0].text === 'So why would you use Kafka here?' && m.dispatches[0].at === T + 29600 && m.dispatches[0].finals === 1);
});
run('S-6L', 'a declined statement; a Live claim for a question the STT missed entirely (no rejoined finals) -> split-replace with 0 moved: Live-only, today\'s rescue path', (m, expect) => {
  declineStatement(m, 'Okay, that makes sense, thanks for that.');
  const o = m.ev(T + 27000, 'live', 'How would you index those tables for range queries?');
  m.drain(T + 27000, T + 50000);
  expect('split-replace moved=0', o.kind === 'replaced-declined' && o.moved === 0);
  expect('one Live-only dispatch at 27.0 (hold already elapsed since the stop at 22.5)', m.dispatches.length === 1 && m.dispatches[0].fromLive === true && m.dispatches[0].at === T + 27000);
});
const PARENT = 'Explain your rag pipeline precisely walk through ingestion, parsing, chunking, embedding, retrieval, re ranking, context assembly, and generation, and map those stages to your document intelligence experience.';
const INLINING = 'Of the RAG pipeline stages (ingestion, parsing, chunking, embedding, retrieval, re-ranking, context assembly, generation), which can cause a correct source document to produce an incorrect answer?';
const followUp = (m) => { m.turn.speech(true, T); m.turn.final(PARENT, T + 16000); m.turn.speech(false, T + 16300); m.ev(T + 16500, 'whisper', PARENT); m.drain(T + 16500, T + 40000); m.turn.speech(true, T + 76000); m.turn.final('Which of those stages can cause a correct', T + 79000); m.turn.final('source document to produce an incorrect answer?', T + 81400); m.turn.speech(false, T + 81000); };
run('S-7', 'I1 (the s50g shape, real texts): the parent answered; the follow-up\'s finals open, undetected; Live\'s on-time claim inlines the parent\'s list -> JOINS (its residual words are in the finals), not absorbed', (m, expect) => {
  followUp(m);
  const j = judgeEvidence(INLINING, 'Which of those stages can cause a correct source document to produce an incorrect answer?', m.turn.remembered);
  m.log.push(`judge: ${JSON.stringify(j)}`);
  const o = m.ev(T + 83000, 'live', INLINING);
  m.drain(T + 83000, T + 100000);
  expect('judge: remembered match >= 0.5, residual mostly in the finals, not an echo', j.remScore >= 0.5 && j.quotesOpen && !j.echo);
  expect('marked (joined)', o.kind === 'marked');
  expect('follow-up dispatched once from its finals with the claim in live[]', m.dispatches.length === 2 && lastDispatch(m).finals === 2 && lastDispatch(m).live.length === 1);
});
run('S-7D', 'as S-7 but the classify DECLINED the follow-up first; the inlining claim revives it through its residual words -> answered from its own finals', (m, expect) => {
  followUp(m);
  m.drain(T + 81400, T + 82300); const cls = m.log.pending;
  m.vd(T + 82600, 'not-a-question', cls);
  const o = m.ev(T + 83000, 'live', INLINING);
  m.drain(T + 83000, T + 100000);
  expect('revived forward', o.kind === 'revived' && o.rule === 'forward');
  expect('one follow-up dispatch finals=2', m.dispatches.length === 2 && lastDispatch(m).finals === 2 && lastDispatch(m).fromLive === false);
});
run('S-8', 'I2: Q0 answered; a statement RESTATING it is declined; a stale whisper re-fire of Q0 -> absorbed (nothing new); a stale Live re-fire -> absorbed; the statement expires unanswered', (m, expect) => {
  answerQ0(m);
  declineStatement(m, 'Okay, so you would shard the Postgres table by tenant, got it.');
  const a = m.ev(T + 25500, 'whisper', Q0);
  const b = m.ev(T + 26000, 'live', Q0);
  m.drain(T + 26000, T + 45000);
  expect('both re-fires absorbed', a.kind === 'absorbed' && b.kind === 'absorbed');
  expect('Q0 answered once; the statement never', m.dispatches.length === 1);
  expect('the statement closes not-a-question at 32.1', m.closes.some((c) => c.reason === 'not-a-question' && c.at === T + 32100));
});
run('S-8b', 'honesty pin: the re-armed classify on a statement + question turn says "question" -> the joined text is answered, statement prefix included', (m, expect) => {
  declineStatement(m);
  m.turn.speech(true, T + 27000); m.turn.speech(false, T + 31000); m.turn.final('What is the difference between a process and a thread?', T + 31700);
  m.drain(T + 31700, T + 32300); const cls = m.log.pending;
  m.vd(T + 32600, 'question', cls);
  m.drain(T + 32600, T + 50000);
  expect('one dispatch, text starts with the statement', m.dispatches.length === 1 && m.dispatches[0].text.startsWith(STATEMENT) && m.dispatches[0].finals === 2);
});
run('S-9', 'I3: a final lands while the FIRST classify is in flight; the "no" on the old count is ignored as stale-finals and the classify is re-armed; a "question" on the grown text dispatches', (m, expect) => {
  m.turn.speech(true, T); m.turn.final('We have a batch job that writes daily partitions.', T + 3000); m.turn.speech(false, T + 3500);
  m.drain(T + 3500, T + 4700); const cls = m.log.pending;
  m.turn.final('How would you make it restartable without duplicating writes?', T + 4800);
  const o = m.vd(T + 5100, 'not-a-question', cls);
  m.drain(T + 5100, T + 5300); const cls2 = m.log.pending;
  const o2 = m.vd(T + 5600, 'question', cls2);
  m.drain(T + 5600, T + 20000);
  expect('stale-finals ignored', o.kind === 'ignored' && o.why === 'stale-finals');
  expect('re-armed classify at 5.2 with finals=2', cls2 && cls2.finals === 2 && cls2 !== cls);
  expect('marked by the verdict; one dispatch finals=2 at 5.6', o2.kind === 'marked' && m.dispatches.length === 1 && m.dispatches[0].finals === 2 && m.dispatches[0].at === T + 5600);
});
run('S-10', 'I9: a chip marks the turn before the gate; a late negative verdict for the same turn and count -> ignored (marked); the dispatch stands', (m, expect) => {
  m.turn.speech(true, T); m.turn.final('Why did you choose XGBoost for the churn model?', T + 4000);
  m.ev(T + 4200, 'whisper', 'Why did you choose XGBoost for the churn model?');
  const o = m.turn.verdict('not-a-question', 1, 1, T + 4300); m.log.push(`4.3s verdict no on the marked turn -> ${JSON.stringify(o)}`);
  m.turn.speech(false, T + 4400);
  m.drain(T + 4400, T + 20000);
  expect('ignored marked', o.kind === 'ignored' && o.why === 'marked');
  expect('one dispatch at the gate 5.6', m.dispatches.length === 1 && m.dispatches[0].at === T + 5600);
});
run('S-11', 'the re-smoke\'s S1Q08F shape (real texts, log-relative times): a 3-word fragment is declined; its verbatim chip revives it by the REVERSE rule; the Live claim and the continuation final join; one whole dispatch', (m, expect) => {
  // log: voice-off 39.5 (= classify 40.704 - 1.2); final 1 at +0.29; classify +1.2; verdict +2.08 (881 ms); chip +2.34; Live +2.77; final 2 +3.09; chip +3.44
  m.turn.speech(true, T); m.turn.speech(false, T + 4880); m.turn.final('How could repeatedly', T + 5170);
  m.drain(T + 4880, T + 6100); const cls = m.log.pending;
  const v = m.vd(T + 6961, 'not-a-question', cls);
  const o = m.ev(T + 7215, 'whisper', 'How could repeatedly');
  const o2 = m.ev(T + 7651, 'live', 'How could repeatedly training on customers affected by previous campaigns introduce bias?');
  m.turn.final('training on customers affected by previous campaigns introduce bias?', T + 7965);
  m.ev(T + 8317, 'whisper', 'How could repeatedly training on customers affected by previous campaigns introduce bias?');
  m.drain(T + 8317, T + 25000);
  expect('declined on finals=1', v.kind === 'declined');
  expect('revived by the reverse rule (2 of 2 content words in the chip)', o.kind === 'revived' && o.rule === 'reverse' && o.score === 1 && o.finals === 1);
  expect('the Live claim joins', o2.kind === 'marked');
  expect('one whole dispatch from 2 finals', m.dispatches.length === 1 && m.dispatches[0].finals === 2 && m.dispatches[0].fromLive === false && m.dispatches[0].text === 'How could repeatedly training on customers affected by previous campaigns introduce bias?');
  expect('dispatched at the settle after final 2 (8.365)', m.dispatches[0]?.at === T + 8365 && m.dispatches[0].path === 'gate');
});
run('S-12', 'the re-smoke\'s S1Q07F shape with the verdict landing BEFORE the question\'s final (what a 400 ms verdict would have done): the lead-in is declined; the question final rejoins; its chip quotes the joined finals -> revive; one dispatch of lead-in + question', (m, expect) => {
  m.turn.speech(true, T); m.turn.speech(false, T + 2020); m.turn.speech(true, T + 2920); m.turn.final('A nightly job fails halfway through.', T + 7150); m.turn.speech(false, T + 7200);
  m.drain(T + 7200, T + 8400); const cls = m.log.pending;
  const v = m.vd(T + 8800, 'not-a-question', cls);
  m.turn.final('How do you resume it without duplicate campaign actions or mixed model versions?', T + 8893);
  const o = m.ev(T + 10048, 'whisper', 'How do you resume it without duplicate campaign actions or mixed model versions?');
  m.ev(T + 10743, 'live', 'A nightly job fails halfway through. How do you resume it without duplicate campaign actions or mixed model versions?');
  m.drain(T + 10743, T + 30000);
  expect('declined on finals=1', v.kind === 'declined');
  expect('revived forward 1.0 with finals=2', o.kind === 'revived' && o.rule === 'forward' && o.score === 1 && o.finals === 2);
  expect('one dispatch, lead-in + question, from the finals', m.dispatches.length === 1 && m.dispatches[0].finals === 2 && m.dispatches[0].fromLive === false && m.dispatches[0].text.startsWith('A nightly job fails halfway through. How do you resume'));
  expect('the statement never dispatched alone', !m.dispatches.some((d) => d.text === 'A nightly job fails halfway through.'));
});
run('S-13', 'the reverse rule\'s negative: a declined statement with 5 content words; an unscorable chip of a different short question ("Why not Redis then?", 2 content words, none shared) -> reverse 0 of 5; no tail -> ignored; the statement is never answered', (m, expect) => {
  declineStatement(m, 'Okay, that makes sense, thanks for that.');
  const o = m.ev(T + 25500, 'whisper', 'Why not Redis then?');
  m.drain(T + 25500, T + 45000);
  expect('ignored unscorable (reverse 0/5)', o.kind === 'ignored' && o.why === 'unscorable' && o.score === 0);
  expect('no dispatch', m.dispatches.length === 0);
  const m2 = mk(); declineStatement(m2, 'Okay, that makes sense, thanks for that.');
  const o2 = m2.ev(T + 25500, 'whisper', 'Thanks, what about cost?');
  m2.drain(T + 25500, T + 45000);
  m.log.push(`(a 4-content-word chip sharing one word, "Thanks, what about cost?": ${JSON.stringify(o2)}; dispatches ${m2.dispatches.length})`);
  expect('a scorable chip sharing one of five words is ignored no-quote (0.25)', o2.kind === 'ignored' && o2.why === 'no-quote' && m2.dispatches.length === 0);
});
run('S-13b', 'the reverse rule\'s accepted edge: an unscorable chip made of the declined text\'s own words ("Walking me through that?") -> quotes (3 of 5) -> the statement is revived and answered: the detector said yes on this text', (m, expect) => {
  declineStatement(m);
  const o = m.ev(T + 25500, 'whisper', 'Walking me through that?');
  m.drain(T + 25500, T + 45000);
  expect('revived reverse 0.6', o.kind === 'revived' && o.rule === 'reverse' && Math.abs(o.score - 0.6) < 1e-9);
  expect('one dispatch of the statement', m.dispatches.length === 1 && m.dispatches[0].text === STATEMENT);
});
run('S-14', 'U12 twin: four answered turns Q0..Q3; an echo of Q1 (three back) -> absorbed; then an echo of Q0 (four back, evicted) -> not absorbed: a Live-only turn, answered again, and itself remembered', (m, expect) => {
  const qs = [Q0, 'What is a consumer group in Kafka and why does it matter?', 'Why would you choose gRPC over REST for internal services?', 'How does a Bloom filter trade memory for false positives?'];
  qs.forEach((q, i) => { const t0 = T + i * 30000; m.turn.speech(true, t0); m.turn.final(q, t0 + 4000); m.turn.speech(false, t0 + 4200); m.ev(t0 + 4500, 'whisper', q); m.drain(t0 + 4500, t0 + 20000); });
  const a = m.ev(T + 130000, 'live', qs[1]); m.drain(T + 130000, T + 145000); const afterA = m.dispatches.length;
  const b = m.ev(T + 150000, 'live', qs[0]); m.drain(T + 150000, T + 165000);
  expect('Q1 (three back) absorbed, no fifth dispatch', a.kind === 'absorbed' && a.of === qs[1] && afterA === 4);
  expect('Q0 (four back) not absorbed: marked, then a Live-only dispatch', b.kind === 'marked' && m.dispatches.length === 5 && m.dispatches[4].fromLive === true);
  expect('the memory holds 3 and now ends with the Q0 echo', m.turn.remembered.length === 3 && m.turn.remembered[2].text === Q0);
});
run('S-15', '§9 residual: the interviewer repeats Q0 within 60 s and the STT hears it; Live\'s claim for the repeat -> absorbed (its words add nothing to the remembered Q0); the repeat\'s finals go to the classify as today', (m, expect) => {
  answerQ0(m);
  m.turn.speech(true, T + 30000); m.turn.final('Let me repeat that. How would you shard a Postgres table by tenant?', T + 34000); m.turn.speech(false, T + 34200);
  const o = m.ev(T + 35000, 'live', Q0);
  m.drain(T + 35000, T + 50000);
  expect('absorbed', o.kind === 'absorbed');
  expect('the repeat turn is left to the classify (asked at 35.4)', m.classifies.some((c) => c.at === T + 35400));
});
run('S-16', 'Minor 11, second fragility: the re-armed classify\'s own chip paraphrases the declined text under the bar -> with a tail, split-replace of the tail BEFORE its own "question" verdict lands, which then hits stale-turn; the tail is answered, the judged head is not', (m, expect) => {
  m.turn.speech(true, T); m.turn.speech(false, T + 5000); m.turn.final('Now add delayed outcomes and experimentation to the churn platform design.', T + 5700);
  m.drain(T + 5000, T + 6200); const cls = m.log.pending;
  m.vd(T + 6600, 'not-a-question', cls);
  m.turn.final('Design the logging and the joins.', T + 7000);
  m.drain(T + 7000, T + 8300); const cls2 = m.log.pending;
  const o = m.ev(T + 8500, 'whisper', 'Describe experiment assignment, label arrival and retraining selection.');
  const v = m.vd(T + 8600, 'question', cls2);
  m.drain(T + 8600, T + 30000);
  expect('split-replace moved=1', o.kind === 'replaced-declined' && o.moved === 1);
  expect('its verdict hits stale-turn', v.kind === 'ignored' && v.why === 'stale-turn');
  expect('the tail is dispatched alone', m.dispatches.length === 1 && m.dispatches[0].text === 'Design the logging and the joins.');
});
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} crafted cases read as asserted; failing: [${results.filter((r) => !r.pass).map((r) => r.id).join(' ')}]`);
