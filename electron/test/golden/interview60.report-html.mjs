/**
 * Build the flight-test report for the 60-minute interview run as a single HTML
 * page (published as an Artifact).
 *
 *   node electron/test/golden/interview60.report-html.mjs
 *   node electron/test/golden/interview60.report-html.mjs <beforeDir>
 *   node electron/test/golden/interview60.report-html.mjs <beforeDir> <afterDir>
 *
 * With no args, the report describes the live checkout's own log files (today's
 * behaviour, via computeRunFromFiles). With one dir, it describes that run
 * snapshot instead. With two, it additionally renders a gate table and a
 * before/after strip comparison against the second dir, so a re-run of the
 * hour can be judged without re-deriving any number by hand — the one
 * analysis lives in interview60.metrics.mjs; this file only renders it.
 *
 * Inputs (all read-only):
 *   interview60.timeline.json     what was played, when
 *   natively_debug.log            the app's own account: detections, suppressions, Live state, Pro retries
 *   verbal-diag.log               answer routing, redirects, hard failures
 *   interview60.answers.json      answer-only pass (scored quality + latency) — optional, section says "pending" if absent
 *
 * DESIGN PLAN
 *   Subject: a reliability flight test of a live interview copilot — audio in,
 *   detection, ~2s answers. Audience: the owner deciding whether to trust it in a
 *   real interview. Job of the page: verdict first, then evidence, then fixes.
 *   Treatment: technical report — instrument-panel display type, serif body for
 *   the reading, mono for anything that came out of a log.
 *   Color (light): paper #F6F7F9, surface #FFFFFF, ink #151B26, muted #5C6675,
 *     line #DDE2EA, accent teal #0B8FA3 (the "live meter" hue).
 *   State colors for the hour strip — validated with the dataviz checker, teal↔orange
 *     is CVD-safe where red↔green was not (deutan ΔE 4.2 → 16.9):
 *     answered #0B8FA3 · unanswered #D9730D · not detected = hollow cell (shape, not fill).
 *   Dark: paper #0F131A, surface #171D27, ink #E6EAF0, muted #98A3B3, line #2A3240,
 *     accent #1E9DB1, unanswered #C26A17 (validated on #171D27).
 *   Type: Barlow Condensed 600/700 (display, big numbers) · Source Serif 4 (body) ·
 *     JetBrains Mono (log excerpts, timestamps, tabular figures).
 *   Layout: one reading column (~68ch) that widens to 1040px for the strip and
 *     tables; verdict block at the top; findings ranked by severity with labelled
 *     chips (never colour alone); evidence set in mono blocks with square corners.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeRun, computeRunFromFiles, evaluateGate, GATE } from './interview60.metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const RUNS_DIR = path.join(HERE, 'interview60.runs');
const exists = (f) => fs.existsSync(f);

const [beforeDirArg, afterDirArg] = process.argv.slice(2);
const before = beforeDirArg
    ? computeRun(path.resolve(beforeDirArg))
    : computeRunFromFiles({
        debugLog: path.join(PROJ, 'natively_debug.log'),
        diagLog: path.join(PROJ, 'verbal-diag.log'),
        timelinePath: path.join(HERE, 'interview60.timeline.json'),
        answersPath: path.join(HERE, 'interview60.answers.json'),
    });
const after = afterDirArg ? computeRun(path.resolve(afterDirArg)) : null;

// ── Model comparison: the judge files of the run being reported ──────────
// interview60.judge.json is the hour's own answers (in the app, with transcript
// context); interview60.judge.<model>.json are the answer-only arms that
// interview60.flight.mjs runs after the hour — same 52 questions, same prompt,
// same grader. Rendered only when the files exist.
const ARMS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemma-4-31b-it'];
const cmpDir = afterDirArg ? path.resolve(afterDirArg) : beforeDirArg ? path.resolve(beforeDirArg) : null;
const pctl = (a, p) => { const x = a.slice().sort((u, v) => u - v); return x.length ? x[Math.min(x.length - 1, Math.floor(x.length * p))] : null; };
const readJudge = (file, label) => {
    if (!cmpDir || !exists(path.join(cmpDir, file))) return null;
    const j = JSON.parse(fs.readFileSync(path.join(cmpDir, file), 'utf8'));
    const v = Object.values(j.items ?? {}).filter((x) => x.kind === 'spoken');
    const count = (verdict) => v.filter((x) => x.verdict === verdict).length;
    const mean = (k) => v.length ? (v.reduce((t, x) => t + (x[k] ?? 0), 0) / v.length) : null;
    return { label, n: v.length, acceptable: count('acceptable'), weak: count('weak'), wrong: count('wrong'), errors: count('error'),
        meanCorrectness: mean('correctness'), words: pctl(v.map((x) => String(x.answer ?? '').split(/\s+/).filter(Boolean).length), .5),
        wrongReasons: v.filter((x) => x.verdict === 'wrong').map((x) => x.reason) };
};
const armLatency = (model) => {
    const f = path.join(cmpDir ?? '', model === ARMS[0] ? 'interview60.answers.json' : `interview60.answers.${model}.json`);
    if (!cmpDir || !exists(f)) return null;
    const a = Object.values(JSON.parse(fs.readFileSync(f, 'utf8'))).filter((x) => x.spoken);
    return { ttft50: pctl(a.map((x) => x.ttft), .5), ttft90: pctl(a.map((x) => x.ttft), .9), total50: pctl(a.map((x) => x.total), .5) };
};
const comparison = [
    readJudge('interview60.judge.json', 'In the app this hour — 3.1 Flash Lite, transcript context'),
    ...ARMS.map((m) => { const j = readJudge(`interview60.judge.${m}.json`, `${m} — answer-only pass`); return j && { ...j, ...(armLatency(m) ?? {}) }; }),
].filter(Boolean);

const {
    items, caught, surfacedMulti, stats, stt, routes, redirects, hardFails, liveQ, orphanLive, cues,
    answersPass: A, startedAt, endedAt, durationMin, detectP50, detectP90, heard, answered,
} = before;
const n = items.length;
const complete = !!endedAt;
const detectedAny = heard;
const missed = n - heard;
const unanswered = heard - answered;
const intentOfLive = liveQ.reduce((a, q) => ({ ...a, [q.intent]: (a[q.intent] || 0) + 1 }), {});

// ── html helpers ─────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hhmm = (ms) => new Date(ms).toISOString().slice(11, 19);
const fmt = (x) => (x == null ? '—' : typeof x === 'number' ? x.toLocaleString('en-US') : x);
const chip = (kind, label) => `<span class="chip chip--${kind}"><span class="chip__glyph" aria-hidden="true">${{ critical: '!', high: '▲', medium: '●', low: '○', fixed: '✓', open: '…', mitigation: '⇢' }[kind] || ''}</span>${esc(label)}</span>`;
const mono = (lines) => `<pre class="log">${esc(Array.isArray(lines) ? lines.join('\n') : lines)}</pre>`;

const OUTCOME_LABEL = { answered: 'Answered', suppressed: 'Detected by Live, suppressed as duplicate of the STT chip — never answered', 'whisper-only': 'Detected only by the STT/Groq detector — never answered', 'live-no-answer': 'Detected by Live, no answer produced', missed: 'Not detected by either detector' };
const outcomeShort = { answered: 'answered', suppressed: 'unanswered · race', 'whisper-only': 'unanswered · STT-only', 'live-no-answer': 'unanswered', missed: 'not detected' };
/** Presentation-only outcome label, derived from the RunMetrics item fields
 * (heardBy/answered/raceLoss) — the same classification the old per-item
 * `outcome` field encoded, before the fields moved to interview60.metrics.mjs. */
function outcomeOf(i) {
    if (i.answered) return 'answered';
    if (i.raceLoss) return 'suppressed';
    if (i.heardBy === 'whisper') return 'whisper-only';
    if (i.heardBy === 'live' || i.heardBy === 'both') return 'live-no-answer';
    return 'missed';
}
const tally = (o) => items.filter((i) => outcomeOf(i) === o).length;

// ── findings (ranked) ────────────────────────────────────────────────────────
const findings = [
    {
        sev: 'critical', status: 'open',
        title: 'In Auto mode, whichever detector fires first decides whether a question gets answered at all',
        symptom: `${unanswered} of ${n} spoken questions produced no answer during the hour. Every one of them was detected — the app heard the question, surfaced a chip, and stopped.`,
        evidence: [
            '15:50:33.194  [Main] Live question (verbal, mode=auto): "What is a SageMaker endpoint, and what does it actually host?"',
            '15:50:33.194  [Main] suppressed duplicate live question (already surfaced by whisper): "What is a SageMaker endpoint, and what does i',
            '              (no generateStream invocation follows)',
        ],
        cause: `Two detectors run in parallel: the STT→Groq "whisper" detector and Gemini Live. A single deduper decides which one gets to surface the chip. Auto-answer is wired only to the Live branch, and that branch returns at the dedupe gate before reaching the answer call (main.ts, "suppressed duplicate live question"). The whisper branch only sends a chip to the renderer and never answers. The winner is timing luck, not a fixed bias — over the hour Live won ${stats.whisperLostRace} races and lost ${stats.liveLostRace} — so the outcome per question is effectively a coin toss that lands on "silently dropped" whenever STT is first.`,
        fix: 'Not changed during the run (a code change requires an app restart, which would have ended the measurement).',
        recommendation: 'One-line class of fix: when liveMode === \'auto\' and the deduper reports a duplicate from the whisper source, still trigger runWhatShouldISay once — or have the whisper path answer when Auto is on. Then re-run this exact hour; the strip below should turn almost entirely teal. This does not affect Suggest mode, where a chip from either detector is clicked by the candidate.',
        after: (m) => `${m.raceLosses} of ${m.items.length} lost the race`,
    },
    {
        sev: 'critical', status: 'fixed',
        title: 'After long uptime, Live enters a reconnect loop that never recovers — ~1 reconnect per second, zero detections',
        symptom: 'Found by preflight the morning after the app had been left running ~13h: every reconnect immediately closed with "BidiGenerateContent session expired", forever. The UI showed a green Live dot the whole time.',
        evidence: [
            '11:16:42.801  [LiveRouter] reconnecting (attempt 1/3) in 300ms — BidiGenerateContent session expired',
            '11:16:43.362  [Main] Live Mode status: connected',
            '11:16:43.749  [LiveRouter] reconnecting (attempt 1/3) in 300ms — BidiGenerateContent session expired',
            '11:16:44.284  [Main] Live Mode status: connected',
            '              …repeating at ~1/s',
        ],
        cause: 'GeminiLiveRouter reconnects with the stored session-resumption handle. When the handle itself expires, resuming produces another immediate "session expired"; because each attempt briefly reaches connected, the attempt counter resets and the loop never escalates to slow-retry.',
        fix: `On a close whose reason contains "expired", the handle is dropped and the next connect starts fresh (the API creates a new session when no handle is sent). Two tests added; 215/215 pass. In this run: ${stats.expired} expiry loop${stats.expired === 1 ? '' : 's'} across ${stats.reconnects} reconnects${durationMin ? ` over ${durationMin} minutes` : ''}.`,
        recommendation: 'Shipped. Worth keeping in mind that Live mode is not persisted — an app restart reverts it to Off — so a preflight before a real interview should confirm the green dot is actually detecting, not just connected.',
    },
    {
        sev: 'critical', status: 'open',
        title: 'With Context on, the verbal answer pipeline never runs — every technical question is answered by the negotiation-coaching path',
        symptom: `${stats.classifiedNegotiation} of ${stats.classifiedTotal} knowledge-orchestrator classifications during the hour were "negotiation" — for Docker, Airflow and Kubernetes questions. Each one attempted gemini-3.1-pro-preview (${stats.proAttempts} attempts, ${stats.pro429} × HTTP 429), fell back to flash-lite, and produced a negotiation-coaching JSON blob (${stats.coachingBlobs} of them). streamChat then yields that blob as THE answer and returns without calling the answer model: the "Say this" card on screen is the coaching response. The verbal prompt, its filters and the word budget were bypassed for the whole hour; the answers read acceptably only because flash-lite ignored the negotiation framing. The on-screen TTFT of ~5 s is the orchestrator's round trip (three 429 retries plus a structured generation), not answer latency.`,
        evidence: [
            '15:48:29.877  [Main] Live question (verbal, mode=auto): "What is the difference between a Docker image and a container?"',
            '15:48:29.884  [KnowledgeOrchestrator] Intent classified: negotiation',
            '15:48:30.485  [LLMHelper] Structured generation: trying Gemini Pro (gemini-3.1-pro-preview)...',
            '15:48:30.609  [LLMHelper] Transient error (429). Retrying in 400ms...',
            '15:48:31.131  [LLMHelper] Transient error (429). Retrying in 800ms...',
            '15:48:32.079  [LLMHelper] Transient error (429). Retrying in 1600ms...',
            '15:48:35.491  [SessionTracker] addAssistantMessage called with: {"__negotiationCoaching":{"tacticalNote":"Explorin',
        ],
        cause: 'classifyIntent() is substring matching over a keyword list that includes ordinary words ("base", "range", "expect", "pay", "offer", "package"). It is called with the composed prompt — transcript, prior assistant messages, framing — not the question (the embedding call on the same string logs textLen=1061 for a 43-character question). Once one coaching blob lands in the transcript, every later classification sees negotiation vocabulary in it and the state is self-sustaining. The first trigger on a fresh session fires on the scaffolding itself.',
        fix: 'Not changed. Zero-code mitigation available: the Context toggle → profile:set-mode → setKnowledgeMode(false) disables the orchestrator entirely.',
        recommendation: 'Classify on the question only, with word-boundary matching (or a model call), and never on the composed prompt. Separately, structured generation should not try Pro first on a key where Pro is rate-limited — it costs ~3.2s per question before the fallback even starts. For the interview itself: Context OFF removes this whole path.',
        after: (m) => `${m.coachingAnswers} coaching-path answers`,
    },
    {
        sev: 'high', status: 'open',
        title: 'Deepgram closes the interviewer STT socket every 12 seconds, all hour — and the app cannot yet say why',
        symptom: `${stt.closes} closes in ${durationMin ?? '…'} minutes, one every ${stt.gapMedianS ?? '…'} s, every one with code 1011: "Deepgram did not receive audio data or a text message within the timeout window". Each socket lived ${stt.lifeP10}–${stt.lifeP90} s (p10–p90) whether or not Deepgram transcribed speech on it: M04's socket was closed 0.6 s after returning a partial transcript. The app reconnects in ~1.7 s and replays what it buffered meanwhile, but whatever Deepgram was holding server-side is gone. Cost this hour: ${stt.lostUtterances.length} question${stt.lostUtterances.length === 1 ? '' : 's'} Deepgram had already half-transcribed came back as an empty final (${stt.lostUtterances.map((u) => `${hhmm(u.at)} "${u.text.slice(0, 48)}…"`).join('; ')}) — one of them, M04, is the only question of the 52 that no detector surfaced; ${stt.finalsAfterReconnect.length} finals landed inside 3 s of a reconnect as fragments ("A container.", "Times.", "What do you do?"); H03 lost its head ("How would you design a pipeline" → "And that retrains…"). ${stt.emptyFinals} empty finals against ${stt.finals} real ones. This is in every mode, Suggest included.`,
        evidence: [
            '16:00:58.600  [DeepgramStreaming] Connected',
            '16:00:58.601  [DeepgramStreaming] Flushed 16 buffered chunks',
            '16:01:05.520  [DeepgramStreaming] Transcript event — isFinal=false, text="Why would you use"',
            '16:01:08.232  [DeepgramStreaming] Transcript event — isFinal=false, text="Why would you use CloudFormation instead of configuring things by"',
            '16:01:08.838  [DeepgramStreaming] Closed (code=1011, reason=Deepgram did not receive audio data or a text message within the timeout window. See https://dpgr.am/net0001)',
            '16:01:08.839  [DeepgramStreaming] Reconnecting in 1000ms (attempt 1/10)...',
            '16:01:10.428  [DeepgramStreaming] Connected',
            '16:01:10.992  [DeepgramStreaming] Transcript event — isFinal=true, text=""',
            '',
            'reproduced after the run, 17:18 UTC, playing the 34 s probe into the idle app:',
            '17:18:47.411  Connected → 17:18:51.075 final "Why do docker layers matter for build times?" → 17:18:57.765 Closed (code=1011)   10.35 s after open',
            '17:18:59.548  Connected → 17:19:08.125 final "How would you handle auto scaling …"       → 17:19:09.876 Closed (code=1011)   10.33 s after open',
        ],
        cause: 'Not established, and the evidence is contradictory on its face, so no guess is offered. What is established: (1) the server is behaving — against the same key, the same 48 kHz linear16 chunk shape at real time and at the ~25% duty the run log shows, a socket stays open as long as audio flows, and a KeepAlive every 8 s keeps a silent one open; a socket sent nothing dies at 12 s. (2) DeepgramStreamingSTT itself is sound — the compiled class, driven exactly as main.ts drives it (setSampleRate 48000, start, write 1920-byte chunks every 80 ms), held a socket for 40 s under both transports the SDK can pick (Node\'s WebSocket, and the ws package that Electron 33 uses). (3) Inside the running app, sockets die 10.3–10.8 s after open no matter what was transcribed on them, and idle ones die at 6.3 s — earlier than an idle socket dies standalone. So something specific to the Electron process means that what reaches the wire after the initial buffered flush is not counted by the server, even though the server transcribes it. That sentence contradicts itself, which is the point: one of the two observations is not what it looks like, and only a wire-level count from inside the app will say which.',
        fix: 'Not changed.',
        recommendation: 'Instrument, then fix. Log, per socket, the bytes handed to live.send() and each keepAlive() tick from inside DeepgramStreamingSTT in the running app, alongside the transcript timeline; the 34 s probe reproduces the close within 30 s, so the loop is fast. If the steady writes are not reaching the wire, the buffer handed to write() by the capture is the first suspect (the SDK sends asynchronously). Until it is fixed, count on losing roughly one question per hour on the STT path and treat a fragment chip ("Times.") as a symptom of this, not of the interviewer.',
        after: (m) => `${m.sttCloses} closes, ${m.lostUtterances} lost utterance${m.lostUtterances === 1 ? '' : 's'}`,
    },
    {
        sev: 'high', status: 'open',
        title: 'Live surfaced a question that was never asked, and Auto mode answered it',
        symptom: `At 16:01:13 the Live detector emitted "Tell me about a time you handled a resource constraint problem in a deployment." No such sentence exists anywhere in the hour of audio. The STT partials from the same seconds carry the question actually being spoken — M04, "Why would you use CloudFormation instead of configuring things by hand in the console?" — word for word, so the audio was clean. The chip on screen was the invented question, and Auto mode answered it with a behavioural intent override. The answer that came back was about CloudFormation, because the answer prompt is built from the STT transcript rather than from Live's label — the reader saw the wrong question over the right answer. Over the hour ${caught} of ${liveQ.length} Live lines match${caught === 1 ? 'es' : ''} no played question${orphanLive.length - caught > 0 ? `, and ${orphanLive.length - caught} more ${orphanLive.length - caught === 1 ? 'is' : 'are'} a re-detection or a paraphrase that no single question can claim` : ''}. Related: ${surfacedMulti} question${surfacedMulti === 1 ? '' : 's'} reached the renderer from both detectors because the deduper compares text and Live had rewritten it (M25: "How would you handle a dataset that must be deleted on request for compliance?" became "How do you design a system where customer data must be deleted on request…", one chip marked coding, the other verbal); whether the chip list merged them on screen was not observed.`,
        evidence: [
            '16:01:08.232  [DeepgramStreaming] Transcript event — isFinal=false, text="Why would you use CloudFormation instead of configuring things by"',
            '16:01:13.273  [Main] Live question (behavioral, mode=auto): "Tell me about a time you handled a resource constraint problem in a deployment."',
            '16:01:13.275  [IntelligenceEngine] runWhatShouldISay: intent override → behavioral',
            '16:01:14.914  [SessionTracker] addAssistantMessage called with: I prefer CloudFormation because it treats infrastr',
        ],
        cause: 'The Live detector\'s output is a model-written string — the question as Gemini Live chose to phrase it — and nothing compares it with what the STT heard before it becomes the chip text and the intent. Usually the rewrite is harmless ("Walk me through…" → "How…"); once this hour it was a different question, and its intent was used to choose the answer style.',
        fix: 'Not changed.',
        recommendation: 'Cross-check every Live question against the last few seconds of STT transcript (token overlap, the same measure this report uses). On a good match surface the transcript\'s wording; on a poor match surface the transcript sentence and treat Live\'s intent as advisory. The same check removes the double chips, since both detectors would then agree on the text.',
        after: (m) => `${m.caught} caught, ${m.surfacedMulti} double${m.surfacedMulti === 1 ? '' : 's'}`,
    },
    {
        sev: 'medium', status: 'open',
        title: 'Two-sentence questions reach the STT detector as their last sentence only',
        symptom: `Nine of the 52 questions were a scenario sentence followed by the question ("A SageMaker endpoint serving ten thousand requests per second has p99 latency creeping up. How do you diagnose and fix it?"), and one (H03) was a single sentence carrying two questions. Seen twice this hour, the chip the STT detector forwarded was the last clause alone — "How do you diagnose and fix it?" (H02) and "And what guardrails would you put in?" (H03) — a chip with no referent. Live merges the clauses correctly when it is listening, but at H02 it was mid-reconnect and missed the question entirely, so the referent-less chip was all there was; at H03 it heard the whole sentence and classified it coding. The transcript still carries the scenario, so a clicked chip is answered in context; in Auto mode an STT-only chip is never answered at all.`,
        evidence: [
            '16:32:35.178  [DeepgramStreaming] Transcript event — isFinal=true, text="Second has p 99 latency creeping up."',
            '16:32:35.206  [LiveRouter] reconnecting (attempt 1/3) in 300ms — The operation was aborted.',
            '16:32:37.115  [DeepgramStreaming] Transcript event — isFinal=true, text="How do you diagnose and fix it?"',
            '16:32:37.636  [Main] forwarding detected-question → renderer (win=true) intent=verbal q="How do you diagnose and fix it?"',
            '16:33:49.486  [DeepgramStreaming] Transcript event — isFinal=true, text="And that retrains, validates, and deploys with no human in the loop."',
            '16:33:50.743  [DeepgramStreaming] Transcript event — isFinal=true, text="And what guardrails would you put in?"',
            '16:33:51.324  [Main] forwarding detected-question → renderer (win=true) intent=verbal q="And what guardrails would you put in?"',
            '16:33:52.356  [Main] Live question (coding, mode=auto): "How would you design a pipeline that retrains, validates, and deploys with no hu"',
        ],
        cause: 'Each Deepgram final is one clause (300 ms endpointing), and the chip text is the final that classified as a question. The scenario clause is a statement, so it never becomes a chip; the question that follows is a pronoun and a verb. (H03\'s first final also lost its head, "How would you design a pipeline", to a socket reconnect — the previous finding.)',
        fix: 'Not changed.',
        recommendation: 'When a final that is a question starts with "And", "So", or a pronoun, prepend the previous final if it ended within ~3 s. Local, cheap, and it makes the chip readable.',
    },
    {
        sev: 'high', status: 'fixed',
        title: 'Any answer failure was masked as "Could you repeat that?"',
        symptom: 'A 429, an expired key, a dropped socket, a safety block — all produced the same polite sentence, indistinguishable from a real request to repeat. The DB holds three consecutive examples from 2 July ("Implement an LRU cache", "How do Transformers work?").',
        evidence: [
            'ai_interactions id=18..20  type=assist  ai_response="Could you repeat that? I want to make sure I address your question properly."',
        ],
        cause: 'A single catch-all in WhatToAnswerLLM.generateStream yielded the sentence for every error, with the cause only in a console nobody has open mid-interview.',
        fix: 'Replaced with a visible message naming both failed models and the cause. Covered by tests.',
        recommendation: 'Shipped.',
    },
    {
        sev: 'medium', status: 'fixed',
        title: 'The verbal-technical path had no fallback model at all',
        symptom: 'The primary model (gemini-3.1-flash-lite) was a single point of failure for every spoken technical answer.',
        evidence: [
            'gemini-3.1-flash-lite   TTFT p50 2339ms  p90 3736ms  max  4297ms   0 errors / 15',
            'gemini-3.5-flash-lite   TTFT p50 5879ms  p90 29731ms max 32233ms   0 errors / 20   (fallback — bimodal)',
            'gemma-4-31b-it          TTFT p50 1387ms  max 1958ms   10 of 15 were HTTP 429   (old stall fallback)',
        ],
        cause: 'Only the behavioral path had a stall fallback (to Gemma, which 429s two-thirds of the time on this key). Verbal-technical went straight to the catch-all.',
        fix: 'gemini-3.5-flash-lite is now the fallback for both a 4s first-token stall and a pre-token hard failure; the redirect is announced end-to-end so the metrics bar shows the model that actually answered; the fallback is warmed at startup (cold it costs 17–27s). Mid-stream failures do not restart (the reader would see the answer begin twice).',
        recommendation: `Shipped, with two caveats. 3.5-flash-lite is bimodal — about a third of calls take 12–32s — so a stall recovery can be slow. And it is not an independent leg: same key, same plumbing; a quota or auth outage takes out both. Real redundancy means a second provider. During this hour the fallback fired ${redirects.length} time${redirects.length === 1 ? '' : 's'} and there were ${hardFails.length} hard failures.`,
    },
    {
        sev: 'medium', status: 'open',
        title: 'Spoken design questions are sometimes classified "coding" and routed past every verbal filter',
        symptom: `During this hour, ${routes.filter((r) => /^CODING/.test(r.route)).length} spoken question${routes.filter((r) => /^CODING/.test(r.route)).length === 1 ? ' was' : 's were'} routed down the CODING path with no verbal filter (Live intents over the hour: ${Object.entries(intentOfLive).map(([k, v]) => `${k} ${v}`).join(', ') || 'n/a'}). In calibration, 2 of 3 spoken design questions were classified coding.`,
        evidence: [
            '16:06:44.149  [Main] Live question (coding, mode=auto): "How would you handle a task in Airflow that intermittently fails because of…"',
            '16:06:44.152  route: CODING (selected model, no filter)',
        ],
        cause: 'The coding branch in WhatToAnswerLLM bypasses filterVerbalLines, stripSpokenNotation and the word budget, so a question asked aloud can get a code-shaped answer with fences and Time/Space annotations.',
        fix: 'Not changed.',
        recommendation: 'Treat "coding" from the live detector as advisory unless a screenshot is attached; route spoken questions through the verbal filters regardless. The rate over a full hour is the number to act on — see the strip and table.',
        after: (m) => `${m.codingForSpoken} spoken question${m.codingForSpoken === 1 ? '' : 's'} routed CODING`,
    },
    {
        sev: 'medium', status: 'open',
        title: 'The metrics bar names a model that did not answer',
        symptom: 'Watching the run, the bar under a Live answer read "Gemma 4 31B · Live · TTFT 5.2s" while the model dropdown said Gemini 3.1 Flash Lite.',
        evidence: [
            'NativelyInterface.tsx:814   sm.setSource(`${data.intent === \'behavioral\' ? \'Gemini Flash 3.1\' : \'Gemma 4 31B\'} · Live`);',
            'NativelyInterface.tsx:2570  sm.setSource(intent === \'behavioral\' ? \'Gemini Flash 3.1\' : \'Gemma 4 31B\');',
        ],
        cause: 'The renderer guesses the model from the intent instead of being told. streamChat routes on the dropdown selection, so a non-behavioral Live answer is labelled Gemma whatever actually generated it. The attribution channel wired today (suggested_answer_source) only carries the fallback redirect; the normal path emits no source at all, so the guess stands.',
        fix: 'Not changed — the fallback redirect is now announced correctly, but the default label is still a guess.',
        recommendation: 'Have LLMHelper emit __model_source:<model>__ for every stream, not only the Gemma-guarded ones, and delete the intent-based guesses at 814 and 2570. Until then, treat the model name in the bar as unreliable.',
    },
    {
        sev: 'low', status: 'fixed',
        title: 'The notation stripper (added yesterday) corrupted line breaks inside coaching cards and leaked a trailing "**"',
        symptom: 'Two defects in my own change. (1) The coaching JSON that streamChat yields passes through the spoken-notation stripper, which deletes a backslash before a letter — so every "\\n" inside the card text became the letter "n" ("…code.nIt also…"). The JSON still parsed, so nothing failed loudly. (2) A spoken answer ending in bold ("…and **p99**") leaked "**": the stripper held one star for lookahead and the pair never reassembled.',
        evidence: [
            'blob through the shipped chain: 295 chars in, 293 out — JSON.parse OK, but tacticalNote "…concrete.\\nKeep…" became "…concrete.nKeep…"',
            'expected "use ModelLatency and p99"   received "use ModelLatency and p99**"',
        ],
        cause: 'The stripper was written for TeX-style "\\alpha" and had no notion of a structured payload; and it deferred a single trailing "*" instead of a trailing pair.',
        fix: 'A payload whose first non-blank character is "{" now passes through untouched, and a trailing "**" is held as a pair. Five tests added (220/220). Fixed in source and rebuilt AFTER the hour — the app that ran this measurement still had both defects.',
        recommendation: 'Shipped. Worth knowing when reading the coaching cards from this run: a stray "n" mid-sentence is this, not the model.',
    },
    {
        sev: 'low', status: 'open',
        title: 'flash-lite runs ~5 words over the 70-word spoken budget',
        symptom: 'Median 71 words, max 81, 7 of 13 MLOps answers over budget; the answer-only pass below shows the rate over 52 questions. About 5–10 extra seconds of speech per answer.',
        evidence: ['gemini-3-flash-preview  mean 65.9w  over-budget 2/13     (54.9s per answer — unusable live)', 'gemini-3.1-flash-lite   mean 70.7w  over-budget 7/13     (2.3s p50 — the app default)'],
        cause: 'A model trait, not a prompt bug: the product-vocabulary prompt change trimmed the worst case (96→81 words) but not the median.',
        fix: 'Not changed.',
        recommendation: 'Either accept it, or lower SPOKEN_WORD_BUDGET to ~60 so the model lands near 70 (a hypothesis — one golden-set run confirms it) and the gate stops failing on a decision already made.',
        after: (m) => (m.answersPass ? `${m.answersPass.words.over}/${m.answersPass.n} over 70 words` : '—'),
    },
];

// ── the hour strip, and its table — reusable for a before/after comparison ──
function renderStrip(its) {
    return its.map((i) => { const o = outcomeOf(i); return `<span class="cell cell--${o}" title="${esc(i.id)} · ${esc(outcomeShort[o])} · ${esc(i.q)}"><span class="sr">${esc(i.id)} ${esc(outcomeShort[o])}</span></span>`; }).join('');
}
function renderStripRows(its) {
    return its.map((i) => { const o = outcomeOf(i); return `<tr><td class="num">${esc(i.id)}</td><td>${esc(i.q)}</td><td><span class="dot dot--${o}" aria-hidden="true"></span>${esc(outcomeShort[o])}</td><td class="num">${i.heardBy ?? '—'}</td><td class="num">${i.detectMs != null ? fmt(i.detectMs) + ' ms' : '—'}</td></tr>`; }).join('');
}
const strip = renderStrip(items);
const stripRows = renderStripRows(items);

// ── gate table + before/after strips + iterations, only when a second dir was given ──
const gateSection = !after ? '' : (() => {
    const g = evaluateGate(after);
    const gateRows = g.rows.map((r, i) => `<tr><td>${esc(r.label)}</td><td class="num">${esc(GATE[i].before)}</td><td class="num">${esc(r.value)}</td><td class="num">${r.pass ? 'PASS' : 'FAIL'}</td></tr>`).join('');
    const afterLabel = `After · ${esc((after.startedAt ?? '').slice(0, 10) || 'this run')}`;
    // Each folder computed independently — a folder missing a required log
    // file (a partial or interrupted run) used to throw and take the whole
    // iterations table (and this entire report) down with it.
    const iterations = exists(RUNS_DIR)
        ? fs.readdirSync(RUNS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory())
            .map((e) => {
                try {
                    const rm = computeRun(path.join(RUNS_DIR, e.name));
                    return `<tr><td>${esc(path.basename(rm.dir))}</td><td class="num">${rm.answered}/${rm.items.length}</td><td class="num">${rm.heard}/${rm.items.length}</td><td class="num">${rm.sttCloses}</td></tr>`;
                } catch (err) {
                    return `<tr><td>${esc(e.name)}</td><td colspan="3">incomplete: ${esc(err.message)}</td></tr>`;
                }
            })
            .join('')
        : '';
    return `
<section aria-label="Gate">
  <h2>Gate — ${g.pass ? 'PASSED' : 'FAILED'}</h2>
  <p class="measure">Spec §6, judged against the after run. "Before" is the fixed reference this report was written against; "after" is recomputed every time.</p>
  <div class="tablewrap"><table><thead><tr><th>Row</th><th class="num">Before</th><th class="num">After</th><th class="num">Gate</th></tr></thead><tbody>${gateRows}</tbody></table></div>
  <h3>The hour, before vs after</h3>
  <div class="strip" role="img" aria-label="Before run outcomes">${renderStrip(before.items)}</div>
  <p class="muted" style="margin:2px 0 10px">Before · 2026-09-02</p>
  <div class="strip" role="img" aria-label="After run outcomes">${renderStrip(after.items)}</div>
  <p class="muted" style="margin:2px 0 22px">${esc(afterLabel)}</p>
  <h3>Iterations</h3>
  <div class="tablewrap"><table><thead><tr><th>Run</th><th class="num">Answered</th><th class="num">Heard</th><th class="num">STT closes</th></tr></thead><tbody>${iterations}</tbody></table></div>
</section>`;
})();

const verdictAuto = unanswered / n >= 0.2
    ? `Not reliable in <strong>Auto</strong> mode: ${unanswered} of ${n} questions were detected and then never answered.`
    : `Auto mode answered ${answered} of ${n} questions.`;

const html = `<title>Natively Flight Test</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
  :root{
    --paper:#F6F7F9; --surface:#FFFFFF; --ink:#151B26; --muted:#5C6675; --line:#DDE2EA; --line-strong:#B9C1CC;
    --accent:#0B8FA3; --accent-ink:#075E6C; --accent-soft:#E3F3F6;
    --ok:#0B8FA3; --bad:#D9730D; --bad-soft:#FBEBDD; --ok-soft:#E3F3F6;
    --crit:#B42318; --crit-soft:#FBE9E7; --high:#B25E00; --high-soft:#FBEFDF; --med:#5C6675; --med-soft:#EEF1F5; --low:#5C6675; --low-soft:#F3F5F8;
    --display:"Barlow Condensed","Arial Narrow","Helvetica Neue",Arial,sans-serif;
    --body:"Source Serif 4",Georgia,"Times New Roman",serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --paper:#0F131A; --surface:#171D27; --ink:#E6EAF0; --muted:#98A3B3; --line:#2A3240; --line-strong:#3C4657;
      --accent:#1E9DB1; --accent-ink:#8ED3DE; --accent-soft:#12303A;
      --ok:#1E9DB1; --bad:#C26A17; --bad-soft:#3A2510; --ok-soft:#12303A;
      --crit:#F0665C; --crit-soft:#3A1B18; --high:#E0A93E; --high-soft:#3A2E12; --med:#98A3B3; --med-soft:#222A36; --low:#98A3B3; --low-soft:#1C2330;
    }
  }
  :root[data-theme="dark"]{
    --paper:#0F131A; --surface:#171D27; --ink:#E6EAF0; --muted:#98A3B3; --line:#2A3240; --line-strong:#3C4657;
    --accent:#1E9DB1; --accent-ink:#8ED3DE; --accent-soft:#12303A;
    --ok:#1E9DB1; --bad:#C26A17; --bad-soft:#3A2510; --ok-soft:#12303A;
    --crit:#F0665C; --crit-soft:#3A1B18; --high:#E0A93E; --high-soft:#3A2E12; --med:#98A3B3; --med-soft:#222A36; --low:#98A3B3; --low-soft:#1C2330;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.55;-webkit-font-smoothing:antialiased}
  a{color:var(--accent-ink)}
  .wrap{max-width:1040px;margin:0 auto;padding:40px 24px 96px}
  .measure{max-width:68ch}
  h1,h2,h3{font-family:var(--display);font-weight:700;line-height:1.05;text-wrap:balance;margin:0}
  h1{font-size:clamp(44px,7vw,72px);letter-spacing:-.01em}
  h2{font-size:30px;margin-top:64px;margin-bottom:14px}
  h3{font-size:22px;font-weight:600;margin-top:28px;margin-bottom:8px}
  p{margin:0 0 14px}
  .eyebrow{font-family:var(--display);font-weight:600;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .lede{font-size:20px;color:var(--ink);max-width:62ch}
  .muted{color:var(--muted)}
  .num,.tnum{font-variant-numeric:tabular-nums}
  header{display:grid;gap:14px;padding-bottom:28px;border-bottom:1px solid var(--line)}
  .verdict{margin-top:28px;display:grid;grid-template-columns:auto 1fr;gap:0 24px;border:1px solid var(--line-strong);background:var(--surface)}
  .verdict__stamp{font-family:var(--display);font-weight:700;font-size:15px;letter-spacing:.16em;text-transform:uppercase;writing-mode:vertical-rl;transform:rotate(180deg);padding:16px 10px;border-right:1px solid var(--line-strong);color:var(--accent-ink);text-align:center}
  .verdict__body{padding:20px 22px 18px}
  .verdict__body p{max-width:64ch}
  /* six tiles: 3x2 narrow, 6x1 wide — never a partial row with the grid ground showing through */
  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin-top:24px}
  @media (min-width:900px){ .tiles{grid-template-columns:repeat(6,1fr)} }
  .tiles--4{grid-template-columns:repeat(2,1fr)}
  @media (min-width:900px){ .tiles--4{grid-template-columns:repeat(4,1fr)} }
  .tile{background:var(--surface);padding:16px 16px 14px;display:grid;gap:2px}
  .tile__label{font-family:var(--display);font-weight:600;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .tile__value{font-family:var(--display);font-weight:700;font-size:40px;line-height:1;font-variant-numeric:tabular-nums}
  .tile__sub{font-size:14px;color:var(--muted)}
  .tile--bad .tile__value{color:var(--bad)}
  .tile--ok .tile__value{color:var(--ok)}
  .strip{display:flex;gap:2px;margin:18px 0 8px}
  .cell{flex:1 1 0;height:34px;min-width:8px;background:var(--surface);border:1px solid var(--line-strong)}
  .cell--answered{background:var(--ok);border-color:var(--ok)}
  .cell--suppressed,.cell--whisper-only,.cell--live-no-answer{background:var(--bad);border-color:var(--bad)}
  .cell--missed{background:transparent;border:1.5px dashed var(--line-strong)}
  .legend{display:flex;flex-wrap:wrap;gap:18px;font-size:14px;color:var(--muted);margin-bottom:6px}
  .legend span{display:inline-flex;align-items:center;gap:8px}
  .dot{display:inline-block;width:12px;height:12px;margin-right:8px;vertical-align:-1px;border:1px solid var(--line-strong)}
  .dot--answered{background:var(--ok);border-color:var(--ok)} .dot--suppressed,.dot--whisper-only,.dot--live-no-answer{background:var(--bad);border-color:var(--bad)} .dot--missed{background:transparent;border:1.5px dashed var(--line-strong)}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  details{border:1px solid var(--line);background:var(--surface);margin:14px 0}
  summary{cursor:pointer;padding:10px 14px;font-family:var(--display);font-weight:600;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  summary:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .tablewrap{overflow-x:auto}
  table{border-collapse:collapse;width:100%;font-size:15px}
  th{font-family:var(--display);font-weight:600;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);text-align:left;padding:10px 12px;border-bottom:1px solid var(--line-strong)}
  td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
  td.num,th.num{font-family:var(--mono);font-size:13.5px;white-space:nowrap}
  .log{font-family:var(--mono);font-size:13px;line-height:1.5;background:var(--surface);border:1px solid var(--line);padding:12px 14px;overflow-x:auto;margin:12px 0 16px;color:var(--ink)}
  .finding{border-top:1px solid var(--line-strong);padding:22px 0 8px;margin-top:10px}
  .finding__head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:8px}
  .finding h3{margin:6px 0 10px;max-width:70ch}
  /* min-width:0 on grid children: a <pre> with long log lines otherwise widens
     the 1fr track past the viewport (grid items default to min-width:auto) and
     the whole page scrolls sideways instead of the pre scrolling inside itself. */
  .finding dl{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:6px 18px;margin:0;max-width:78ch;min-width:0}
  .finding dt{font-family:var(--display);font-weight:600;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding-top:3px}
  .finding dd{margin:0;min-width:0}
  .two>div{min-width:0}
  .wrap{min-width:0}
  @media (max-width:560px){ .finding dl{grid-template-columns:1fr} .verdict{grid-template-columns:1fr} .verdict__stamp{writing-mode:horizontal-tb;transform:none;border-right:0;border-bottom:1px solid var(--line-strong);text-align:left;padding:10px 22px} }
  .chip{display:inline-flex;align-items:center;gap:6px;font-family:var(--display);font-weight:600;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border:1px solid currentColor}
  .chip__glyph{font-family:var(--mono);font-weight:600}
  .chip--critical{color:var(--crit);background:var(--crit-soft)} .chip--high{color:var(--high);background:var(--high-soft)} .chip--medium{color:var(--med);background:var(--med-soft)} .chip--low{color:var(--low);background:var(--low-soft)}
  .chip--fixed{color:var(--accent-ink);background:var(--accent-soft)} .chip--open{color:var(--bad);background:var(--bad-soft)} .chip--mitigation{color:var(--muted);background:var(--med-soft)}
  .good{display:grid;gap:10px;max-width:72ch}
  .good li{margin:0}
  ul{padding-left:22px}
  li{margin-bottom:8px}
  .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px 40px}
  .foot{margin-top:64px;padding-top:16px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
  .foot code,.inline{font-family:var(--mono);font-size:.9em}
  @media (prefers-reduced-motion:no-preference){ .cell{transition:transform .12s ease} .cell:hover{transform:scaleY(1.18)} }
</style>

<div class="wrap">
<header>
  <div class="eyebrow">Natively · interview copilot · flight test · 2 Sept 2026</div>
  <h1>Natively Flight Test</h1>
  <p class="lede">One hour, fifty-five interviewer prompts, hands-free. What the app heard, what it answered, what it silently dropped, and what was fixed along the way.</p>
</header>

<section class="verdict" aria-label="Verdict">
  <div class="verdict__stamp">Verdict</div>
  <div class="verdict__body">
    <p><strong>${verdictAuto}</strong> ${complete ? '' : '<em>(run still in progress — numbers below are partial)</em>'}</p>
    <p>The candidate's normal mode — <strong>Suggest</strong>, click a chip — is not affected by that race, and with the three shipped fixes (resumption loop, masked failures, verbal fallback) it is usable for a real interview <em>only with Context switched off</em>. That is not a tuning tip: with Context on, a keyword classifier labels every technical question "negotiation", the answer you see is the negotiation-coaching response, and the verbal answer pipeline — its prompt, filters and word budget — never runs. It happened to read acceptably this hour because the model ignored the framing; it also cost ~3 seconds of rate-limited Gemini Pro retries per question.</p>
    <p class="muted">Live detection itself was strong: ${detectedAny} of ${n} questions heard, detection latency p50 ${fmt(detectP50)} ms, ${stats.expired} session-expiry loops, ${stats.reconnects} routine reconnect${stats.reconnects === 1 ? '' : 's'} over ${durationMin ?? '…'} minutes. The STT socket is another story: Deepgram closed it ${stt.closes} times, once every ${stt.gapMedianS ?? '…'} s, and ${stt.lostUtterances.length} question${stt.lostUtterances.length === 1 ? '' : 's'} fell into the gaps. And once, Live surfaced a question nobody asked.</p>
  </div>
</section>
${gateSection}

<div class="tiles" role="list" aria-label="Headline numbers">
  <div class="tile" role="listitem"><span class="tile__label">Spoken questions</span><span class="tile__value">${n}</span><span class="tile__sub">+ ${cues.length} screenshot cues</span></div>
  <div class="tile" role="listitem"><span class="tile__label">Heard</span><span class="tile__value">${detectedAny}</span><span class="tile__sub">by either detector</span></div>
  <div class="tile tile--ok" role="listitem"><span class="tile__label">Answered</span><span class="tile__value">${answered}</span><span class="tile__sub">hands-free, Auto mode</span></div>
  <div class="tile tile--bad" role="listitem"><span class="tile__label">Heard, not answered</span><span class="tile__value">${unanswered}</span><span class="tile__sub">${tally('suppressed')} race · ${tally('whisper-only')} STT-only · ${tally('live-no-answer')} other</span></div>
  <div class="tile" role="listitem"><span class="tile__label">Not detected</span><span class="tile__value">${missed}</span><span class="tile__sub">by either detector</span></div>
  <div class="tile" role="listitem"><span class="tile__label">Answer failures</span><span class="tile__value">${hardFails.length}</span><span class="tile__sub">${redirects.length} fallback redirect${redirects.length === 1 ? '' : 's'}</span></div>
</div>

<h2>The hour, question by question</h2>
<p class="measure">Fifty-two spoken questions in the order they were asked, easy to hard. Hover a cell for the question; the table underneath has the same data.</p>
<div class="strip" role="img" aria-label="Outcome of each of the ${n} spoken questions in order">${strip}</div>
<div class="legend"><span><i class="dot dot--answered"></i>answered</span><span><i class="dot dot--suppressed"></i>heard, never answered</span><span><i class="dot dot--missed"></i>not detected</span></div>
<details><summary>Table view — every question</summary><div class="tablewrap"><table><thead><tr><th class="num">#</th><th>Question as asked</th><th>Outcome</th><th class="num">Heard by</th><th class="num">Detect latency</th></tr></thead><tbody>${stripRows}</tbody></table></div></details>

<h2>Findings, ranked</h2>
<p class="measure">Each one: what was seen, the log line that proves it, why it happens, and where it stands. Two were fixed during the session and are verified in the run above; the rest are yours to prioritise.</p>
${findings.map((f) => `
<article class="finding">
  <div class="finding__head">${chip(f.sev, f.sev)}${chip(f.status, f.status)}</div>
  <h3>${esc(f.title)}</h3>
  <dl>
    <dt>Seen</dt><dd>${esc(f.symptom)}</dd>
    <dt>Evidence</dt><dd>${mono(f.evidence)}</dd>
    <dt>Cause</dt><dd>${esc(f.cause)}</dd>
    <dt>Status</dt><dd>${esc(f.fix)}</dd>
    <dt>Next</dt><dd>${esc(f.recommendation)}</dd>
    ${after && f.after ? `<dt>After</dt><dd>${esc(f.after(after))}</dd>` : ''}
  </dl>
</article>`).join('')}

<h2>What works</h2>
<ul class="good">
  <li><strong>Hearing the question.</strong> ${detectedAny} of ${n} questions detected; Live detection latency p50 ${fmt(detectP50)} ms, p90 ${fmt(detectP90)} ms, measured from the end of the spoken sentence.</li>
  <li><strong>Live session stability, once the resumption bug was fixed</strong> (the Live session — not the STT socket, see the finding). ${stats.expired} expiry loops across the hour. ${stats.reconnects} reconnect${stats.reconnects === 1 ? '' : 's'}, ${stats.reconnectMedianGapS ? `at a metronomic ~${Math.round(stats.reconnectMedianGapS / 60 * 10) / 10} min median interval — a server-side session limit, not instability — ` : ''}each recovered with the gap buffer replaying what was said meanwhile.</li>
  <li><strong>Answer speed on the default model.</strong> gemini-3.1-flash-lite streams a first word in 2.3 s (p50) and finishes under 5 s worst case across 15 probes, 0 errors — inside interview rhythm.</li>
  <li><strong>Answer correctness.</strong> All 13 MLOps answers scored earlier were technically correct and named real components (ModelLatency vs OverheadLatency, ProcessingStep → TrainingStep → ModelStep, PSI / KS tests). ${A ? `The answer-only pass over this hour's ${A.n} questions: ${Object.entries(A.checks).map(([k, v]) => `${k} ${v}/${A.n}`).join(' · ')}.` : 'The answer-only pass over this hour\'s questions is pending.'}</li>
  <li><strong>Output hygiene.</strong> No leaked backticks, asterisks or sentinels reached the spoken text in any measured run; the notation stripper was verified on a real leak (4 backticks → 0, words unchanged).</li>
  <li><strong>Failures are now visible.</strong> A model outage shows as a named error and a redirected answer shows which model produced it, instead of a polite sentence that looks like the app asking you to repeat yourself.</li>
</ul>

<h2>Bottlenecks</h2>
<div class="two">
  <div>
    <h3>Quota, one key</h3>
    <p>Everything — Live listening, answering, the fallback, TTS, the knowledge orchestrator's Gemini Pro calls — rides one free-tier Gemini key. Gemini TTS walled after 3 clips; Gemini Pro 429'd on ${stats.pro429} of ${stats.proAttempts * 3 || stats.pro429} retry slots this hour. The fallback model shares the key, so it is not redundancy against the failure most likely to happen.</p>
    <h3>Two detectors, one answer path</h3>
    <p>The STT/Groq detector and Gemini Live both run; the deduper keeps the UI clean but the answer is hung off only one of them. That is the ${unanswered}-question hole in the strip.</p>
  </div>
  <div>
    <h3>Work that adds nothing on technical questions</h3>
    <p>With Context on, each answer also triggers an embedding, a keyword classification, a Pro attempt with backoff, and a coaching card. On this interview that was ~3 s and three 429s per question for zero useful output.</p>
    <h3>The model, at the margin</h3>
    <p>flash-lite is the right choice — flash-preview answers in 55 s and is mostly rate-limited — but it runs ~5 words long and is a touch more generic than flash-preview on the hardest questions.</p>
  </div>
</div>

<h2>Numbers</h2>
<h3>Answering — same question set, streamed, real filter chain</h3>
<p class="measure muted">These measure the <em>verbal path</em> — what the app runs with Context off. With Context on, the answer on screen this hour came from the negotiation-coaching path instead (finding above), whose latency is the ~5 s orchestrator round trip.</p>
<div class="tablewrap"><table><thead><tr><th>Model</th><th class="num">TTFT p50</th><th class="num">TTFT p90</th><th class="num">Max</th><th class="num">n</th><th>Notes</th></tr></thead><tbody>
<tr><td>gemini-3.1-flash-lite <span class="muted">(app default)</span></td><td class="num">2,339 ms</td><td class="num">3,736 ms</td><td class="num">4,297 ms</td><td class="num">15</td><td>0 errors</td></tr>
${A ? `<tr><td>gemini-3.1-flash-lite <span class="muted">(this hour, answer-only pass)</span></td><td class="num">${fmt(A.ttft.p50)} ms</td><td class="num">${fmt(A.ttft.p90)} ms</td><td class="num">${fmt(A.ttft.max)} ms</td><td class="num">${A.n}</td><td>${A.transient} transient; words median ${A.words.median}, max ${A.words.max}, over 70w: ${A.words.over}/${A.n}</td></tr>` : ''}
<tr><td>gemini-3.5-flash-lite <span class="muted">(fallback)</span></td><td class="num">5,879 ms</td><td class="num">29,731 ms</td><td class="num">32,233 ms</td><td class="num">20</td><td>0 errors; bimodal — ⅓ of calls 12–32 s</td></tr>
<tr><td>gemma-4-31b-it <span class="muted">(previous fallback)</span></td><td class="num">1,387 ms</td><td class="num">1,958 ms</td><td class="num">1,958 ms</td><td class="num">5</td><td>10 of 15 attempts HTTP 429</td></tr>
<tr><td>gemini-3-flash-preview</td><td class="num">54,913 ms</td><td class="num">—</td><td class="num">54,913 ms</td><td class="num">1</td><td>13 of 14 attempts HTTP 429; a thinking model — not a candidate</td></tr>
</tbody></table></div>

<h3>Detection — Live, from end of sentence to chip</h3>
<div class="tablewrap"><table><thead><tr><th>Condition</th><th class="num">p50</th><th class="num">p90</th><th class="num">Detected</th><th>Notes</th></tr></thead><tbody>
<tr><td>This hour, in the app</td><td class="num">${fmt(detectP50)} ms</td><td class="num">${fmt(detectP90)} ms</td><td class="num">${detectedAny}/${n}</td><td>continuous audio; system-audio capture only emits while the device renders</td></tr>
<tr><td>Calibration, local voice, direct to router</td><td class="num">465 ms</td><td class="num">650 ms</td><td class="num">3/3</td><td>Windows SAPI voice heard at 92–100% word overlap</td></tr>
<tr><td>Earlier, Gemini TTS voice</td><td class="num">1,211 ms</td><td class="num">—</td><td class="num">8/8</td><td>from the pipeline race audit</td></tr>
</tbody></table></div>

<h3>Quality — flash-lite vs the model it was mistaken for</h3>
<div class="tablewrap"><table><thead><tr><th>13 MLOps questions, same prompt</th><th class="num">Mean words</th><th class="num">Over 70w</th><th>Reading of the pairs</th></tr></thead><tbody>
<tr><td>gemini-3-flash-preview</td><td class="num">65.9</td><td class="num">2/13</td><td>sharper on 3 hard questions (names silent-failure modes, champion-challenger, canary)</td></tr>
<tr><td>gemini-3.1-flash-lite</td><td class="num">70.7</td><td class="num">7/13</td><td>better on the SageMaker pipeline question (real component names vs "a central library"); even elsewhere</td></tr>
</tbody></table></div>
<p class="muted measure">One reader, not blind — treat the quality column as directional. Latency settles the choice regardless.</p>

${comparison.length ? `<h3>Model comparison — same 52 questions, same prompt, same grader</h3>
<p class="measure muted">Every row was graded by the same Opus judge with the rubric in the run folder: correctness, on-topic-ness and spoken delivery, 0–2 each; <em>acceptable</em> is 2/2 with usable delivery, <em>wrong</em> is a 0 on correctness or topic. The app row is what the candidate actually saw during the hour; the arms answered the scripted questions directly, without transcript context.</p>
<div class="tablewrap"><table><thead><tr><th>Answers</th><th class="num">Acceptable</th><th class="num">Weak</th><th class="num">Wrong</th><th class="num">Mean correctness</th><th class="num">Words p50</th><th class="num">TTFT p50 / p90</th><th>Wrong ones, the judge's words</th></tr></thead><tbody>
${comparison.map((c) => `<tr><td>${esc(c.label)}</td><td class="num">${c.acceptable}/${c.n}</td><td class="num">${c.weak}</td><td class="num">${c.wrong}</td><td class="num">${c.meanCorrectness == null ? '—' : c.meanCorrectness.toFixed(2)}</td><td class="num">${fmt(c.words)}</td><td class="num">${c.ttft50 == null ? '—' : `${fmt(c.ttft50)} / ${fmt(c.ttft90)} ms`}</td><td>${c.wrongReasons.length ? esc(c.wrongReasons.join(' · ')) : '<span class="muted">none</span>'}</td></tr>`).join('\n')}
</tbody></table></div>` : ''}

<h2>Chain questions — does the thread carry forward?</h2>
${(() => {
    const f = path.join(HERE, 'interview60.chains.json');
    if (!exists(f)) return '<p class="measure muted">Pending — the chain-continuity pass runs after the hour (same key; it must not contend with the run).</p>';
    const C = JSON.parse(fs.readFileSync(f, 'utf8'));
    const hits = (t, anchors) => anchors.filter((a) => t.toLowerCase().includes(a)).length;
    const asksBack = (t) => /\b(which|what) (image|endpoint|model|task|deployment|check)\b.*\?|could you clarify|what do you mean|not sure what/i.test(t);
    let fu = 0, better = 0, ctxAsk = 0, saAsk = 0;
    const rows = [];
    for (const ch of Object.values(C)) {
        ch.turns.forEach((t, i) => {
            if (i === 0 || !t.standalone) return;
            fu++;
            const hc = hits(t.contextual, ch.anchors), hs = hits(t.standalone, ch.anchors);
            if (hc > hs) better++;
            if (asksBack(t.contextual)) ctxAsk++;
            if (asksBack(t.standalone)) saAsk++;
            rows.push(`<tr><td class="num">${esc(ch.id)} · T${i + 1}</td><td>${esc(t.q)}</td><td class="num">${hc}/${ch.anchors.length}${asksBack(t.contextual) ? ' · asks back' : ''}</td><td class="num">${hs}/${ch.anchors.length}${asksBack(t.standalone) ? ' · asks back' : ''}</td></tr>`);
        });
    }
    const detail = Object.values(C).map((ch) => `<details><summary>${esc(ch.id)} — full transcript, contextual vs standalone</summary><div class="tablewrap"><table><thead><tr><th class="num">Turn</th><th>Asked</th><th>With the transcript (as the app does it)</th><th>Standalone</th></tr></thead><tbody>${ch.turns.map((t, i) => `<tr><td class="num">T${i + 1}</td><td>${esc(t.q)}</td><td>${esc(t.contextual)}</td><td>${t.standalone ? esc(t.standalone) : '<span class="muted">(first turn — no comparison)</span>'}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
    return `<p class="measure">Five three-question chains whose follow-ups lean on "it", "that check", "the same task". Each follow-up was asked twice — once with the transcript formatted exactly as the app hands it to the answer model (interviewer turns plus previous suggestions), once standalone. The anchor count is only a proxy for whether the context was <em>used</em>; whether it was used <em>well</em> is a reader's call, and the full text is below for that.</p>
<div class="tiles tiles--4" role="list" aria-label="Chain continuity numbers">
  <div class="tile" role="listitem"><span class="tile__label">Follow-ups</span><span class="tile__value">${fu}</span><span class="tile__sub">across 5 chains</span></div>
  <div class="tile tile--ok" role="listitem"><span class="tile__label">Context used</span><span class="tile__value">${better}</span><span class="tile__sub">more anchors than standalone</span></div>
  <div class="tile" role="listitem"><span class="tile__label">Asked back</span><span class="tile__value">${ctxAsk}</span><span class="tile__sub">with context</span></div>
  <div class="tile" role="listitem"><span class="tile__label">Asked back</span><span class="tile__value">${saAsk}</span><span class="tile__sub">standalone</span></div>
</div>
<p class="measure"><strong>Reader's verdict: the thread carries.</strong> In 4 of the 10 follow-ups the standalone answer was about the wrong thing. "Ours came out at 8 gigabytes, how would you shrink it?" became an 8 GB <em>model</em> — quantisation, pruning, distillation — instead of the Docker image. "Where do you look first?" for the creeping p99 got GC logs, thread pools and database queries instead of the SageMaker endpoint's CloudWatch metrics and instance saturation. "It is compute-bound, what do you change?" got code profiling instead of instance count, instance family and Neo. "That check fires at three in the morning, what happens next?" was treated as a health check with a self-healing service restart instead of a drift alert kicking off retraining. With the transcript, all four were answered about the right thing, and the third turn still tracked the second ("if the retrain it kicked off comes back worse" → halt the promotion, keep the serving model). In the other six the follow-up carried enough nouns to stand alone and both answers were sound. Nobody asked back in either condition. The anchor count below undercounts this — it credits context in 5 of 10 — because a right answer and a wrong one can name the same words.</p>
<div class="tablewrap"><table><thead><tr><th class="num">Chain</th><th>Follow-up as asked</th><th class="num">Anchors · with context</th><th class="num">Anchors · standalone</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
${detail}
<p class="measure muted">This measures the verbal path with Context off. With Context on, the coaching short-circuit answers instead, and its continuity was not measured.</p>`;
})()}

<h2>Suggestions, in order</h2>
<ol>
  <li><strong>Close the Auto-mode race.</strong> Answer on a whisper-first duplicate when Auto is on. Then re-run this hour — same file, same command — and compare strips.</li>
  <li><strong>Stop the STT socket dying every 12 seconds.</strong> This one is in every mode, Suggest included: each reconnect drops about a second of audio, and this hour that cost one whole question and the head of another. The finding above says what the spike showed about which of audio and KeepAlive the server actually honours; fix the send path accordingly and confirm with the same 25 s probe.</li>
  <li><strong>Cross-check Live's question text against the STT transcript</strong> before it becomes a chip, and treat its intent as advisory when they disagree. One invented question in 52 is rare; a wrong chip over a right answer in a real interview is not something the candidate can debug live.</li>
  <li><strong>For the interview itself: Suggest mode, Context off.</strong> That sidesteps both open critical/high findings with zero code. Do a preflight the same day: play the 34 s probe and confirm a chip appears, not just a green dot.</li>
  <li><strong>Fix the classifier at its input.</strong> Classify the question, not the composed prompt; use word boundaries. Independently, stop trying Gemini Pro first on a key where Pro is rate-limited.</li>
  <li><strong>Route spoken questions through the verbal filters regardless of the detector's "coding" guess</strong> unless a screenshot is attached.</li>
  <li><strong>A second provider as the real fallback.</strong> OpenAI and Groq keys are already in the chain; a quota or auth fault on the Gemini key is the outage most likely to happen and the one the 3.5 fallback cannot cover.</li>
  <li><strong>Decide the word budget.</strong> Either raise the gate to ~85 or drop the instruction to ~60 and measure; stop failing a check you have chosen to live with.</li>
  <li><strong>Persist Live mode</strong> (it reverts to Off on every restart) and record answer text outside a formal meeting — this hour's answers could not be scored from the app because nothing wrote them down.</li>
</ol>

<h2>What this run did not test</h2>
<ul>
  <li><strong>The UI, visually.</strong> Everything above comes from the app's own logs. Whether the coaching card displaces the answer bubble in the renderer was not observed — the code path that can do so exists (NativelyInterface.tsx, "__negotiationCoaching" replacing a streaming what_to_answer message).</li>
  <li><strong>Screenshot / coding rounds.</strong> The three cues played but nobody pressed Ctrl+H; the Gemma vision path was covered separately earlier (five medium problems × 5–6 screenshots).</li>
  <li><strong>A real interviewer.</strong> The voice was Windows SAPI: clean, no crosstalk, no accent, no overlap. It calibrated <em>better</em> than Gemini TTS, which cuts the other way too — real audio is harder.</li>
  <li><strong>Longer than an hour</strong>, memory growth, or a second key. And answer text from the app itself — see suggestion 7.</li>
</ul>

<div class="foot">
  <p>Run started ${esc(startedAt)}${complete ? `, ended ${esc(endedAt)} (${durationMin} min)` : ' — in progress'}. Stimulus: <code>electron/test/golden/interview60.wav</code> (55 items, 60.5 min, local TTS). Runner: <code>interview60.run.mjs</code>; scoring: <code>interview60.answers.mjs</code>; this page: <code>interview60.report-html.mjs</code>. Source of every number: <code>natively_debug.log</code>, <code>verbal-diag.log</code>, and the JSON files beside them. One second of <code>verbal-diag.log</code> (16:21:50 UTC) is excluded: a unit-test run wrote six synthetic failure lines into the live file during the measurement; the leak is closed (diag logging is now a no-op under vitest) and no real answer was in flight that second.</p>
</div>
</div>
`;

// Charset-proof: the Artifact host injects <meta charset>, but a plain static
// server may not, and then every dash, arrow and check-mark turns to mojibake.
// Numeric entities read identically under any declared (or undeclared) charset.
// Safe here because the page has no <script> and no CSS content: strings.
const ascii = html.replace(/[^\x00-\x7F]/g, (c) => `&#${c.codePointAt(0)};`);
fs.writeFileSync(path.join(HERE, 'interview60.report.html'), ascii);
console.log(`items ${n}  answered ${answered}  unanswered ${unanswered}  missed ${missed}  detected ${detectedAny}  complete=${complete}`);
console.log(`stats ${JSON.stringify(stats)}`);
if (after) console.log(`gate (after) ${evaluateGate(after).pass ? 'PASSED' : 'FAILED'}`);
console.log(`wrote ${path.join(HERE, 'interview60.report.html')}`);
