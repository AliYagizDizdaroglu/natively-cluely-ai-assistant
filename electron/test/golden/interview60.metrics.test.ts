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
        // Unchanged from the "top-level counts" test below: C01's answer is
        // now claimed (by the cue), so it was never a candidate to add a 4th
        // line to answersToNobody, and answered (spoken-only) never saw C01
        // at all either way. plus the four answer-what-was-asked lines at
        // +1100000/+1110000/+1120000/+1130000, also past every window.
        expect(m.answersToNobody).toBe(7);
        expect(m.answered).toBe(2);
    });

    it('top-level counts, each derived from the lines above', () => {
        // heard = items with heardBy !== null: Q1(live), Q2(both), Q4(live),
        // W01(live), W02(whisper) — not Q3. = 5.
        expect(m.heard).toBe(5);
        // answered = items with answered === true: Q1, Q2 only. W01/W02 have
        // no matching route within 4000ms of their answer dispatch — by
        // design, this fixture targets claim-once, not the answered/route path.
        expect(m.answered).toBe(2);
        // answerFailures = count of "[WhatToAnswerLLM] Stream failed" lines = 1.
        // delivered = max(0, answered - answerFailures) = max(0, 2 - 1) = 1.
        expect(m.answerFailures).toBe(1);
        expect(m.delivered).toBe(1);
        // heuristicChips = count of "[QuestionDetector] degraded: chip" lines = 1.
        expect(m.heuristicChips).toBe(1);
        // answersToNobody: dispatches.filter(action==='answer' && unclaimed by
        // any item). Q1's and Q2's answer dispatches ARE claimed (they're in
        // those items' `mine`); so are W01's and W02's (claimed by W01 and W02
        // respectively, exactly once each — see the claim-once test above).
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
        expect(m.fragmentChips).toBe(1);
        expect(m.coachingAnswers).toBe(1);
        // codingForSpoken = items with answered && routeCoding = just Q1 = 1.
        expect(m.codingForSpoken).toBe(1);
        expect(m.expiryLoops).toBe(1);
        expect(m.liveReconnects).toBe(1);
        // detectMs sorted = [1000 (Q4), 1000 (W01), 1500 (Q2), 1500 (W02), 2000
        // (Q1)] (Q3's null is filtered out). pct(a, p) =
        // a[min(a.length-1, floor(a.length*p))].
        // p50: floor(5*0.5)=2 → sorted[2] = 1500.
        expect(m.detectP50).toBe(1500);
        // p90: floor(5*0.9)=4 → sorted[4] = 2000.
        expect(m.detectP90).toBe(2000);
        // in-app TTFT: firstTokens present (3 lines) so ttftSource is 'in-app'
        // regardless of there being no answers.json.
        expect(m.ttftSource).toBe('in-app');
        // ttftMs sorted = [800, 1200, 3000]. p90: floor(3*0.9)=2 → sorted[2] = 3000.
        expect(m.ttftP90).toBe(3000);
    });

    it('pinned — pairs new-format answer dispatches with the pinned line inside 2 s, on TRIMMED text, counts legacy lines separately', () => {
        // answers: Q1 (+2000), Q2 (+123000), phantom (+520000), W01, W02, two
        // unverifiable, C01 = 8 legacy + 4 new-format = 12. The fourth
        // (+1130000) differs from its pinned line only by the surrounding
        // spaces the engine trims off, so it counts as pinned, not mismatched:
        // 12 - 8 legacy - 1 missing - 1 mismatched = 2.
        expect(m.pinned).toEqual({ answers: 12, legacy: 8, missing: 1, mismatched: 1 });
        const row = evaluateGate(m).rows.find((r) => r.label === 'Answer prompt pinned to the dispatched question');
        expect(row.pass).toBe(false);
        expect(row.value).toBe('2/12 pinned, 1 missing, 1 mismatched, 8 legacy');
    });
    it('budget — measures the distribution, so the row can actually fail', () => {
        // sorted words [67, 90, 140]: n 3, over 2 (90, 140), allowance 2, cut 1,
        // cutShort 1 (67 is the only cut line under 80), p50 = pct(a,.5) =
        // a[floor(3*.5)] = a[1] = 90, max 140.
        expect(m.budget).toEqual({ n: 3, over: 2, allowance: 2, cut: 1, cutShort: 1, p50: 90, max: 140 });
        const row = evaluateGate(m).rows.find((r) => r.label === 'Spoken answers: the sentence in progress at 80 words finishes (ceiling 160)');
        // n 3 >= floor(delivered 1 * 0.9) = 0, but cutShort 1 !== 0 and max 140 > 130.
        expect(row.pass).toBe(false);
        expect(row.value).toBe('3 answers, 2 over 80, 1 cut under 80, words p50 90 max 140');
    });
    it('the two new rows are the last two, so index-based rendering stays aligned', () => {
        expect(GATE.slice(-2).map((g) => g.key)).toEqual(['pinned', 'budget']);
    });

    it('evaluates the gate: everything fails except the (generously-thresholded) latency row', () => {
        const g = evaluateGate(m);
        expect(g.pass).toBe(false);
        const rows = Object.fromEntries(g.rows.map((r) => [r.label, r.pass]));
        // delivered=1 is nowhere near >=50; answersToNobody=7 also fails it alone.
        expect(rows['Answered hands-free']).toBe(false);
        // heard=5 is nowhere near >=51.
        expect(rows['Heard by either detector']).toBe(false);
        // surfacedMulti=1 and answersToNobody=7 are both nonzero (caught is
        // informational now — Ruling R34 — and no longer part of this row).
        expect(rows['Surfaced detections per question']).toBe(false);
        // lostUtterances=1 and fragmentChips=1 are both nonzero (sttCloses=2 alone would pass).
        expect(rows['STT socket closes / lost utterances / fragment chips']).toBe(false);
        expect(rows['Technical questions answered via the coaching path']).toBe(false);
        expect(rows['Spoken questions routed CODING']).toBe(false);
        expect(rows['Live expiry loops']).toBe(false);
        // ttftP90=3000ms and detectP50=1500ms are both <= the 5000ms gate.
        expect(rows['Answer TTFT p90 · detect p50']).toBe(true);
        const failed = g.rows.filter((r) => !r.pass).map((r) => r.label);
        // pinned (8 legacy dispatches) and budget (cutShort 1, max 140 > 130)
        // both fail here too — appended last, same as GATE itself.
        expect(failed).toEqual([
            'Answered hands-free',
            'Heard by either detector',
            'Surfaced detections per question',
            'STT socket closes / lost utterances / fragment chips',
            'Technical questions answered via the coaching path',
            'Spoken questions routed CODING',
            'Live expiry loops',
            'Interview-acceptable answers (Opus 5 judge)',
            'Answer prompt pinned to the dispatched question',
            'Spoken answers: the sentence in progress at 80 words finishes (ceiling 160)',
        ]);
    });

    it('reads the judge pass: spoken verdicts only, and the row fails below 47 acceptable or on any wrong', () => {
        // Fixture: 2 acceptable + 1 weak + 1 wrong spoken, 1 acceptable cue (ignored).
        fs.writeFileSync(path.join(dir, 'interview60.judge.json'), JSON.stringify({ model: 'claude-opus-5', items: {
            W01: { kind: 'spoken', verdict: 'acceptable' }, W02: { kind: 'spoken', verdict: 'acceptable' },
            W03: { kind: 'spoken', verdict: 'weak' }, W04: { kind: 'spoken', verdict: 'wrong' }, C01: { kind: 'cue', verdict: 'acceptable' },
        } }));
        const mj = computeRun(dir);
        expect(mj.judge).toEqual({ model: 'claude-opus-5', n: 4, acceptable: 2, weak: 1, wrong: 1, errors: 0 });
        const row = evaluateGate(mj).rows.find((r) => r.label === 'Interview-acceptable answers (Opus 5 judge)');
        expect(row.value).toBe('2 acceptable, 1 weak, 1 wrong of 4');
        expect(row.pass).toBe(false);
        // Without the file the row reads 'not run' and fails — the pass is part of the gate, not optional.
        expect(evaluateGate(m).rows.find((r) => r.label === 'Interview-acceptable answers (Opus 5 judge)').value).toBe('not run');
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
            'Answer TTFT p90 · detect p50',
            // Spec 2026-09-04 §2/§4 (answer-what-was-asked) — appended last.
            'Answer prompt pinned to the dispatched question',
            'Spoken answers: the sentence in progress at 80 words finishes (ceiling 160)',
        ]);
    });
});
