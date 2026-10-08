// Throwaway calibration script — NOT part of the deliverable.
// Builds the exact synthetic run planned for the fix-round test, runs it
// through the REAL computeRunFromFiles, and prints every field so the hand
// derivation can be checked before it goes into a permanent assertion.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { computeRunFromFiles, evaluateGate } from 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.metrics.mjs';

const T0 = Date.parse('2026-01-01T00:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i60-synth-'));

const timeline = {
    startedAt: iso(T0 - 10000),
    startedMs: T0 - 10000,
    startDebug: 0, endDebug: 1e9,
    startDiag: 0, endDiag: 1e9,
    items: [
        { id: 'Q1', kind: 'spoken', q: 'Explain how container orchestration platforms schedule workloads across a cluster.', playedAt: T0 + 0, clipSecs: 0 },
        { id: 'Q2', kind: 'spoken', q: 'Describe the tradeoffs between synchronous and asynchronous message queues.', playedAt: T0 + 120000, clipSecs: 0 },
        { id: 'Q3', kind: 'spoken', q: 'What happens when a distributed database partition loses network connectivity.', playedAt: T0 + 240000, clipSecs: 0 },
        { id: 'Q4', kind: 'spoken', q: 'How would you rotate credentials for a service without causing an outage.', playedAt: T0 + 360000, clipSecs: 0 },
    ],
    endedAt: iso(T0 + 420000),
};

const dbgLines = [
    `${iso(T0 + 2000)} [LOG] [Main] dispatch: answer source=live anchor="Explain how container orchestration platforms schedule workloads across a cluster." verdict=match`,
    `${iso(T0 + 121500)} [LOG] [Main] dispatch: chip source=whisper anchor="Describe the tradeoffs between synchronous and asynchronous message queues." verdict=shown`,
    `${iso(T0 + 121800)} [LOG] [Main] dispatch: drop source=live anchor="Describe the tradeoffs between synchronous and asynchronous message queues." verdict=paraphrase duplicateOf=whisper answered=false`,
    `${iso(T0 + 123000)} [LOG] [Main] dispatch: answer source=whisper anchor="Describe the tradeoffs between synchronous and asynchronous message queues." verdict=match`,
    `${iso(T0 + 361000)} [LOG] [Main] dispatch: drop source=live anchor="How would you rotate credentials for a service without causing an outage." verdict=paraphrase duplicateOf=whisper answered=false`,
    `${iso(T0 + 500000)} [LOG] [Main] dispatch: drop source=live anchor="The weather forecast mentioned scattered thunderstorms across the valley." verdict=replaced`,
    `${iso(T0 + 510000)} [LOG] [Main] dispatch: drop source=whisper anchor="Grocery shopping list includes bread milk and seasonal vegetables." verdict=replaced`,
    `${iso(T0 + 520000)} [LOG] [Main] dispatch: answer source=live anchor="The museum exhibit featured paintings from the early impressionist period." verdict=match`,
    `${iso(T0 + 1000)} [LOG] [DeepgramStreaming] Connected`,
    `${iso(T0 + 11000)} [LOG] [DeepgramStreaming] Closed (code=1011, reason=Deepgram did not receive audio data or a text message within the timeout window. See https://dpgr.am/net0001)`,
    `${iso(T0 + 11500)} [LOG] [DeepgramStreaming] Connected`,
    `${iso(T0 + 26500)} [LOG] [DeepgramStreaming] Closed (code=1011, reason=Deepgram did not receive audio data or a text message within the timeout window. See https://dpgr.am/net0001)`,
    `${iso(T0 + 30000)} [LOG] [DeepgramStreaming] Transcript event — isFinal=false, text="partial words here"`,
    `${iso(T0 + 32000)} [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=""`,
    `${iso(T0 + 40000)} [LOG] [DeepgramStreaming] Reconnecting in 1000ms (attempt 1/10)...`,
    `${iso(T0 + 41000)} [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="fragment chip text"`,
    `${iso(T0 + 45000)} [LOG] [Main] Live Mode status: reconnecting`,
    `${iso(T0 + 50000)} [LOG] [SessionTracker] addAssistantMessage called with: {"__negotiationCoaching":{"tacticalNote":"test"}}`,
    `${iso(T0 + 55000)} [LOG] [LiveRouter] reconnecting (attempt 1/3) in 300ms — BidiGenerateContent session expired`,
];

const diagLines = [
    `[${iso(T0 + 2500)}] route: CODING (selected model, no filter)`,
    `[${iso(T0 + 123500)}] route: VERBAL-TECHNICAL (selected model, filtered)`,
    `[${iso(T0 + 3000)}] first token 1200ms`,
    `[${iso(T0 + 124000)}] first token 800ms`,
    `[${iso(T0 + 125000)}] first token 3000ms`,
];

fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify(timeline, null, 1));
fs.writeFileSync(path.join(dir, 'natively_debug.log'), dbgLines.join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'verbal-diag.log'), diagLines.join('\n') + '\n');

const m = computeRunFromFiles({
    debugLog: path.join(dir, 'natively_debug.log'),
    diagLog: path.join(dir, 'verbal-diag.log'),
    timelinePath: path.join(dir, 'interview60.timeline.json'),
    answersPath: path.join(dir, 'interview60.answers.json'), // deliberately absent
});

console.log('=== top-level ===');
console.log('heard', m.heard, 'answered', m.answered, 'answersToNobody', m.answersToNobody);
console.log('surfacedMax', m.surfacedMax, 'surfacedMulti', m.surfacedMulti, 'invented', m.invented, 'raceLosses', m.raceLosses);
console.log('sttCloses', m.sttCloses, 'lostUtterances', m.lostUtterances, 'fragmentChips', m.fragmentChips);
console.log('coachingAnswers', m.coachingAnswers, 'codingForSpoken', m.codingForSpoken, 'expiryLoops', m.expiryLoops, 'liveReconnects', m.liveReconnects);
console.log('detectP50', m.detectP50, 'detectP90', m.detectP90, 'ttftP90', m.ttftP90, 'ttftSource', m.ttftSource);

console.log('\n=== items ===');
for (const it of m.items) {
    console.log(it.id, JSON.stringify({ heardBy: it.heardBy, answered: it.answered, answeredAt: it.answeredAt, detectMs: it.detectMs, dispatches: it.dispatches, verdict: it.verdict, routeCoding: it.routeCoding, raceLoss: it.raceLoss }));
}

console.log('\n=== gate ===');
const g = evaluateGate(m);
console.log('pass', g.pass);
for (const r of g.rows) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.label}  =  ${r.value}`);

console.log('\ndispatches.length (raw)', m.dir === undefined ? '(n/a, no dir)' : '', (() => { return 'see below'; })());

fs.rmSync(dir, { recursive: true, force: true });
console.log('\ncleaned up', dir);
