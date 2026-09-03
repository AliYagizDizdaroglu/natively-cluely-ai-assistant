import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore — untyped ESM harness module
import { computeRun, computeRunFromFiles, evaluateGate, GATE } from './interview60.metrics.mjs';

// @ts-ignore — import.meta is ESM-only; this file runs under vitest's ESM
// transform regardless of electron/tsconfig.json's CommonJS module target
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BEFORE = path.join(HERE, 'interview60.runs', '2026-09-02-before');
const have = fs.existsSync(path.join(BEFORE, 'natively_debug.log'));

// computeRun(BEFORE) must NOT run at describe-body/collection time: skipIf only
// skips the it()s, and a describe body runs unconditionally during collection
// (proved in the isolation worktree, where interview60.runs/ is gitignored and
// absent — the bare call threw ENOENT there even with skipIf true). Deferring
// it into beforeAll keeps a clean checkout green.
describe.skipIf(!have)(`computeRun on the 2026-09-02 baseline (regression: the numbers the published report shows)${have ? '' : ` — SKIPPED: fixture not present at ${BEFORE} (gitignored)`}`, () => {
    let m: any;
    beforeAll(() => { m = computeRun(BEFORE); });
    it('attributes the hour the way the report did', () => {
        expect(m.items.length).toBe(52);
        expect(m.heard).toBe(51);
        expect(m.answered).toBe(26);
        expect(m.items.filter((i: any) => i.heardBy === null).map((i: any) => i.id)).toEqual(['M04']);
        expect(m.raceLosses).toBe(22);
        expect(m.sttCloses).toBe(299);
        expect(m.lostUtterances).toBe(2);
        expect(m.fragmentChips).toBe(5);
        expect(m.coachingAnswers).toBe(25);
        // The published page counted 4 CODING routes; 2 of those were the screenshot
        // cues, which are not spoken items. Per-item the count is 2–4 depending on
        // how the cue windows attribute — pin the range, not a guess.
        expect(m.codingForSpoken).toBeGreaterThanOrEqual(2);
        expect(m.codingForSpoken).toBeLessThanOrEqual(4);
        expect(m.expiryLoops).toBe(0);
        expect(m.invented).toBe(1);
        expect(m.surfacedMulti).toBe(12);
        expect(m.ttftSource).toBe('answer-only');
    });
    it('fails the gate on the baseline, on the rows the report named', () => {
        const g = evaluateGate(m);
        expect(g.pass).toBe(false);
        const failed = g.rows.filter((r) => !r.pass).map((r) => r.label);
        expect(failed).toContain('Answered hands-free');
        expect(failed).toContain('STT socket closes / lost utterances / fragment chips');
        expect(failed).toContain('Technical questions answered via the coaching path');
    });
});

/**
 * The baseline fixture has zero `dispatch:` lines, so `hasDispatch` is always
 * false there — the entire dispatch branch (per-item heardBy/answered/
 * answeredAt/detectMs/dispatches/verdict/routeCoding/raceLoss, and the
 * dispatch arms of invented/answersToNobody), and the in-app TTFT branch,
 * never ran under test. This builds a small hand-written run from scratch —
 * via computeRunFromFiles, so it needs no fixture directory and no run-dir
 * naming convention (answersPath deliberately points at a file that is never
 * created) — with every expected number derived by hand in the comment next
 * to its assertion, from the log lines above it, using the module's actual
 * formulas (not the numbers the module happens to print).
 *
 * Four questions, one each for the four attribution outcomes the dispatch
 * branch can produce:
 *   Q1 — one source (live), answered, CODING route.
 *   Q2 — two sources (whisper chip + live drop), but still answered exactly
 *        once (by whisper) — a double surface that is NOT a race loss,
 *        because raceLoss requires no `ans` at all (mine.some(drop) && !ans);
 *        Q2 has an `ans` (the whisper answer), so its raceLoss is false even
 *        though one of its dispatches was a drop.
 *   Q3 — no dispatch lines reference it at all: the pure "never surfaced"
 *        case (mine = [], heardBy = null).
 *   Q4 — a drop with no matching answer at all: this IS a race loss
 *        (mine.some(drop && !answered) is true, and !ans is true too, since
 *        no answer dispatch exists in its window). Q1–Q3 alone cannot
 *        exercise raceLoss = true (both Q1 and Q2 end up with an `ans`, and
 *        Q3 has no dispatches to lose a race with), so this run has a 4th
 *        item purely to hit that branch — everything else follows the
 *        brief's 3-question shape.
 * Plus three "phantom" dispatch lines timed and worded to match none of
 * Q1–Q4 (either by vocabulary or by falling outside every item's
 * [playedAt-2s, playedAt+60s] window, or both): two verdict=replaced drops
 * (→ invented = 2) and one unclaimed answer (→ answersToNobody = 1) — kept
 * as separate lines, not one line serving both roles, specifically so that a
 * bug that swapped the invented/answersToNobody formulas would change the
 * numbers rather than accidentally still matching.
 */
describe('computeRun on a synthetic run (exercises the dispatch: branch and in-app TTFT, neither reachable from the 2026-09-02 baseline)', () => {
    const T0 = Date.parse('2026-01-01T00:00:00.000Z');
    const iso = (ms: number) => new Date(ms).toISOString();
    let dir = '';
    let m: any;

    beforeAll(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i60-synthetic-'));

        const timeline = {
            startedAt: iso(T0 - 10000),
            startedMs: T0 - 10000,
            // sentinel end offsets, clamped to the real file size by logSince —
            // simpler than computing exact UTF-8 byte lengths by hand for log
            // lines that contain non-ASCII characters (—, etc).
            startDebug: 0, endDebug: 1e9,
            startDiag: 0, endDiag: 1e9,
            endedAt: iso(T0 + 420000),
            items: [
                { id: 'Q1', kind: 'spoken', q: 'Explain how container orchestration platforms schedule workloads across a cluster.', playedAt: T0 + 0, clipSecs: 0 },
                { id: 'Q2', kind: 'spoken', q: 'Describe the tradeoffs between synchronous and asynchronous message queues.', playedAt: T0 + 120000, clipSecs: 0 },
                { id: 'Q3', kind: 'spoken', q: 'What happens when a distributed database partition loses network connectivity.', playedAt: T0 + 240000, clipSecs: 0 },
                { id: 'Q4', kind: 'spoken', q: 'How would you rotate credentials for a service without causing an outage.', playedAt: T0 + 360000, clipSecs: 0 },
            ],
        };

        // clipSecs: 0 for every item, so spokeEnd === playedAt and detectMs
        // (dispatch.at - spokeEnd) is exactly "dispatch line time - playedAt" —
        // the round numbers below are chosen against that simplification.
        const dbgLines = [
            // Q1: answered by live 2000ms after playedAt.
            `${iso(T0 + 2000)} [LOG] [Main] dispatch: answer source=live anchor="Explain how container orchestration platforms schedule workloads across a cluster." verdict=match`,
            // Q2: whisper chip at +1500ms (the earliest detection — this is what
            // detectMs will read), then a live drop (duplicate of whisper) at
            // +1800ms, then the actual answer from whisper at +3000ms.
            `${iso(T0 + 121500)} [LOG] [Main] dispatch: chip source=whisper anchor="Describe the tradeoffs between synchronous and asynchronous message queues." verdict=shown`,
            `${iso(T0 + 121800)} [LOG] [Main] dispatch: drop source=live anchor="Describe the tradeoffs between synchronous and asynchronous message queues." verdict=paraphrase duplicateOf=whisper answered=false`,
            `${iso(T0 + 123000)} [LOG] [Main] dispatch: answer source=whisper anchor="Describe the tradeoffs between synchronous and asynchronous message queues." verdict=match`,
            // Q3: nothing — never surfaced.
            // Q4: a live drop with no answer anywhere in its window — a real race loss.
            `${iso(T0 + 361000)} [LOG] [Main] dispatch: drop source=live anchor="How would you rotate credentials for a service without causing an outage." verdict=paraphrase duplicateOf=whisper answered=false`,
            // Phantoms: vocabulary shared with no Qn, and timed past Q4's window
            // end (T0+420000) so they cannot be claimed on timing either.
            `${iso(T0 + 500000)} [LOG] [Main] dispatch: drop source=live anchor="The weather forecast mentioned scattered thunderstorms across the valley." verdict=replaced`,
            `${iso(T0 + 510000)} [LOG] [Main] dispatch: drop source=whisper anchor="Grocery shopping list includes bread milk and seasonal vegetables." verdict=replaced`,
            `${iso(T0 + 520000)} [LOG] [Main] dispatch: answer source=live anchor="The museum exhibit featured paintings from the early impressionist period." verdict=match`,
            // Two STT socket closes (code=1011) with a Connected before each.
            `${iso(T0 + 1000)} [LOG] [DeepgramStreaming] Connected`,
            `${iso(T0 + 11000)} [LOG] [DeepgramStreaming] Closed (code=1011, reason=Deepgram did not receive audio data or a text message within the timeout window. See https://dpgr.am/net0001)`,
            `${iso(T0 + 11500)} [LOG] [DeepgramStreaming] Connected`,
            `${iso(T0 + 26500)} [LOG] [DeepgramStreaming] Closed (code=1011, reason=Deepgram did not receive audio data or a text message within the timeout window. See https://dpgr.am/net0001)`,
            // A partial with words, then an empty final 2s later (< 12s) with no
            // real final in between: lostUtterances counts this — a final that
            // came back empty when Deepgram had just been transcribing something.
            `${iso(T0 + 30000)} [LOG] [DeepgramStreaming] Transcript event — isFinal=false, text="partial words here"`,
            `${iso(T0 + 32000)} [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=""`,
            // A DeepgramStreaming reconnect, then a non-empty final 1000ms later
            // (inside the 0-3000ms window finalsAfterReconnect checks): fragmentChips.
            `${iso(T0 + 40000)} [LOG] [DeepgramStreaming] Reconnecting in 1000ms (attempt 1/10)...`,
            `${iso(T0 + 41000)} [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="fragment chip text"`,
            // One Live session reconnect (liveReconnects reads THIS line, not
            // the DeepgramStreaming one above — two different regexes).
            `${iso(T0 + 45000)} [LOG] [Main] Live Mode status: reconnecting`,
            // One coaching blob (coachingAnswers = stats.coachingBlobs, a raw
            // substring count of "__negotiationCoaching").
            `${iso(T0 + 50000)} [LOG] [SessionTracker] addAssistantMessage called with: {"__negotiationCoaching":{"tacticalNote":"test"}}`,
            // One Live session-expiry loop (expiryLoops = stats.expired, a raw
            // substring count of "session expired").
            `${iso(T0 + 55000)} [LOG] [LiveRouter] reconnecting (attempt 1/3) in 300ms — BidiGenerateContent session expired`,
        ];

        const diagLines = [
            // Q1's route, within 4000ms of its answer dispatch (+2000..+6000) — CODING.
            `[${iso(T0 + 2500)}] route: CODING (selected model, no filter)`,
            // Q2's route, within 4000ms of ITS answer dispatch (+123000..+127000) — not CODING.
            `[${iso(T0 + 123500)}] route: VERBAL-TECHNICAL (selected model, filtered)`,
            // Three in-app first-token times — presence alone makes ttftSource
            // 'in-app' (it only falls back to the answer-only pass when there are
            // NO first-token lines at all).
            `[${iso(T0 + 3000)}] first token 1200ms`,
            `[${iso(T0 + 124000)}] first token 800ms`,
            `[${iso(T0 + 125000)}] first token 3000ms`,
        ];

        fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify(timeline, null, 1));
        fs.writeFileSync(path.join(dir, 'natively_debug.log'), dbgLines.join('\n') + '\n');
        fs.writeFileSync(path.join(dir, 'verbal-diag.log'), diagLines.join('\n') + '\n');

        m = computeRunFromFiles({
            debugLog: path.join(dir, 'natively_debug.log'),
            diagLog: path.join(dir, 'verbal-diag.log'),
            timelinePath: path.join(dir, 'interview60.timeline.json'),
            answersPath: path.join(dir, 'interview60.answers.json'), // deliberately never written
        });
    });

    afterAll(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

    it('Q1 — single source, answered, CODING route', () => {
        const q1 = m.items.find((i: any) => i.id === 'Q1');
        expect(q1.heardBy).toBe('live');
        expect(q1.answered).toBe(true);
        // verdict comes from the answer dispatch's own verdict= field.
        expect(q1.verdict).toBe('match');
        // route text starts with "CODING".
        expect(q1.routeCoding).toBe(true);
        // no drop dispatch for Q1 at all, so the `mine.some(drop && !answered)`
        // half of raceLoss is false regardless of the `!ans` half.
        expect(q1.raceLoss).toBe(false);
        // detectMs = earliest dispatch.at - spokeEnd = (T0+2000) - T0 = 2000.
        expect(q1.detectMs).toBe(2000);
        // one dispatch (the answer), no drop/chip to add to it.
        expect(q1.dispatches).toBe(1);
    });

    it('Q2 — two sources, one drop, still answered once (not a race loss)', () => {
        const q2 = m.items.find((i: any) => i.id === 'Q2');
        // chip (whisper) + drop (live) + answer (whisper) = 2 distinct sources.
        expect(q2.heardBy).toBe('both');
        expect(q2.answered).toBe(true);
        expect(q2.verdict).toBe('match'); // the whisper answer's verdict, not the drop's.
        expect(q2.routeCoding).toBe(false); // its route is VERBAL-TECHNICAL, not CODING.
        // mine has a drop with answered=false (true half), but mine also has an
        // `answer` dispatch so `ans` is truthy and `!ans` is false — raceLoss
        // is defined as "dropped AND never answered at all", and Q2 WAS
        // answered (just from the other source), so this is false.
        expect(q2.raceLoss).toBe(false);
        // detectMs = earliest of {chip@+1500, drop@+1800, answer@+3000} - playedAt = 1500.
        expect(q2.detectMs).toBe(1500);
        // surfaced = dispatches whose action !== 'drop' = chip + answer = 2 (the drop is excluded).
        expect(q2.dispatches).toBe(2);
    });

    it('Q3 — never surfaced at all', () => {
        const q3 = m.items.find((i: any) => i.id === 'Q3');
        expect(q3.heardBy).toBe(null);
        expect(q3.answered).toBe(false);
        expect(q3.verdict).toBe(null);
        expect(q3.routeCoding).toBe(false);
        expect(q3.raceLoss).toBe(false); // mine = [], so mine.some(...) is false.
        expect(q3.detectMs).toBe(null); // mine.length === 0.
        expect(q3.dispatches).toBe(0);
    });

    it('Q4 — dropped with no answer anywhere in its window: a real race loss', () => {
        const q4 = m.items.find((i: any) => i.id === 'Q4');
        expect(q4.heardBy).toBe('live'); // the drop's source.
        expect(q4.answered).toBe(false); // no `ans` (no answer-action dispatch), so no route lookup either.
        // verdict falls back to mine[0].verdict (there is no `ans`) — the drop's own verdict.
        expect(q4.verdict).toBe('paraphrase');
        expect(q4.routeCoding).toBe(false);
        // mine.some(drop && !answered) is true (the drop), and !ans is true
        // (no answer dispatch at all) — both halves true, so this is the one
        // item in this run where raceLoss is actually true.
        expect(q4.raceLoss).toBe(true);
        expect(q4.detectMs).toBe(1000); // (T0+361000) - (T0+360000).
        expect(q4.dispatches).toBe(0); // the only dispatch is a drop, excluded from "surfaced".
    });

    it('top-level counts, each derived from the lines above', () => {
        // heard = items with heardBy !== null: Q1(live), Q2(both), Q4(live) — not Q3.
        expect(m.heard).toBe(3);
        // answered = items with answered === true: Q1, Q2 only (Q3 and Q4 are not).
        expect(m.answered).toBe(2);
        // answersToNobody: dispatches.filter(action==='answer' && unclaimed by
        // any item). Q1's and Q2's answer dispatches ARE claimed (they're in
        // those items' `mine`); the one phantom `action=answer` line (+520000,
        // "museum exhibit…") shares no vocabulary with Q1-Q4 and sits well past
        // every item's window, so it is claimed by nobody. = 1.
        expect(m.answersToNobody).toBe(1);
        // surfacedMax = max(dispatches) across items = max(1, 2, 0, 0) = 2 (Q2).
        expect(m.surfacedMax).toBe(2);
        // surfacedMulti = count of items with dispatches > 1 = just Q2 = 1.
        expect(m.surfacedMulti).toBe(1);
        // invented = dispatches.filter(verdict==='replaced').length, counted
        // over ALL dispatch lines regardless of claimed status — the two
        // phantom drops at +500000/+510000 both have verdict=replaced; Q2's
        // and Q4's drops are verdict=paraphrase, not replaced. = 2.
        expect(m.invented).toBe(2);
        // raceLosses = items with raceLoss === true = just Q4 = 1.
        expect(m.raceLosses).toBe(1);
        // sttCloses = count of "Closed (code=1011" lines = 2.
        expect(m.sttCloses).toBe(2);
        expect(m.lostUtterances).toBe(1);
        expect(m.fragmentChips).toBe(1);
        expect(m.coachingAnswers).toBe(1);
        // codingForSpoken = items with answered && routeCoding = just Q1 = 1.
        expect(m.codingForSpoken).toBe(1);
        expect(m.expiryLoops).toBe(1);
        expect(m.liveReconnects).toBe(1);
        // detectMs sorted = [1000 (Q4), 1500 (Q2), 2000 (Q1)] (Q3's null is
        // filtered out). pct(a, p) = a[min(a.length-1, floor(a.length*p))].
        // p50: floor(3*0.5)=1 → sorted[1] = 1500.
        expect(m.detectP50).toBe(1500);
        // p90: floor(3*0.9)=2 → sorted[2] = 2000.
        expect(m.detectP90).toBe(2000);
        // in-app TTFT: firstTokens present (3 lines) so ttftSource is 'in-app'
        // regardless of there being no answers.json.
        expect(m.ttftSource).toBe('in-app');
        // ttftMs sorted = [800, 1200, 3000]. p90: floor(3*0.9)=2 → sorted[2] = 3000.
        expect(m.ttftP90).toBe(3000);
    });

    it('evaluates the gate: everything fails except the (generously-thresholded) latency row', () => {
        const g = evaluateGate(m);
        expect(g.pass).toBe(false);
        const rows = Object.fromEntries(g.rows.map((r) => [r.label, r.pass]));
        // answered=2 is nowhere near >=50; answersToNobody=1 also fails it alone.
        expect(rows['Answered hands-free']).toBe(false);
        // heard=3 is nowhere near >=51.
        expect(rows['Heard by either detector']).toBe(false);
        // surfacedMulti=1 and invented=2 are both nonzero.
        expect(rows['Surfaced detections per question']).toBe(false);
        // lostUtterances=1 and fragmentChips=1 are both nonzero (sttCloses=2 alone would pass).
        expect(rows['STT socket closes / lost utterances / fragment chips']).toBe(false);
        expect(rows['Technical questions answered via the coaching path']).toBe(false);
        expect(rows['Spoken questions routed CODING']).toBe(false);
        expect(rows['Live expiry loops']).toBe(false);
        // ttftP90=3000ms and detectP50=1500ms are both <= the 5000ms gate.
        expect(rows['Answer TTFT p90 · detect p50']).toBe(true);
        const failed = g.rows.filter((r) => !r.pass).map((r) => r.label);
        expect(failed).toEqual([
            'Answered hands-free',
            'Heard by either detector',
            'Surfaced detections per question',
            'STT socket closes / lost utterances / fragment chips',
            'Technical questions answered via the coaching path',
            'Spoken questions routed CODING',
            'Live expiry loops',
        ]);
    });
});

describe('computeRun on a run dir missing a required log file', () => {
    let dir = '';
    beforeAll(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i60-missing-log-'));
        // A minimal but valid timeline.json — only the log files are missing.
        fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify({
            startedAt: '2026-01-01T00:00:00.000Z', startedMs: Date.parse('2026-01-01T00:00:00.000Z'),
            startDebug: 0, endDebug: 1e9, startDiag: 0, endDiag: 1e9, endedAt: '2026-01-01T00:01:00.000Z',
            items: [],
        }));
    });
    afterAll(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

    it('throws naming natively_debug.log when only verbal-diag.log exists', () => {
        fs.writeFileSync(path.join(dir, 'verbal-diag.log'), '');
        expect(() => computeRun(dir)).toThrow(/natively_debug\.log/);
        fs.rmSync(path.join(dir, 'verbal-diag.log'));
    });

    it('throws naming verbal-diag.log when only natively_debug.log exists', () => {
        fs.writeFileSync(path.join(dir, 'natively_debug.log'), '');
        expect(() => computeRun(dir)).toThrow(/verbal-diag\.log/);
        fs.rmSync(path.join(dir, 'natively_debug.log'));
    });
});

describe('GATE', () => {
    it('has one row per spec §6 line', () => {
        expect(GATE.map((g) => g.label)).toEqual([
            'Answered hands-free',
            'Heard by either detector',
            'Surfaced detections per question',
            'STT socket closes / lost utterances / fragment chips',
            'Technical questions answered via the coaching path',
            'Spoken questions routed CODING',
            'Live expiry loops',
            'Answer TTFT p90 · detect p50',
        ]);
    });
});
