import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore — untyped ESM harness module
import { computeRun, computeRunFromFiles, evaluateGate, GATE, spokenCodingRoutes } from './interview60.metrics.mjs';
import { CUE_MAX_LINES, CUE_MAX_WORDS } from '../../llm/prompts';

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
        // Renamed from "invented" to "caught" (Ruling R34) — same formula, same
        // value here: this fixture has zero dispatch: lines (hasDispatch is
        // always false), so claim-once (Ruling R33) never runs against it and
        // none of this describe block's OTHER pinned numbers change either —
        // verified by running `gate` against this folder directly (quoted in
        // the fix-wave report): heard 51/52, sttCloses/lostUtterances/
        // fragmentChips 299/2/5, coachingAnswers 25, surfacedMulti 12,
        // codingForSpoken 3 (inside the pinned 2–4 range) all matched exactly.
        expect(m.caught).toBe(1);
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
 * (→ caught = 2) and one unclaimed answer (→ contributes to answersToNobody)
 * — kept as separate lines, not one line serving both roles, specifically so
 * that a bug that swapped the caught/answersToNobody formulas would change
 * the numbers rather than accidentally still matching.
 *
 * R36 fix wave additions (Rulings R30/R31/R33/R34):
 *   W01/W02 — 45s apart, sharing vocabulary ("load balancer", "backend
 *     server(s)") — the whole-branch reviewer's exact false-double case: each
 *     has its own dispatch line whose anchor is an exact match for its OWN
 *     item but which ALSO clears the 0.15 overlap floor against the OTHER
 *     item (0.625/0.556, measured with the real overlap()). Before claim-once
 *     each item independently scanned its own window AND the overlap floor —
 *     W01's window ([598000,660000]) reaches forward far enough to also
 *     contain W02's +646500 line, so W01 would have wrongly claimed BOTH
 *     lines (dispatches=2, a false "double"); W02's window ([643000,705000])
 *     does NOT reach back to W01's +601000 line (601000 < 643000), so W02
 *     would already have been dispatches=1 pre-fix even without claim-once —
 *     the false double here was one-sided. claim-once assigns each line to
 *     its single highest-overlap item regardless, so both end up with
 *     dispatches=1.
 *   one [WhatToAnswerLLM] Stream failed line — answerFailures = 1.
 *   two verdict=unverifiable answers, timed past every item's window (so
 *     both are unclaimed, adding to answersToNobody): the first has an
 *     interviewer [RestSTT] final within ±10s (counts toward
 *     unverifiableWithSttUp), the second has no interviewer STT final
 *     anywhere nearby (does not) — proving the metric is gated on "STT was
 *     actually up nearby", not just a raw count of unverifiable answers.
 *   one verdict=fragment drop, claimed by Q1 (already answered) — proves
 *     raceLoss ignores fragment-verdict drops (it stays false, same as
 *     before) while liveFragmentsDropped still counts it.
 *   C01, a screenshot cue (kind='screenshot', far past every other item so
 *     its window cannot collide with anything else) with its own answer
 *     dispatch — claim-once now considers cues too, so C01's answer is a
 *     cueAnswer, not a 4th line in answersToNobody.
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
                { id: 'W01', kind: 'spoken', q: 'Explain how a load balancer distributes incoming traffic across backend servers.', playedAt: T0 + 600000, clipSecs: 0 },
                { id: 'W02', kind: 'spoken', q: 'Explain how a load balancer performs health checks on backend servers.', playedAt: T0 + 645000, clipSecs: 0 },
                // R36 fix wave round 3 (Ruling: screenshot cues are items
                // too): far past every other item/dispatch in this fixture
                // (T0+1000000) so its window cannot accidentally overlap
                // anything else.
                { id: 'C01', kind: 'screenshot', q: 'Take a look at this problem on screen and walk me through your approach.', playedAt: T0 + 1000000, clipSecs: 5 },
                // Long design questions (2026-09-08 roster): the STT closes them as several finals.
                // L01 is answered on its first sentence only; L02's first sentence is answered and
                // the full question then arrives as an extend. Far past everything else.
                { id: 'L01', kind: 'spoken', level: 'long', q: 'Let us do a design question. We retrain a recommendation model nightly on two terabytes of click data. Walk me through the training pipeline, the validation of a candidate model, and a rollout where a bad model never reaches all of the traffic.', playedAt: T0 + 1200000, clipSecs: 20 },
                { id: 'L02', kind: 'spoken', level: 'long', q: 'Imagine three models on GPUs in Kubernetes with spiky traffic, a strict latency budget, and a batch scoring job. Tell me how you would lay out the cluster, schedule and autoscale each workload, and keep the GPU bill under control.', playedAt: T0 + 1300000, clipSecs: 20 },
                // 2026-09-09 whole-turn (Task 8): a question answered once at the gate, then
                // superseded by its own continuation (main.ts dispatch: supersede) — a mark
                // (detection only, never a surface) precedes the answer. Far past everything else.
                { id: 'M27', kind: 'spoken', level: 'medium', q: 'When would you reach for a service mesh in an ML serving stack, and when would you not?', playedAt: T0 + 1500000, clipSecs: 5.5 },
            ],
        };

        // clipSecs: 0 for every item, so spokeEnd === playedAt and detectMs
        // (dispatch.at - spokeEnd) is exactly "dispatch line time - playedAt" —
        // the round numbers below are chosen against that simplification.
        const dbgLines = [
            // Q1: answered by live 2000ms after playedAt.
            `${iso(T0 + 2000)} [LOG] [Main] dispatch: answer source=live anchor="Explain how container orchestration platforms schedule workloads across a cluster." verdict=match`,
            // R36 fix wave round 3 (statement-shaped Live detections): a
            // fragment drop line, claimed by Q1 (anchor is a short excerpt of
            // Q1.q, so it overlaps nothing else) — inside an already-answered
            // item's window, so it must not flip raceLoss, only count toward
            // liveFragmentsDropped.
            `${iso(T0 + 10000)} [LOG] [Main] dispatch: drop source=live anchor="container orchestration platforms" verdict=fragment`,
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
            // R36 fix wave (Ruling R33): W01's own dispatch — exact match for
            // W01.q, but overlap(anchor, W02.q)=0.556/0.625 also clears 0.15.
            `${iso(T0 + 601000)} [LOG] [Main] dispatch: answer source=live anchor="Explain how a load balancer distributes incoming traffic across backend servers." verdict=match`,
            // Extend on an added clause (main.ts extend dispatch): W01's fuller
            // sentence answered again 2 s after its head — one surface, not a
            // double; counted in extended/extendsTotal only.
            `${iso(T0 + 603000)} [LOG] [Main] dispatch: extend source=live anchor="Explain how a load balancer distributes incoming traffic across backend servers, and how it notices one is down." verdict=match extends="Explain how a load balancer distributes incoming traffic across backend servers." question="Explain how a load balancer distributes incoming traffic across backend servers, and how it notices one is down."`,
            // W02's own dispatch — the mirror image, inside BOTH W01's window
            // ([598000,660000]) and W02's window ([643000,705000]) — the 17s
            // overlap (643000..660000) is exactly the false-double risk.
            `${iso(T0 + 646500)} [LOG] [Main] dispatch: answer source=whisper anchor="Explain how a load balancer performs health checks on backend servers." verdict=match`,
            // R36 fix wave (Ruling R31): one Stream-failed line -> answerFailures = 1.
            `${iso(T0 + 700000)} [ERROR] [WhatToAnswerLLM] Stream failed: 429 exceeded your current quota`,
            // Fix wave round 7 (Ruling: heuristic chip when the detector is
            // unavailable): one degraded-chip line -> heuristicChips = 1.
            `${iso(T0 + 710000)} [LOG] [QuestionDetector] degraded: chip from heuristic (detector unavailable): "What is the interviewer asking here"`,
            // R36 fix wave (Ruling R34): two unverifiable answers, timed past
            // every item's window (unclaimed -> both add to answersToNobody).
            // Only the first has an interviewer STT final within +/-10s.
            `${iso(T0 + 800000)} [LOG] [Main] dispatch: answer source=live anchor="An unverifiable Live claim with a real interviewer final nearby." verdict=unverifiable`,
            `${iso(T0 + 805000)} [LOG] [RestSTT] Transcript: "the actual thing the interviewer said" id=r1`,
            `${iso(T0 + 900000)} [LOG] [Main] dispatch: answer source=live anchor="An unverifiable Live claim with no interviewer STT anywhere nearby." verdict=unverifiable`,
            // R36 fix wave round 3 (Ruling: screenshot cues are items too):
            // C01's own answer, inside C01's window — claimed by the cue, so
            // it must NOT add a 4th line to answersToNobody.
            `${iso(T0 + 1002000)} [LOG] [Main] dispatch: answer source=live anchor="Take a look at this problem on screen and walk me through your approach." verdict=match`,
            // The screen reference was captured before the answer (main.ts answerDetection).
            `${iso(T0 + 1002900)} [LOG] [Main] screen reference: captured C:\\shots\\c01.png for "Take a look at this problem on screen and walk me through your"`,
            // L01: only its first sentence was dispatched — a partitioned long question.
            `${iso(T0 + 1224000)} [LOG] [Main] dispatch: answer source=whisper anchor="Let us do a design question. We retrain a recommendation model nightly on two terabytes of click data." verdict=match question="Let us do a design question. We retrain a recommendation model nightly on two terabytes of click data."`,
            // L02: the first sentence answered, then the whole question arrives as an extend.
            `${iso(T0 + 1324000)} [LOG] [Main] dispatch: answer source=whisper anchor="Imagine three models on GPUs in Kubernetes with spiky traffic, a strict latency budget, and a batch scoring job." verdict=match question="Imagine three models on GPUs in Kubernetes with spiky traffic, a strict latency budget, and a batch scoring job."`,
            `${iso(T0 + 1329000)} [LOG] [Main] dispatch: extend source=live anchor="Imagine three models on GPUs in Kubernetes" verdict=match extends="Imagine three models on GPUs in Kubernetes with spiky traffic, a strict latency budget, and a batch scoring job." question="Imagine three models on GPUs in Kubernetes with spiky traffic, a strict latency budget, and a batch scoring job. Tell me how you would lay out the cluster, schedule and autoscale each workload, and keep the GPU bill under control."`,
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
            // The same shape RESOLVED: a healthy socket closes a silent segment with an
            // empty final and finalizes the speech within 5 s (after7: all 27 such
            // finals). Counted in resolvedEmptyFinals, not lostUtterances.
            `${iso(T0 + 35000)} [LOG] [DeepgramStreaming] Transcript event — isFinal=false, text="explain the eviction policy tradeoffs"`,
            `${iso(T0 + 36000)} [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=""`,
            `${iso(T0 + 38500)} [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="Explain the eviction policy tradeoffs please."`,
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
            // Spec 2026-09-04 §2/§4 (answer-what-was-asked): a new-format answer
            // dispatch carrying question="…", its pinned line 400 ms later with
            // the identical text, a second new-format answer whose pinned line
            // carries a DIFFERENT text (mismatch), a third with no pinned line
            // within 2 s (missing), a fourth whose dispatch text carries the
            // leading/trailing spaces the model-detector path can produce while
            // the engine pins question.trim() (proves the comparison trims both
            // sides), and three budget lines: one cut inside the limit, two over
            // 80 by allowance. The third budget line used to read
            // `words=84 cut=no allowance=no` — a shape the emitter cannot
            // produce, since allowance is by construction `words > limit`.
            `${iso(T0 + 1100000)} [LOG] [Main] dispatch: answer source=live anchor="Pinned one." verdict=match question="How would you shard a relational database by tenant?"`,
            `${iso(T0 + 1100400)} [LOG] [IntelligenceEngine] runWhatShouldISay: pinned question "How would you shard a relational database by tenant?"`,
            `${iso(T0 + 1110000)} [LOG] [Main] dispatch: answer source=whisper anchor="Pinned two." verdict=match question="What is a consumer group in Kafka?"`,
            `${iso(T0 + 1110300)} [LOG] [IntelligenceEngine] runWhatShouldISay: pinned question "Consumer group?"`,
            `${iso(T0 + 1120000)} [LOG] [Main] dispatch: answer source=live anchor="Pinned three." verdict=match question="Why would you choose gRPC over REST?"`,
            `${iso(T0 + 1123000)} [LOG] [IntelligenceEngine] runWhatShouldISay: pinned question "Why would you choose gRPC over REST?"`,
            `${iso(T0 + 1130000)} [LOG] [Main] dispatch: answer source=live anchor="Pinned four." verdict=match question=" Why would you choose gRPC over REST? "`,
            `${iso(T0 + 1130400)} [LOG] [IntelligenceEngine] runWhatShouldISay: pinned question "Why would you choose gRPC over REST?"`,
            `${iso(T0 + 1100900)} [LOG] [Answer] budget: words=67 cut=yes allowance=no`,
            `${iso(T0 + 1110900)} [LOG] [Answer] budget: words=90 cut=no allowance=yes`,
            `${iso(T0 + 1120900)} [LOG] [Answer] budget: words=140 cut=no allowance=yes`,
            // Cue mode (spec 2026-09-20): one cues line per verbal answer — a well-formed block and
            // an answer the model opened without one (the row must surface the miss).
            `${iso(T0 + 1100950)} [LOG] [Answer] cues: ["thirty gigabytes in float32","int8, then shard"]`,
            `${iso(T0 + 1110950)} [LOG] [Answer] cues: []`,
            // 2026-09-09 whole-turn (Task 8): hold (a fragmentary head, held for the other
            // ear) -> mark (detection only) -> answer -> supersede (replaces the answer
            // already given). The hold fires 100ms before the mark, at spokeEnd-900 — the
            // deliberately-earliest detection (fix round 1, R27): it must count toward
            // detectMs like any other detection, but never toward surfaced/supersedes, and
            // its `question` must PARSE despite the real `reason=fragmentary` token main.ts
            // puts between `verdict=` and `question=` on a real hold line. M27's own answer
            // dispatch carries question=, so it also feeds the pinned-question tracking above.
            `${iso(T0 + 1504600)} [LOG] [Main] dispatch: hold source=whisper anchor="When would you reach for a service" verdict=match reason=fragmentary question="When would you reach for a service"`,
            `${iso(T0 + 1504700)} [LOG] [Main] dispatch: mark source=whisper anchor="When would you reach for a service mesh in an ML serving stack?" verdict=match question="When would you reach for a service mesh in an ML serving stack?"`,
            `${iso(T0 + 1506000)} [LOG] [Main] turn: gate=1210 finals=1 live=0 finished=true`,
            `${iso(T0 + 1506000)} [LOG] [Main] dispatch: answer source=whisper anchor="When would you reach for a service mesh in an ML serving stack?" verdict=match question="When would you reach for a service mesh in an ML serving stack?"`,
            `${iso(T0 + 1509000)} [LOG] [Main] dispatch: supersede source=whisper anchor="When would you reach for a service mesh in an ML serving stack? And when would you not?" verdict=match replaces="When would you reach for a service mesh in an ML serving stack?" question="When would you reach for a service mesh in an ML serving stack? And when would you not?"`,
        ];

        const diagLines = [
            // Q1's route, within 4000ms of its answer dispatch (+2000..+6000) — CODING.
            `[${iso(T0 + 2500)}] route: CODING (selected model, no filter)`,
            // Q2's route, within 4000ms of ITS answer dispatch (+123000..+127000) — not CODING.
            `[${iso(T0 + 123500)}] route: VERBAL-TECHNICAL (selected model, filtered)`,
            // M27's route, within 4000ms of ITS answer dispatch (+1506000..+1510000) — not CODING.
            `[${iso(T0 + 1506100)}] route: VERBAL-TECHNICAL (selected model, filtered)`,
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
        // Q1's window also claims the +10000 fragment drop (R36 round 3): its
        // verdict === 'fragment' excludes it from the `mine.some(drop &&
        // !answered)` half of raceLoss, and Q1 is answered so the `!ans` half
        // is already false too — raceLoss is false for both reasons at once.
        expect(q1.raceLoss).toBe(false);
        // liveFragmentsDropped counts the fragment line regardless of which
        // item claimed it (mirrors how `caught` counts over all dispatch
        // lines) — informational, not part of the gate.
        expect(m.liveFragmentsDropped).toBe(1);
        // detectMs = earliest dispatch.at - spokeEnd = (T0+2000) - T0 = 2000
        // — the fragment at +10000 is later, so it doesn't change this.
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

    it('W01/W02 — 45s apart, sharing vocabulary, each claimed exactly once (Ruling R33, the whole-branch review finding)', () => {
        const w01 = m.items.find((i: any) => i.id === 'W01');
        const w02 = m.items.find((i: any) => i.id === 'W02');
        // Before claim-once, each item independently scanned its own window:
        // W01's window ([598000,660000]) reaches forward far enough to also
        // contain W02's own +646500 line (which clears the 0.15 overlap floor
        // against W01.q too) — dispatches=2, a false "double". W02's window
        // ([643000,705000]) does NOT reach back to W01's +601000 line
        // (601000 < 643000), so W02 was already dispatches=1 even pre-fix —
        // the false double was one-sided, not mutual. Claim-once assigns each
        // line to its single highest-overlap item regardless, so both end up
        // with exactly one.
        expect(w01.dispatches).toBe(1);
        expect(w02.dispatches).toBe(1);
        // The extend line is W01's (its anchor contains all of W01.q), adds no surface, counts as extended.
        expect(w01.extended).toBe(1);
        expect(w02.extended).toBe(0);
        expect(m.extendsTotal).toBe(2); // W01 + L02 (the long question fixture)
        // Not just "1", but the RIGHT one: W01 claims its own (source=live),
        // W02 claims its own (source=whisper) — not each other's.
        expect(w01.heardBy).toBe('live');
        expect(w02.heardBy).toBe('whisper');
        expect(w01.detectMs).toBe(1000); // (T0+601000) - (T0+600000).
        expect(w02.detectMs).toBe(1500); // (T0+646500) - (T0+645000).
    });

    it('C01 — a screenshot cue is a claim-once candidate, so its own answer is a cue answer, not answersToNobody (Ruling: screenshot cues are items too)', () => {
        // C01 itself never appears in m.items (spoken-only) — only claim-once
        // sees it, via cueAnswers.
        expect(m.items.find((i: any) => i.id === 'C01')).toBeUndefined();
        expect(m.cueAnswers).toBe(1);
        // and the one screen capture the cue triggered is counted for the CODING row
        expect(m.screenCaptures).toBe(1);
    });

    it('M27 — a mark before the answer is the first detection; a later supersede replaces it, not a second surface (2026-09-09 whole-turn)', () => {
        const m27 = m.items.find((i: any) => i.id === 'M27');
        // surfaced excludes drop/extend/hold/mark/supersede — only the answer counts as
        // a surface. The mark and the supersede are each a dispatch line in `mine`, but
        // tracked separately (supersedes), never doubling `dispatches`.
        expect(m27.dispatches).toBe(1);
        expect(m27.supersedes).toBe(1);
        expect(m27.extended).toBe(0);
        expect(m27.answered).toBe(true);
        // coverage is the best content-word overlap over the answer's and the
        // supersede's question= text. (This alone cannot prove the supersede's
        // question= field survived the inserted replaces= group — M27's answer
        // alone already covers every content word here, since "and when would you
        // not?" adds only stop words; see the dedicated capture-index test below.)
        expect(m27.coverage).toBeGreaterThanOrEqual(0.9);
        // detectMs = earliest dispatch (the hold, at +1504600, fix round 1) - spokeEnd
        // (+1505500) = -900: the HOLD is now the first detection (100ms ahead of the
        // mark), ahead of the clip actually finishing — see the dedicated hold test below.
        expect(m27.detectMs).toBe(-900);
        expect(m.supersedesTotal).toBe(1);
        const row = evaluateGate(m).rows.find((r) => r.label === 'Surfaced detections per question');
        expect(row.value).toContain('1 superseded');
    });

    it('a held detection is a detection, never a surface (fix round 1, R27): its question PARSES despite reason=fragmentary, and it only moves detectMs', () => {
        const m27 = m.items.find((i: any) => i.id === 'M27');
        // Excluded from surfaced/coverage/supersedes exactly like mark/supersede already
        // were — the hold adds a 4th line to `mine` but changes none of these.
        expect(m27.dispatches).toBe(1);
        expect(m27.supersedes).toBe(1);
        expect(m.surfacedMulti).toBe(1); // unchanged: still just Q2 (see 'top-level counts' below)
        // The real hold line puts `reason=fragmentary` between `verdict=` and `question=`
        // (main.ts:2107) — a token the pre-fix-round-1 regex had no group for, so `question`
        // fell through to null on every real hold line. `dispatches` is exported (extra,
        // not part of the gate) specifically so this parse is independently checkable —
        // nothing else derived from `m` would ever notice a silently-null hold question.
        const held = m.dispatches.find((d: any) => d.action === 'hold' && d.anchor === 'When would you reach for a service');
        expect(held).toBeTruthy();
        expect(held.question).toBe('When would you reach for a service');
        // detectMs = earliest dispatch across ALL of `mine`, unfiltered by action — the hold
        // at +1504600 is 100ms earlier than the mark at +1504700, so it now sets detectMs.
        expect(m27.detectMs).toBe(-900);
    });

    it('long questions: answered whole only when the dispatched text (answer or extend) covers ≥ 80% of the scripted words', () => {
        const l01 = m.items.find((i: any) => i.id === 'L01');
        const l02 = m.items.find((i: any) => i.id === 'L02');
        expect(l01.coverage).toBeLessThan(0.8);          // first sentence only
        expect(l02.coverage).toBeGreaterThanOrEqual(0.8); // the extend carried the whole question
        expect(m.longs).toBe(2);
        expect(m.longWhole).toBe(1);
        const row = evaluateGate(m).rows.find((r) => r.label === 'Long questions answered whole');
        expect(row.value).toBe('1 of 2 (dispatched text covers ≥ 80% of the question)');
        expect(row.pass).toBe(false);
        // Unchanged from the "top-level counts" test below: C01's answer is
        // now claimed (by the cue), so it was never a candidate to add a 4th
        // line to answersToNobody, and answered (spoken-only) never saw C01
        // at all either way. plus the four answer-what-was-asked lines at
        // +1100000/+1110000/+1120000/+1130000, also past every window.
        expect(m.answersToNobody).toBe(7);
        // Q1, Q2, and now M27 (its answer dispatch has a matching route within
        // 4 s — 2026-09-09 whole-turn fixture).
        expect(m.answered).toBe(3);
    });

    it('top-level counts, each derived from the lines above', () => {
        // heard = items with heardBy !== null: Q1(live), Q2(both), Q4(live),
        // W01(live), W02(whisper), L01(whisper), L02(whisper), M27(whisper) —
        // not Q3. = 8. M27's fix-round-1 hold line is source=whisper too — same
        // as its mark/answer/supersede — so it doesn't flip M27 to 'both' and
        // this count is unchanged by it.
        expect(m.heard).toBe(8);
        // answered = items with answered === true: Q1, Q2, and now M27 (its
        // answer dispatch matches the route added within 4 s of it). W01/W02
        // have no matching route within 4000ms of their answer dispatch — by
        // design, this fixture targets claim-once, not the answered/route path.
        expect(m.answered).toBe(3);
        // answerFailures = count of "[WhatToAnswerLLM] Stream failed" lines = 1.
        // delivered = max(0, answered - answerFailures) = max(0, 3 - 1) = 2.
        expect(m.answerFailures).toBe(1);
        expect(m.delivered).toBe(2);
        // heuristicChips = count of "[QuestionDetector] degraded: chip" lines = 1.
        expect(m.heuristicChips).toBe(1);
        // answersToNobody: dispatches.filter(action==='answer' && unclaimed by
        // any item). Q1's and Q2's answer dispatches ARE claimed (they're in
        // those items' `mine`); so are W01's and W02's (claimed by W01 and W02
        // respectively, exactly once each — see the claim-once test above), and
        // so is M27's (claimed by M27 — see the M27 test above).
        // Unclaimed: the phantom "museum exhibit" answer (+520000) plus the
        // two unverifiable answers (+800000, +900000) — all timed past every
        // item's window. = 3. plus the four answer-what-was-asked lines at
        // +1100000/+1110000/+1120000/+1130000, also past every window.
        expect(m.answersToNobody).toBe(7);
        // surfacedMax = max(dispatches) across items = max(1,2,0,0,1,1) = 2 (Q2).
        expect(m.surfacedMax).toBe(2);
        // surfacedMulti = count of items with dispatches > 1 = just Q2 = 1.
        // Before claim-once this would have been 2 (Q2 plus W01, which would
        // have wrongly claimed both the +601000 and +646500 lines) — W02 was
        // already dispatches=1 pre-fix (its window doesn't reach back to
        // +601000), so it was never the second double. Still the false-double
        // bug the W01/W02 test above proves fixed — just one-sided, not two.
        expect(m.surfacedMulti).toBe(1);
        // caught (formerly "invented") = dispatches.filter(verdict==='replaced')
        // .length, counted over ALL dispatch lines regardless of claimed status
        // — the two phantom drops at +500000/+510000 both have
        // verdict=replaced; none of the new lines do. = 2.
        expect(m.caught).toBe(2);
        // unverifiableWithSttUp = answer dispatches with verdict=unverifiable
        // that have an interviewer STT final ([RestSTT] or DeepgramStreaming
        // isFinal=true) within ±10s. The +800000 answer has a [RestSTT] final
        // at +805000 (5s away, inside the window) — counts. The +900000
        // answer has no STT final anywhere nearby — does not. = 1.
        expect(m.unverifiableWithSttUp).toBe(1);
        // raceLosses = items with raceLoss === true = just Q4 = 1.
        expect(m.raceLosses).toBe(1);
        // sttCloses = count of "Closed (code=1011" lines = 2.
        expect(m.sttCloses).toBe(2);
        expect(m.lostUtterances).toBe(1);
        expect(m.resolvedEmptyFinals).toBe(1); // the +36000 empty final, finalized at +38500
        expect(m.fragmentChips).toBe(1);
        expect(m.coachingAnswers).toBe(1);
        // codingForSpoken = items with answered && routeCoding = just Q1 = 1.
        expect(m.codingForSpoken).toBe(1);
        expect(m.expiryLoops).toBe(1);
        expect(m.liveReconnects).toBe(1);
        // detectMs sorted = [-900 (M27), 1000 (Q4), 1000 (W01), 1500 (Q2), 1500
        // (W02), 2000 (Q1), 4000 (L01), 4000 (L02)] (Q3's null is filtered out;
        // -900 clears the `> -5000` floor). pct(a, p) =
        // a[min(a.length-1, floor(a.length*p))]. Still 8 values, not 9: M27's
        // fix-round-1 hold line doesn't add a new item, only pulls M27's own
        // (single) detectMs earlier, from -800 (the mark) to -900 (the hold).
        // p50: floor(8*0.5)=4 → sorted[4] = 1500 — unchanged: M27's value still
        // lands at the front (still the smallest), pushing nothing else's index.
        expect(m.detectP50).toBe(1500);
        // p90: floor(8*0.9)=7 → sorted[7] = 4000 — unchanged for the same reason.
        expect(m.detectP90).toBe(4000);
        // in-app TTFT: firstTokens present (3 lines) so ttftSource is 'in-app'
        // regardless of there being no answers.json.
        expect(m.ttftSource).toBe('in-app');
        // ttftMs sorted = [800, 1200, 3000]. p90: floor(3*0.9)=2 → sorted[2] = 3000.
        expect(m.ttftP90).toBe(3000);
    });

    it('pinned — pairs new-format answer dispatches with the pinned line inside 2 s, on TRIMMED text, counts legacy lines separately', () => {
        // answers: Q1 (+2000), Q2 (+123000), phantom (+520000), W01, W02, two
        // unverifiable, C01 = 8 legacy + 6 new-format (L01, L02, the four
        // answer-what-was-asked lines) + M27 (+1506000, also new-format: its
        // answer dispatch carries question=) = 15. The fourth answer-what-was-
        // asked line (+1130000) differs from its pinned line only by the
        // surrounding spaces the engine trims off, so it counts as pinned, not
        // mismatched: 15 - 8 legacy - 4 missing - 1 mismatched = 2. Missing: L01,
        // L02, the third answer-what-was-asked line (its pinned line arrives 3 s
        // later, outside the 2 s window) — same three as before — plus M27,
        // which carries no pinned line at all (2026-09-09 whole-turn fixture).
        // Unchanged by M27's fix-round-1 hold line: pinned only ever iterates
        // action==='answer' dispatches, and hold is never one.
        expect(m.pinned).toEqual({ answers: 15, legacy: 8, missing: 4, mismatched: 1 });
        const row = evaluateGate(m).rows.find((r) => r.label === 'Answer prompt pinned to the dispatched question');
        expect(row.pass).toBe(false);
        expect(row.value).toBe('2/15 pinned, 4 missing, 1 mismatched, 8 legacy');
    });
    it('budget — measures the distribution, so the row can actually fail', () => {
        // sorted words [67, 90, 140]: n 3, cut 1, p50 = pct(a,.5) = a[floor(3*.5)]
        // = a[1] = 90, max 140.
        expect(m.budget).toEqual({ n: 3, cut: 1, p50: 90, max: 140 });
        // Same three lines read for length: p90 = a[floor(3*.9)] = a[2] = 140; over 85 are
        // 90 and 140; nothing over 150.
        expect(m.length).toEqual({ n: 3, p90: 140, over85: 2, over150: 0 });
        const row = evaluateGate(m).rows.find((r) => r.label === 'Spoken answers: streamed whole under the 200-word guard');
        // n 3 >= floor(delivered 2 * 0.9) = 1, and max 140 <= 200 — but one answer was
        // cut, and since flight s50c (2026-09-12) any cut is a runaway the row must surface.
        expect(row.pass).toBe(false);
        expect(row.value).toBe('3 answers, 1 cut by the guard, words p50 90 max 140');
    });
    it('the four newest rows are the last four, so index-based rendering stays aligned', () => {
        expect(GATE.slice(-4).map((g) => g.key)).toEqual(['pinned', 'budget', 'length', 'cueBlocks']);
    });

    it('budget gate row pass rule: no cut at all, max under the 200-word guard, median unbounded (flight s50c, 2026-09-12)', () => {
        const row = GATE.find((g) => g.key === 'budget')!;
        const base = { budget: { n: 10, cut: 0, p50: 90, max: 120 }, delivered: 10 } as any;
        expect(row.pass(base)).toBe(true);
        // max 205 > the 200 guard — fails, even though everything else is fine.
        expect(row.pass({ ...base, budget: { ...base.budget, max: 205 } })).toBe(false);
        // One cut anywhere — a runaway the guard clamped — fails the row: the app no
        // longer cuts by design, so a cut is a finding.
        expect(row.pass({ ...base, budget: { ...base.budget, cut: 1 } })).toBe(false);
        // p50 170 — unbounded; the model's own stop governs length now.
        expect(row.pass({ ...base, budget: { ...base.budget, p50: 170, max: 190 } })).toBe(true);
    });

    it('length row: fails on any answer over the 150-word cliff, and shows the shares the grader cannot', () => {
        // Sixteen independent graders on s50j named length as the dominant defect in every arm,
        // and the frozen grader never demotes below delivery 1 for it — so the acceptable count
        // is blind to the one lever with headroom. 150 is not a taste: s50e pinned the
        // delivery-0 cliff at <=154 usable, >=158 dead, so any answer past 150 is one a
        // candidate cannot say aloud. 85 is the rubric's spoken budget, shown for the trend.
        const row = GATE.find((g) => g.key === 'length')!;
        expect(row.label).toBe('Spoken answers under the 150-word cliff');
        const base = { length: { n: 40, p90: 132, over85: 22, over150: 0 } } as any;
        expect(row.pass(base)).toBe(true);
        expect(row.show(base)).toBe('words p90 132, over 85: 22/40, over 150: 0/40');
        // s50j as flown: five answers at or past 158 — the row must fail on exactly that.
        expect(row.pass({ length: { n: 42, p90: 155, over85: 24, over150: 5 } })).toBe(false);
        // nothing logged is not a pass
        expect(row.pass({ length: { n: 0, p90: null, over85: 0, over150: 0 } })).toBe(false);
        expect(row.show({ length: { n: 0, p90: null, over85: 0, over150: 0 } })).toBe('not logged');
    });

    it('cueBlocks — counts the blocks, and the row fails when one answer opened without one', () => {
        expect(m.cueBlocks).toEqual({ n: 2, present: 1, wellformed: 1 });
        const row = evaluateGate(m).rows.find((r) => r.label === 'Cue block above every spoken answer');
        expect(row.pass).toBe(false);
        expect(row.value).toBe('1/2 present, 1 well-formed');
    });

    it('cueBlocks gate row pass rule: logged for the delivered answers, every block present and well-formed', () => {
        const row = GATE.find((g) => g.key === 'cueBlocks')!;
        const base = { cueBlocks: { n: 10, present: 10, wellformed: 10 }, delivered: 10 } as any;
        expect(row.pass(base)).toBe(true);
        expect(row.pass({ ...base, cueBlocks: { n: 10, present: 9, wellformed: 9 } })).toBe(false);
        expect(row.pass({ ...base, cueBlocks: { n: 10, present: 10, wellformed: 9 } })).toBe(false);
        // coding routes emit no cues line, hence the same 0.9 tolerance as the budget row
        expect(row.pass({ ...base, cueBlocks: { n: 9, present: 9, wellformed: 9 } })).toBe(true);
        expect(row.pass({ ...base, cueBlocks: { n: 8, present: 8, wellformed: 8 } })).toBe(false);
        expect(row.pass({ ...base, cueBlocks: { n: 0, present: 0, wellformed: 0 } })).toBe(false);
        expect(row.show({ cueBlocks: { n: 0, present: 0, wellformed: 0 } })).toBe('not logged');
    });

    it('latency row: TTFT p90 bar is the 10 s stall budget under the shipped LOW level, detect p50 stays 5 s', () => {
        // s50g at LOW measured TTFT p90 7.8 s and the 2026-09-17 bench 7.1 s; the old 5 s bar
        // (tuned on MINIMAL hours) would fail every LOW hour by design.
        const latency = (over: Partial<typeof m>) => evaluateGate({ ...m, ...over }).rows.find((r) => r.label === 'Answer TTFT p90 · detect p50')!.pass;
        expect(latency({ ttftP90: 7800 })).toBe(true);
        expect(latency({ ttftP90: 10000 })).toBe(true);
        expect(latency({ ttftP90: 10100 })).toBe(false);
        expect(latency({ ttftP90: 7800, detectP50: 5100 })).toBe(false);
    });

    it('evaluates the gate: everything fails except the latency row and the roster-proportional heard row', () => {
        const g = evaluateGate(m);
        expect(g.pass).toBe(false);
        const rows = Object.fromEntries(g.rows.map((r) => [r.label, r.pass]));
        // delivered=2 is nowhere near >=50 (scaled); answersToNobody=7 also fails it alone.
        expect(rows['Answered hands-free']).toBe(false);
        // heard PASSES here, and that is correct: the row is now a proportion of the roster
        // rather than a flat >=51, and this synthetic fixture heard everything it had. The
        // old assertion was pinning the constant, not the behaviour. A truncated real flight
        // still fails it — computeOffsets builds a timeline item per ROSTER entry, so items
        // stays the full roster however early the hour died.
        expect(rows['Heard by either detector']).toBe(true);
        // surfacedMulti=1 and answersToNobody=7 are both nonzero (caught is
        // informational now — Ruling R34 — and no longer part of this row).
        expect(rows['Surfaced detections per question']).toBe(false);
        // lostUtterances=1 and fragmentChips=1 are both nonzero (sttCloses=2 alone would pass).
        expect(rows['STT socket closes / lost utterances / fragment chips']).toBe(false);
        expect(rows['Technical questions answered via the coaching path']).toBe(false);
        expect(rows['Spoken questions routed CODING']).toBe(false);
        expect(rows['Live expiry loops']).toBe(false);
        // ttftP90=3000ms and detectP50=1500ms are both under their bars (10 s TTFT, 5 s detect).
        expect(rows['Answer TTFT p90 · detect p50']).toBe(true);
        const failed = g.rows.filter((r) => !r.pass).map((r) => r.label);
        // pinned (8 legacy dispatches), budget (cut 1 !== 0) and cueBlocks (1 of 2 present)
        // all fail here too — appended last, same as GATE itself.
        expect(failed).toEqual([
            'Answered hands-free',
            // 'Heard by either detector' is absent: see above — the row is proportional now
            // and this fixture heard everything it had.
            'Surfaced detections per question',
            'STT socket closes / lost utterances / fragment chips',
            'Technical questions answered via the coaching path',
            'Spoken questions routed CODING',
            'Live expiry loops',
            'Interview-acceptable answers (Opus 5 judge)',
            'Long questions answered whole',
            'Answer prompt pinned to the dispatched question',
            'Spoken answers: streamed whole under the 200-word guard',
            'Cue block above every spoken answer',
        ]);
    });

    it('reads the judge pass: spoken verdicts only, and the row fails below 47 acceptable or on any wrong', () => {
        // Fixture: 2 acceptable + 1 weak + 1 wrong spoken, 1 acceptable cue (ignored), plus a
        // long design question and its follow-up (2026-09-08 roster): those report beside the
        // base count, never inside it, so the 52-question row stays comparable across flights.
        fs.writeFileSync(path.join(dir, 'interview60.judge.json'), JSON.stringify({ model: 'claude-opus-5', items: {
            W01: { kind: 'spoken', verdict: 'acceptable' }, W02: { kind: 'spoken', verdict: 'acceptable' },
            W03: { kind: 'spoken', verdict: 'weak' }, W04: { kind: 'spoken', verdict: 'wrong' }, C01: { kind: 'cue', verdict: 'acceptable' },
            L01: { kind: 'spoken', level: 'long', verdict: 'weak' }, L01F1: { kind: 'spoken', level: 'followup', verdict: 'acceptable' },
        } }));
        const mj = computeRun(dir);
        expect(mj.judge).toEqual({
            model: 'claude-opus-5', n: 4, acceptable: 2, weak: 1, wrong: 1, errors: 0,
            long: { n: 1, acceptable: 0, weak: 1, wrong: 0 }, followup: { n: 1, acceptable: 1, weak: 0, wrong: 0 },
        });
        const row = evaluateGate(mj).rows.find((r) => r.label === 'Interview-acceptable answers (Opus 5 judge)');
        expect(row.value).toBe('2 acceptable, 1 weak, 1 wrong of 4; long 0 of 1, follow-ups 1 of 1');
        expect(row.pass).toBe(false);
        // Without the file the row reads 'not run' and fails — the pass is part of the gate, not optional.
        expect(evaluateGate(m).rows.find((r) => r.label === 'Interview-acceptable answers (Opus 5 judge)').value).toBe('not run');
    });
});

/**
 * The M27 fixture above cannot, on its own, prove the supersede's `question=`
 * field survived the `replaces=` group inserted ahead of it in the regex — its
 * answer dispatch's own question= already covers every content word of the
 * scripted question, so coverage reads high even if the supersede's question
 * were lost entirely (see the comment on that test). This isolates the claim:
 * an item whose scripted text is covered by the supersede's `question=` but
 * NOT by its (short, unrelated) `anchor=` — a lost capture (the replaces=
 * group shifting the question capture index) would read the anchor instead
 * and coverage would fall to a small fraction; a correct capture reads ~1.0.
 */
describe("supersede question capture — the replaces= group must not shift the question capture index", () => {
    const T0 = Date.parse('2026-01-01T00:00:00.000Z');
    const iso = (ms: number) => new Date(ms).toISOString();
    let dir = '';
    let m: any;

    beforeAll(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i60-supersede-question-'));
        const timeline = {
            startedAt: iso(T0 - 1000), startedMs: T0 - 1000,
            startDebug: 0, endDebug: 1e9, startDiag: 0, endDiag: 1e9,
            endedAt: iso(T0 + 60000),
            items: [
                { id: 'S1', kind: 'spoken', q: 'Describe your approach to caching frequently accessed inventory records including eviction policy.', playedAt: T0, clipSecs: 0 },
            ],
        };
        const dbgLines = [
            // anchor is a short prefix of S1.q — enough overlap to be claimed (score
            // well above the 0.15 floor) but far short of S1.q's full content-word
            // set; question= carries the whole scripted text. If the capture index
            // were wrong, coverage would fall back to the anchor's 4-of-11 words.
            `${iso(T0 + 2000)} [LOG] [Main] dispatch: supersede source=whisper anchor="Describe your approach to caching." verdict=match replaces="something replaced" question="Describe your approach to caching frequently accessed inventory records including eviction policy."`,
        ];
        fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify(timeline, null, 1));
        fs.writeFileSync(path.join(dir, 'natively_debug.log'), dbgLines.join('\n') + '\n');
        fs.writeFileSync(path.join(dir, 'verbal-diag.log'), '');
        m = computeRunFromFiles({
            debugLog: path.join(dir, 'natively_debug.log'),
            diagLog: path.join(dir, 'verbal-diag.log'),
            timelinePath: path.join(dir, 'interview60.timeline.json'),
            answersPath: path.join(dir, 'interview60.answers.json'), // deliberately never written
        });
    });
    afterAll(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

    it("reads the supersede's question= field, not its anchor=, for coverage", () => {
        const s1 = m.items.find((i: any) => i.id === 'S1');
        expect(s1.supersedes).toBe(1);
        // 4 of S1.q's 11 content words ("describe your approach caching") are in the
        // anchor — a lost question= capture would read ~0.36, not >= 0.9.
        expect(s1.coverage).toBeGreaterThanOrEqual(0.9);
    });
});

/**
 * interview60.metrics.mjs deliberately imports no build (it reads logs on a checkout where
 * dist-electron may not exist), so its wellformedCues hardcodes the CUE_MAX_LINES / CUE_MAX_WORDS
 * values as literals instead of importing them. Nothing else would notice if those literals ever
 * drifted from electron/llm/prompts.ts's real constants — the cueBlocks gate row would silently
 * keep gating on stale limits. This fixture is built FROM the real constants (imported here, under
 * vitest, which does have TypeScript source available), not from today's literal 5/8, so it keeps
 * testing the actual boundary even if the constants change later.
 */
describe("the cue row's limits track CUE_MAX_LINES and CUE_MAX_WORDS", () => {
    const T0 = Date.parse('2026-01-01T00:00:00.000Z');
    const iso = (ms: number) => new Date(ms).toISOString();
    // A cue of exactly n words, tagged so the lines are distinct; never "?", never "you".
    const cueOfNWords = (tag: string, n: number) => [tag, ...Array.from({ length: n - 1 }, (_, i) => `w${i + 1}`)].join(' ');
    const atTheLimit = Array.from({ length: CUE_MAX_LINES }, (_, i) => cueOfNWords(`line${i + 1}`, CUE_MAX_WORDS));
    const oneLineOverTheLimit = Array.from({ length: CUE_MAX_LINES + 1 }, (_, i) => `option${i + 1} short`);
    const oneWordOverTheLimit = [cueOfNWords('over', CUE_MAX_WORDS + 1)];

    let dir = '';
    let m: any;
    beforeAll(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i60-cue-limits-'));
        const timeline = {
            startedAt: iso(T0 - 1000), startedMs: T0 - 1000,
            startDebug: 0, endDebug: 1e9, startDiag: 0, endDiag: 1e9,
            endedAt: iso(T0 + 60000),
            items: [] as any[],
        };
        const dbgLines = [
            `${iso(T0)} [LOG] [Answer] cues: ${JSON.stringify(atTheLimit)}`,
            `${iso(T0 + 1000)} [LOG] [Answer] cues: ${JSON.stringify(oneLineOverTheLimit)}`,
            `${iso(T0 + 2000)} [LOG] [Answer] cues: ${JSON.stringify(oneWordOverTheLimit)}`,
        ];
        fs.writeFileSync(path.join(dir, 'interview60.timeline.json'), JSON.stringify(timeline, null, 1));
        fs.writeFileSync(path.join(dir, 'natively_debug.log'), dbgLines.join('\n') + '\n');
        fs.writeFileSync(path.join(dir, 'verbal-diag.log'), '');
        m = computeRunFromFiles({
            debugLog: path.join(dir, 'natively_debug.log'),
            diagLog: path.join(dir, 'verbal-diag.log'),
            timelinePath: path.join(dir, 'interview60.timeline.json'),
            answersPath: path.join(dir, 'interview60.answers.json'), // deliberately never written
        });
    });
    afterAll(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

    it('a block at exactly CUE_MAX_LINES/CUE_MAX_WORDS is wellformed; one line over and one word over are not', () => {
        expect(m.cueBlocks).toEqual({ n: 3, present: 3, wellformed: 1 });
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
            'Interview-acceptable answers (Opus 5 judge)',
            'Long questions answered whole',
            'Answer TTFT p90 · detect p50',
            // Spec 2026-09-04 §2/§4 (answer-what-was-asked) — appended last.
            'Answer prompt pinned to the dispatched question',
            'Spoken answers: streamed whole under the 200-word guard',
            // s50k (2026-09-20): the length lever the grader cannot see — appended last.
            'Spoken answers under the 150-word cliff',
            // Cue mode (spec 2026-09-20 §8) — appended last.
            'Cue block above every spoken answer',
        ]);
    });
});


/**
 * The three counting rows carried absolute thresholds tuned to interview60's 52 items
 * (delivered >= 50, heard >= 51, acceptable >= 47). A roster of any other size cannot
 * reach them: a FLAWLESS scenario50 S1+S2 hour — 40 items, all heard, all answered, all
 * graded acceptable — failed those three rows on arithmetic alone, which would have
 * reported "gate failed" for a perfect run and buried any real failure beside it.
 */
describe('gate thresholds scale with the roster', () => {
    /** A run with nothing wrong in it, at whatever roster size is asked for. */
    const flawless = (items: number, gradeable: number) => ({
        // The judge grades the base mains only; the rest of the roster are follow-ups
        // (scenario50 asks one after every main), counted beside them — see summarizeJudge.
        items: [...new Array(gradeable).fill({ level: 'medium' }), ...new Array(items - gradeable).fill({ level: 'followup' })],
        delivered: items, answered: items, answersToNobody: 0, heard: items,
        surfacedMulti: 0, extendsTotal: 0, supersedesTotal: 0, caught: 0, sttCloses: 0, lostUtterances: 0, resolvedEmptyFinals: 0,
        fragmentChips: 0, coachingAnswers: 0, codingForSpoken: 0, cueAnswers: 0, screenCaptures: 0, expiryLoops: 0,
        judge: { n: gradeable, acceptable: gradeable, weak: 0, wrong: 0, errors: 0, long: { n: 0 }, followup: { n: 0 } },
        longs: 0, longWhole: 0, ttftP90: 3000, detectP50: 4000,
        pinned: { answers: items, legacy: 0, missing: 0, mismatched: 0 },
        budget: { n: items, cut: 0, p50: 90, max: 120 },
        // consistent with p50 90 / max 120 above: about half run past 85, none past 150
        length: { n: items, p90: 120, over85: Math.ceil(items / 2), over150: 0 },
        // cue mode (spec 2026-09-20): every delivered answer opened with a well-formed block
        cueBlocks: { n: items, present: items, wellformed: items },
    }) as any;

    it('passes a flawless hour whatever the roster size', () => {
        for (const [items, gradeable] of [[52, 52], [40, 20], [100, 50], [20, 10]]) {
            const g = evaluateGate(flawless(items, gradeable));
            expect(g.rows.filter((r) => !r.pass).map((r) => r.label), `roster of ${items}`).toEqual([]);
        }
    });

    // interview60's own numbers must not move, or after7/8/9 stop being comparable.
    it('keeps interview60 at exactly 50 delivered, 51 heard, 47 acceptable', () => {
        const near = flawless(52, 52);
        expect(evaluateGate({ ...near, delivered: 50 }).rows.find((r) => r.label === 'Answered hands-free')!.pass).toBe(true);
        expect(evaluateGate({ ...near, delivered: 49 }).rows.find((r) => r.label === 'Answered hands-free')!.pass).toBe(false);
        expect(evaluateGate({ ...near, heard: 51 }).rows.find((r) => r.label === 'Heard by either detector')!.pass).toBe(true);
        expect(evaluateGate({ ...near, heard: 50 }).rows.find((r) => r.label === 'Heard by either detector')!.pass).toBe(false);
        const q = (acceptable: number) => evaluateGate({ ...near, judge: { ...near.judge, acceptable, weak: 52 - acceptable } })
            .rows.find((r) => r.label === 'Interview-acceptable answers (Opus 5 judge)')!.pass;
        expect(q(47)).toBe(true);
        expect(q(46)).toBe(false);
    });

    // Scaling must not become "anything passes": the same proportions still bite.
    it('still fails a 40-item roster that misses too much', () => {
        const g = evaluateGate({ ...flawless(40, 20), delivered: 30, heard: 30 });
        const failed = g.rows.filter((r) => !r.pass).map((r) => r.label);
        expect(failed).toContain('Answered hands-free');
        expect(failed).toContain('Heard by either detector');
    });

    // The quality bar is a share of the ROSTER's gradeable mains, never of how many the
    // judge happened to grade: `judge.n` counts graded pairs, which rises with doubles
    // (after7 graded 54 pairs over 52 questions) and falls with a half-dead hour.
    const quality = (m: any) => evaluateGate(m).rows.find((r) => r.label === 'Interview-acceptable answers (Opus 5 judge)')!.pass;
    it('holds after7 to 47 of its 52 mains even though the judge graded 54 pairs', () => {
        expect(quality({ ...flawless(52, 52), judge: { n: 54, acceptable: 47, weak: 7, wrong: 0, errors: 0, long: { n: 0 }, followup: { n: 0 } } })).toBe(true);
    });
    it('fails a half-dead scenario50 hour whose few graded answers were all fine', () => {
        // 20 mains, only 12 reached the judge, 10 acceptable: 10 of 12 reads as 83 %,
        // but it is 10 of the 20 the roster asked.
        expect(quality({ ...flawless(40, 20), judge: { n: 12, acceptable: 10, weak: 2, wrong: 0, errors: 0, long: { n: 0 }, followup: { n: 0 } } })).toBe(false);
    });
    it("asks 18 acceptable of scenario50 S1+S2's 20 mains (47/52 of them)", () => {
        const at = (acceptable: number) => quality({ ...flawless(40, 20), judge: { n: 20, acceptable, weak: 20 - acceptable, wrong: 0, errors: 0, long: { n: 0 }, followup: { n: 0 } } });
        expect(at(18)).toBe(true);
        expect(at(17)).toBe(false);
    });
});

/**
 * The 'Spoken questions routed CODING' row counted EVERY coding route on a spoken item as a
 * misroute. That was right for interview60, where all coding lived on screenshot cues, but
 * scenario50 asks 15 of its 50 mains as spoken coding/SQL — routing those CODING is correct
 * and the row would have failed a perfect hour on them.
 */
describe('spokenCodingRoutes counts coding routes only on questions that are NOT coding questions', () => {
    const item = (level: string, routeCoding = true) => ({ level, answered: true, routeCoding } as any);
    it('excludes coding, codingHeavy and sql questions — routing those CODING is correct', () => {
        expect(spokenCodingRoutes([item('coding'), item('codingHeavy'), item('sql')])).toBe(0);
    });
    it('still counts a verbal question routed CODING as the misroute it is', () => {
        expect(spokenCodingRoutes([item('medium'), item('verbal'), item('design')])).toBe(3);
    });
    it('ignores unanswered items and non-coding routes, as before', () => {
        expect(spokenCodingRoutes([{ level: 'medium', answered: false, routeCoding: true } as any, item('medium', false)])).toBe(0);
    });
    // interview60 has no spoken item with a coding level, so its count is unchanged.
    it('leaves an interview60-shaped item set untouched', () => {
        expect(spokenCodingRoutes([item('easy'), item('hard'), item('long'), item('followup')])).toBe(4);
    });
    // A follow-up carries level 'followup' whatever it follows: S1Q04F follows the coding
    // question S1Q04, and a CODING route on it is no misroute.
    it('judges a follow-up by its parent question', () => {
        const parent = { id: 'S1Q04', level: 'coding', answered: true, routeCoding: true } as any;
        const child = { id: 'S1Q04F', level: 'followup', chain: 'S1Q04', answered: true, routeCoding: true } as any;
        expect(spokenCodingRoutes([parent, child])).toBe(0);
        const verbalParent = { id: 'S1Q01', level: 'verbal', answered: true, routeCoding: false } as any;
        const verbalChild = { id: 'S1Q01F', level: 'followup', chain: 'S1Q01', answered: true, routeCoding: true } as any;
        expect(spokenCodingRoutes([verbalParent, verbalChild])).toBe(1);
    });
    // The parent may be a screenshot cue (interview60's C01F1 follows the C01 cue), which
    // is not among the spoken items — the lookup runs over the whole timeline.
    it('resolves the parent across the whole timeline, cues included', () => {
        const cue = { id: 'C01', level: 'coding', kind: 'screenshot' } as any;
        const child = { id: 'C01F1', level: 'followup', chain: 'C01', answered: true, routeCoding: true } as any;
        expect(spokenCodingRoutes([child], [cue, child])).toBe(0);
        expect(spokenCodingRoutes([child])).toBe(1); // parent unknown: the follow-up's own level stands
    });
});
