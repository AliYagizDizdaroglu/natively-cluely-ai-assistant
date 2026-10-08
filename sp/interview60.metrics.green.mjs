/**
 * One analysis for one run folder. Used by `run.mjs gate` and by the report,
 * so the verdict and the page cannot disagree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { overlap, logSince } from './interview60.lib.mjs';

const CONTAMINATED = ['[2026-09-02T16:21:50'];
const ts = (s) => Date.parse(s);
// A long question is 'answered whole' at this content-word coverage (see the gate row).
const LONG_WHOLE_COVERAGE = 0.8;
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
// stt life/gap stats are seconds rounded to one decimal, distinct from pct()'s
// unrounded pick — moved verbatim from the report generator.
const q10 = (a, p) => (a.length ? Math.round(a[Math.min(a.length - 1, Math.floor(a.length * p))] * 10) / 10 : null);

export function computeRun(dir) {
    return {
        dir,
        ...computeRunFromFiles({
            debugLog: path.join(dir, 'natively_debug.log'),
            diagLog: path.join(dir, 'verbal-diag.log'),
            timelinePath: path.join(dir, 'interview60.timeline.json'),
            answersPath: path.join(dir, 'interview60.answers.json'),
            judgePath: path.join(dir, 'interview60.judge.json'),
        }),
    };
}

/**
 * Same analysis, with each input named explicitly — the live checkout's files
 * don't follow the run-dir naming convention (debug/diag logs live at the
 * project root, timeline/answers beside this script). computeRun(dir) is a
 * thin wrapper over this for a snapshotted run folder.
 *
 * Returns the RunMetrics contract used by `gate` and the headline numbers
 * (dir, startedAt, endedAt, durationMin, items, heard, answered, delivered,
 * answerFailures, answersToNobody, surfacedMax, surfacedMulti, extendsTotal, supersedesTotal, caught,
 * unverifiableWithSttUp, liveFragmentsDropped, cueAnswers, screenCaptures, heuristicChips, raceLosses, sttCloses,
 * lostUtterances, fragmentChips, coachingAnswers, codingForSpoken,
 * expiryLoops, liveReconnects, detectP50, ttftP90, ttftSource) plus a few
 * extra fields (stats, stt, routes, redirects, hardFails, liveQ, orphanLive,
 * cues, answersPass, detectP90, dispatches) that only the report's
 * findings/tables prose (or a test wanting a raw per-dispatch parse) needs —
 * kept here so that prose and the gate never re-derive the same numbers two
 * different ways.
 */
export function computeRunFromFiles({ debugLog, diagLog, timelinePath, answersPath, judgePath = null }) {
    // logSince() silently returns '' for a missing file (it's built to tolerate
    // a not-yet-rotated-in log), which would otherwise turn a bad run dir into
    // an all-zero table instead of an error naming what's missing.
    if (!fs.existsSync(debugLog)) throw new Error(`missing ${debugLog}`);
    if (!fs.existsSync(diagLog)) throw new Error(`missing ${diagLog}`);
    const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
    const dbg = logSince(debugLog, timeline.startDebug, timeline.endDebug);
    const diag = logSince(diagLog, timeline.startDiag, timeline.endDiag)
        .split('\n').filter((l) => !CONTAMINATED.some((p) => l.startsWith(p))).join('\n');
    const answers = fs.existsSync(answersPath) ? JSON.parse(fs.readFileSync(answersPath, 'utf8')) : null;
    // Judge pass (interview60.judge.mjs): spoken-question verdicts from Claude Opus 5 over the hour's own answers.
    const judge = judgePath && fs.existsSync(judgePath) ? summarizeJudge(JSON.parse(fs.readFileSync(judgePath, 'utf8'))) : null;

    // — parse (moved verbatim from the report generator) —
    const liveQ = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=(\w+)\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), intent: m[2], mode: m[3], heard: m[4] }));
    const suppressed = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] suppressed duplicate live question \(already surfaced by (\w+)\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), by: m[2], heard: m[3] }));
    const whisperFwd = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] forwarding detected-question → renderer \(win=\w+\) intent=(\w+) q="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), intent: m[2], heard: m[3] }));
    const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|extend|hold|mark|supersede) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: extends="(?:[^"\\]|\\.)*")?(?: replaces="(?:[^"\\]|\\.)*")?(?: reason=\w+)?(?: question="((?:[^"\\]|\\.)*)")?/gm)]
        .map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse(`"${m[4]}"`), verdict: m[5], duplicateOf: m[6] ?? null, answered: m[7] === 'true', question: m[8] == null ? null : JSON.parse(`"${m[8]}"`) }));
    const routes = [...diag.matchAll(/^\[(\S+)\] route: ([^\n]+)/gm)].map((m) => ({ at: ts(m[1]), route: m[2].trim() }));
    const firstTokens = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((m) => ({ at: ts(m[1]), ms: Number(m[2]) }));
    const redirects = [...diag.matchAll(/verbal primary FAILED pre-token: ([^\n]*)/g)].map((m) => m[1]);
    const hardFails = [...diag.matchAll(/generateStream FAILED[^\n]*/g)].map((m) => m[0]);
    const count = (re, s = dbg) => (s.match(re) || []).length;
    // Reconnect cadence: the intervals between "reconnecting" lines. A near-constant
    // interval is a server-side session limit (goAway), not instability.
    const reconnectAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live Mode status: reconnecting/gm)].map((m) => ts(m[1]));
    const reconnectGaps = reconnectAt.slice(1).map((t, i) => (t - reconnectAt[i]) / 1000).sort((a, b) => a - b);
    const stats = {
        reconnects: count(/Live Mode status: reconnecting/g),
        reconnectMedianGapS: reconnectGaps.length ? Math.round(reconnectGaps[Math.floor(reconnectGaps.length / 2)]) : null,
        whisperLostRace: count(/suppressed duplicate whisper chip \(already surfaced by live\)/g),
        liveLostRace: count(/suppressed duplicate live question \(already surfaced by whisper\)/g),
        expired: count(/session expired/g),
        liveFailed: count(/Live Mode status: failed/g),
        proAttempts: count(/Structured generation: trying Gemini Pro/g),
        pro429: count(/Transient error \(429\)/g),
        coachingBlobs: count(/__negotiationCoaching/g),
        classifiedNegotiation: count(/Intent classified: negotiation/g),
        classifiedTotal: count(/Intent classified:/g),
    };

    // — spec 2026-09-04 (answer what was asked) —
    // pinned: the engine logs the question it pinned as the last interviewer
    // line of the prompt; each answer dispatch in the new format (question="…")
    // must be followed within 2 s by a pinned line with the identical text —
    // the chip-parity proof. Dispatch lines without a question field are
    // "legacy" (runs before the format change) and fail the row.
    // Compared TRIMMED on both sides: IntelligenceEngine pins and logs
    // question.trim(), main.ts logs d.question as it came, and the
    // model-detector path can hand a chip text with a leading space — which is
    // the same question, not a mismatch.
    const pinnedLines = [...dbg.matchAll(/^(\S+) \[LOG\] \[IntelligenceEngine\] runWhatShouldISay: pinned question ("(?:[^"\\]|\\.)*")$/gm)].map((m) => ({ at: ts(m[1]), question: JSON.parse(m[2]) }));
    const pinned = { answers: 0, legacy: 0, missing: 0, mismatched: 0 };
    for (const d of dispatches.filter((d) => d.action === 'answer')) {
        pinned.answers++;
        if (d.question == null) { pinned.legacy++; continue; }
        const p = pinnedLines.find((l) => l.at >= d.at && l.at - d.at <= 2000);
        if (!p) pinned.missing++; else if (p.question.trim() !== d.question.trim()) pinned.mismatched++;
    }
    // budget: one line per completed spoken answer from WhatToAnswerLLM.
    const budgetLines = [...dbg.matchAll(/^(\S+) \[LOG\] \[Answer\] budget: words=(\d+) cut=(yes|no) allowance=(yes|no)/gm)].map((m) => ({ at: ts(m[1]), words: Number(m[2]), cut: m[3] === 'yes', allowance: m[4] === 'yes' }));
    const budgetWords = budgetLines.map((b) => b.words).sort((a, b) => a - b);
    // cue blocks (cue mode, spec 2026-09-20): one line per verbal answer from IntelligenceEngine,
    // `[]` when the model opened without a block; coding routes emit none. The limits mirror
    // CUE_MAX_LINES / CUE_MAX_WORDS in electron/llm/prompts.ts — this module reads logs on a
    // clean checkout and imports no build. Since spec 2026-09-30 the logged block is the one
    // DISPLAYED (trimCues: notation cleaned, at most 3 lines of 5 words), so the line/word part
    // of `wellformed` guards the seam — it fails only if the engine's cap stopped running; `?`,
    // "you", an EMPTY cue (a line that was nothing but notation, the one state the cleanup can
    // create) and an absent block still fail it. `trimmed` counts the `[Answer] cues trimmed:`
    // lines the engine logs (first, one per block the display changed: dropped, cut or cleaned):
    // shown in the row, never gated — the winning wording overruns sometimes by its own
    // pre-registered rule, and every changed line is in the log verbatim for the result note.
    const cueLines = [...dbg.matchAll(/^(\S+) \[LOG\] \[Answer\] cues: (\[.*\])$/gm)].map((m) => {
        let cues = [];
        try { cues = JSON.parse(m[2]); } catch { /* a malformed line is an answer with no cues */ }
        return { at: ts(m[1]), cues: Array.isArray(cues) ? cues : [] };
    });
    const trimLines = [...dbg.matchAll(/^(\S+) \[LOG\] \[Answer\] cues trimmed: (\{.*\})$/gm)];
    const wellformedCues = (c) => c.length >= 1 && c.length <= 3 && c.every((x) => typeof x === 'string' && x.trim() !== '' && (x.match(/\S+/g) || []).length <= 5 && !x.includes('?') && !/\byou\b/i.test(x));
    const cueBlocks = { n: cueLines.length, present: cueLines.filter((c) => c.cues.length > 0).length, wellformed: cueLines.filter((c) => wellformedCues(c.cues)).length, trimmed: trimLines.length };
    const budget = {
        n: budgetLines.length,
        // `cut` is the row's only failure mode since the 200-word guard replaced the
        // question-scaled cut (2026-09-12): the app does not shorten answers any more,
        // so a cut line means an answer ran past 200 words and was clamped.
        cut: budgetLines.filter((b) => b.cut).length,
        p50: pct(budgetWords, .5),
        max: budgetWords.length ? budgetWords[budgetWords.length - 1] : null,
    };
    // length: the same lines, read for what the grader cannot see. Sixteen independent graders
    // on s50j named length the dominant defect in every arm, and the frozen rubric never demotes
    // below delivery 1 for it — so the acceptable count is blind to the one lever with headroom.
    // 150 is s50e's measured delivery-0 cliff (<=154 usable, >=158 dead); 85 is the rubric's
    // spoken budget, carried for the trend.
    const length = {
        n: budgetLines.length,
        p90: pct(budgetWords, .9),
        over85: budgetLines.filter((b) => b.words > 85).length,
        over150: budgetLines.filter((b) => b.words > 150).length,
    };

    // — the STT socket (Deepgram): closed by the server every ~12 s, all hour —
    const sttClosedAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Closed \(code=1011/gm)].map((m) => ts(m[1]));
    const sttOpenAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Connected/gm)].map((m) => ts(m[1]));
    const sttReconnectAt = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Reconnecting in/gm)].map((m) => ts(m[1]));
    const sttGaps = sttClosedAt.slice(1).map((t, i) => (t - sttClosedAt[i]) / 1000).sort((a, b) => a - b);
    // lifetime of each socket: its Connected line → its Closed line
    const sttLife = sttClosedAt.map((c) => { const o = sttOpenAt.filter((t) => t < c).pop(); return o ? (c - o) / 1000 : null; }).filter((x) => x != null).sort((a, b) => a - b);
    const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
    const partials = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=false, text="([^"]+)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
    // an empty final whose most recent partial (inside 12 s, and after the last real
    // final) had words: Deepgram had the utterance and then dropped it
    const emptyAfterPartial = finals.filter((f) => !f.text).map((f) => {
        const lastPartial = partials.filter((p) => p.at < f.at && f.at - p.at < 12000).pop();
        const lastFinal = finals.filter((g) => g.at < f.at && g.text).pop();
        return lastPartial && (!lastFinal || lastPartial.at > lastFinal.at) ? { at: f.at, text: lastPartial.text } : null;
    }).filter(Boolean);
    // …unless a non-empty final within 5 s carries the partial's words: a healthy,
    // long-lived Deepgram socket closes a silent segment with an empty final and
    // finalizes the speech in the next one (after7, 2026-09-06: all 27 "lost"
    // utterances resolved this way; under the after6 flap they were real losses).
    const normWords = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);
    const resolvedBy = (lost) => {
        const words = normWords(lost.text);
        const probe = words.slice(0, 3).join(' ');
        const later = finals.filter((g) => g.text && g.at > lost.at && g.at - lost.at <= 5000);
        return later.find((g) => probe && normWords(g.text).join(' ').includes(probe))
            ?? later.find((g) => { const t = normWords(g.text).join(' '); return words.filter((w) => t.includes(w)).length >= Math.min(3, words.length); })
            ?? null;
    };
    const lostUtterances = emptyAfterPartial.filter((lost) => !resolvedBy(lost));
    const resolvedEmptyFinals = emptyAfterPartial.length - lostUtterances.length;
    const stt = {
        closes: sttClosedAt.length,
        gapMedianS: q10(sttGaps, .5),
        lifeP10: q10(sttLife, .1),
        lifeP90: q10(sttLife, .9),
        finals: finals.filter((f) => f.text).length,
        emptyFinals: finals.filter((f) => !f.text).length,
        finalsAfterReconnect: finals.filter((f) => f.text && sttReconnectAt.some((r) => f.at - r >= 0 && f.at - r <= 3000)),
        lostUtterances,
        resolvedEmptyFinals,
    };

    // — attribute detections to the questions that were played —
    const hasDispatch = dispatches.length > 0;
    const spoken = timeline.items.filter((i) => i.kind === 'spoken');
    const claimedLive = new Set();
    const windowOf = (it) => ({ ...it, spokeEnd: it.playedAt + Math.round(it.clipSecs * 1000) });
    const itemWindows = spoken.map(windowOf);
    // Screenshot cues are candidates for claim-once too, so a cue's own
    // answer is claimed by the cue instead of falling through to
    // answersToNobody (run 2: 3 of 3 "to nobody" answers were verbal answers
    // to the three screenshot cues, overlap 0.89-1.00 against the cue's own
    // q). Spoken/heard/surfaced*/raceLosses below stay spoken-only —
    // itemWindows itself is unchanged.
    const cueWindows = timeline.items.filter((i) => i.kind !== 'spoken').map(windowOf);
    const allWindows = [...itemWindows, ...cueWindows];

    // Claim each dispatch line for exactly one item — the item with the
    // highest anchor overlap (checked both directions), ties broken by the
    // latest playedAt <= the dispatch's own time (Ruling R33). Before this,
    // each item independently scanned every dispatch inside its own
    // [playedAt-2s, spokeEnd+60s] window, so two items whose tails overlapped
    // (a 45s gap between items, a 60s tail) could BOTH claim the same line —
    // a false "double" (whole-branch review, Important #1).
    const claimOf = new Map(); // dispatch -> item (spoken or cue)
    if (hasDispatch) {
        for (const d of dispatches) {
            // An answer dispatched on a Live PARAPHRASE (verdict=paraphrase) anchors on the
            // paraphrase's first 80 chars, which can share no content word with the played text
            // (h40b R07F went to nobody); the dispatch line also carries the question the app
            // answered, so it is scored too — but ONLY on verdict=paraphrase: a paraphrase has
            // been checked against the interviewer's own STT before dispatch, while an
            // unverifiable question= is unchecked Live text, exactly where a fabrication lives
            // (after8 M11: an invented question's question= shared enough words with a real item
            // to falsely claim it, review fix round 1 I1).
            const candidates = allWindows
                .filter((it) => d.at >= it.playedAt - 2000 && d.at <= it.spokeEnd + 60000)
                .map((it) => ({ it, score: Math.max(overlap(d.anchor, it.q), overlap(it.q, d.anchor), d.question && d.verdict === 'paraphrase' ? overlap(d.question, it.q) : 0, d.question && d.verdict === 'paraphrase' ? overlap(it.q, d.question) : 0) }))
                .filter((c) => c.score >= 0.15);
            if (!candidates.length) continue;
            candidates.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const aPast = a.it.playedAt <= d.at, bPast = b.it.playedAt <= d.at;
                if (aPast !== bPast) return aPast ? -1 : 1;
                return b.it.playedAt - a.it.playedAt;
            });
            claimOf.set(d, candidates[0].it);
        }
    }

    const items = itemWindows.map((it) => {
        const spokeEnd = it.spokeEnd;
        const win = (ev) => ev.at >= it.playedAt - 2000 && ev.at <= spokeEnd + 60000;
        const best = (list, key = 'heard') => {
            const c = list.filter(win).map((e) => ({ e, ov: overlap(e[key], it.q) })).sort((a, b) => b.ov - a.ov);
            if (!c.length) return null;
            if (c[0].ov >= 0.3) return c[0].e;
            return c.length === 1 && c[0].ov >= 0.15 ? c[0].e : null;
        };
        if (hasDispatch) {
            const mine = dispatches.filter((d) => claimOf.get(d) === it);
            const ans = mine.find((d) => d.action === 'answer') ?? null;
            const route = ans ? routes.find((r) => r.at >= ans.at && r.at <= ans.at + 4000) ?? null : null;
            const sources = new Set(mine.map((d) => d.source));
            const heardBy = sources.size === 2 ? 'both' : sources.size === 1 ? [...sources][0] : null;
            // An extend is the same question answered again for its fuller sentence
            // (main.ts extend dispatch) — one surface, not a second chip/double. A mark
            // is a detection only (attribution/coverage), never a surface (main.ts marks
            // the open interviewer turn without dispatching); a supersede replaces the
            // answer already given, not a second one (counted separately in
            // `supersedes`, below); a hold never reaches the user either.
            const surfaced = mine.filter((d) => !['drop', 'extend', 'hold', 'mark', 'supersede'].includes(d.action)).length;
            const extended = mine.filter((d) => d.action === 'extend').length;
            const supersedes = mine.filter((d) => d.action === 'supersede').length;
            // How much of the scripted question the app actually answered: the best
            // content-word coverage over the answer, extend and supersede dispatches
            // (the engine answers `question`; older lines only carried the anchor). A
            // long design question split by the STT into several finals shows up here
            // as a low number — the "answered whole" gate row (2026-09-08 roster).
            const coverage = Math.max(0, ...mine.filter((d) => d.action === 'answer' || d.action === 'extend' || d.action === 'supersede')
                .map((d) => overlap(it.q, d.question ?? d.anchor)));
            return { ...it, heardBy, answered: !!(ans && route), answeredAt: ans?.at ?? null,
                detectMs: mine.length ? Math.min(...mine.map((d) => d.at)) - spokeEnd : null,
                dispatches: surfaced, extended, supersedes, coverage, verdict: ans?.verdict ?? mine[0]?.verdict ?? null,
                routeCoding: !!(route && /^CODING/.test(route.route)),
                // verdict=fragment drops are R36-round-3 noise (a Live claim
                // too short to be anything), not a real race loss signal.
                raceLoss: mine.some((d) => d.action === 'drop' && d.verdict !== 'fragment' && !d.answered) && !ans };
        }
        // baseline attribution (no dispatch lines): the report's original rule
        const live = best(liveQ);
        if (live) claimedLive.add(live);
        const sup = live ? suppressed.find((s) => Math.abs(s.at - live.at) < 50) ?? null : null;
        const wf = best(whisperFwd);
        const route = live && !sup ? routes.find((r) => r.at >= live.at && r.at <= live.at + 4000) ?? null : null;
        const heardBy = live && wf ? 'both' : live ? 'live' : wf ? 'whisper' : null;
        return { ...it, heardBy, answered: !!route, answeredAt: live?.at ?? null,
            detectMs: live ? live.at - spokeEnd : wf ? wf.at - spokeEnd : null,
            dispatches: (live && !sup ? 1 : 0) + (wf ? 1 : 0), verdict: null,
            routeCoding: !!(route && /^CODING/.test(route.route)),
            raceLoss: !!(live && sup) };
    });

    // Live lines claimed by no item: an invented question, or a paraphrase too
    // far from anything played to attribute. Never counted as a hit either way.
    // Only meaningful for the baseline rule — a dispatch-based run has already
    // decided, per line, whether a detection was a duplicate or a replacement.
    const orphanLive = hasDispatch ? [] : liveQ.filter((q) => !claimedLive.has(q) && !suppressed.some((s) => Math.abs(s.at - q.at) < 50))
        // compared against every item played, cues included — the cue sentences were spoken aloud too
        .map((q) => ({ ...q, bestOv: Math.max(0, ...timeline.items.map((i) => overlap(q.heard, i.q))) }));
    // Formerly "invented": a verdict=replaced dispatch means the reconciler
    // CAUGHT a mismatch between Live's claim and what the interviewer STT
    // heard and substituted the real text — the reconciler working
    // correctly, not a failure reaching the user (Ruling R34, spec §4.3).
    // Informational only; no longer part of the "surfaced" gate row.
    const caught = hasDispatch ? dispatches.filter((d) => d.verdict === 'replaced').length : orphanLive.filter((q) => q.bestOv < 0.3).length;
    // An answer produced for something that isn't one of the played questions:
    // an orphan Live line (baseline) or an unclaimed dispatch (after) that
    // still reached an answer/route — the "to nobody" count the gate wants at 0.
    const answersToNobody = hasDispatch
        ? dispatches.filter((d) => d.action === 'answer' && !claimOf.has(d)).length
        : orphanLive.filter((q) => routes.some((r) => r.at >= q.at && r.at <= q.at + 4000)).length;
    // Answers dispatched on an unverifiable Live claim that nonetheless had a
    // real interviewer STT final nearby — informational: measures how often
    // information was available that a pre-R37 run did not wait for (spec
    // §4.3's "unverifiable only while STT is down"). [RestSTT] or
    // DeepgramStreaming isFinal=true, whichever the run has; finals reuses the
    // Deepgram matches already computed above.
    const interviewerSttFinalAt = [
        ...finals.map((f) => f.at),
        ...[...dbg.matchAll(/^(\S+) \[LOG\] \[RestSTT\] Transcript: /gm)].map((m) => ts(m[1])),
    ];
    const unverifiableWithSttUp = hasDispatch
        ? dispatches.filter((d) => d.action === 'answer' && d.verdict === 'unverifiable'
            && interviewerSttFinalAt.some((t) => Math.abs(t - d.at) <= 10000)).length
        : 0;
    // Live claims too short to be anything (< 4 words) — dropped on sight,
    // never held, never answered (R36 round 3). Informational, counted over
    // all dispatch lines regardless of claimed status, same as `caught`; not
    // part of the gate — a dropped fragment is the fix working, not a failure.
    const liveFragmentsDropped = hasDispatch ? dispatches.filter((d) => d.verdict === 'fragment').length : 0;
    // Answer dispatches claimed by a screenshot cue rather than a spoken item
    // — informational (folded into the CODING row's `show`, not gated on its
    // own): these used to fall into answersToNobody because cues were never
    // claim-once candidates.
    const cueAnswers = hasDispatch
        ? dispatches.filter((d) => d.action === 'answer' && claimOf.get(d) && claimOf.get(d).kind !== 'spoken').length
        : 0;
    // Screen captures taken because the interviewer pointed at the screen (main.ts
    // answerDetection) — informational on the CODING row; a flight with the cue
    // pages shown expects one per cue (after8 had none: nothing was on screen).
    const screenCaptures = count(/\[Main\] screen reference: captured /g);
    // Chips built by the degraded-detection heuristic when Groq's detect()
    // call returns null (free-tier daily token limit — run 3: 64 of 85
    // calls). Informational: the fallback firing is the fix working (round
    // 7), not a failure signal on its own.
    const heuristicChips = count(/\[QuestionDetector\] degraded: chip/g);

    const heard = items.filter((i) => i.heardBy !== null).length;
    const answered = items.filter((i) => i.answered).length;
    // Ruling R31: a dispatched "answer" is not necessarily a delivered one —
    // WhatToAnswerLLM can fail after the dispatch line was already logged
    // (primary AND fallback both failing). delivered floors at 0 so a
    // pathological run (more failures logged than answers this window
    // attributes — a boundary/windowing artifact, not a real negative) never
    // shows a negative number.
    const answerFailures = count(/\[WhatToAnswerLLM\] Stream failed/g);
    const delivered = Math.max(0, answered - answerFailures);
    const raceLosses = items.filter((i) => i.raceLoss).length;
    const codingForSpoken = spokenCodingRoutes(items, timeline.items);
    // both detectors independently surfacing a chip for the same question —
    // dispatches already folds in the dedupe (a suppressed/dropped source
    // doesn't add to the count), so >1 here is exactly "two chips on screen".
    const surfacedMulti = items.filter((i) => i.dispatches > 1).length;
    const surfacedMax = items.length ? Math.max(...items.map((i) => i.dispatches)) : 0;
    const extendsTotal = items.reduce((s, i) => s + (i.extended ?? 0), 0);
    const supersedesTotal = items.reduce((s, i) => s + (i.supersedes ?? 0), 0);
    // Long design questions (level 'long'): answered whole when the dispatched text
    // covers at least 80% of the scripted content words. The bar is 0.8 rather than
    // 1.0 because the STT drops or respells a word or two even on a clean hearing.
    const longItems = items.filter((i) => i.level === 'long' || i.long);
    const longs = longItems.length;
    const longWhole = longItems.filter((i) => (i.coverage ?? 0) >= LONG_WHOLE_COVERAGE).length;

    const complete = !!timeline.endedAt;
    const durationMin = complete ? ((ts(timeline.endedAt) - timeline.startedMs) / 60000).toFixed(1) : null;

    const detMs = items.map((i) => i.detectMs).filter((x) => x != null && x > -5000).sort((a, b) => a - b);
    const detectP50 = pct(detMs, .5);
    const detectP90 = pct(detMs, .9);

    // ttft: in-app from verbal-diag's "first token" lines when present (the
    // after-run), else from the answer-only pass's scored ttft (the before-run
    // has neither Live in-app timing nor any way to score it live).
    const ttftSource = firstTokens.length ? 'in-app' : (answers ? 'answer-only' : null);
    const ttftMs = firstTokens.length ? firstTokens.map((f) => f.ms).sort((a, b) => a - b)
        : (answers ? Object.values(answers).filter((v) => v.spoken).map((v) => v.ttft).sort((a, b) => a - b) : []);
    const ttftP90 = pct(ttftMs, .9);

    // — answer-only pass (scored quality) —
    let answersPass = null;
    if (answers) {
        const done = Object.values(answers).filter((v) => v.spoken);
        const tr = Object.values(answers).filter((v) => v.transientError);
        const ttft = done.map((v) => v.ttft).sort((a, b) => a - b), total = done.map((v) => v.total).sort((a, b) => a - b), ws = done.map((v) => v.words).sort((a, b) => a - b);
        const checks = done.length ? Object.keys(done[0].checks) : [];
        answersPass = {
            n: done.length, transient: tr.length,
            ttft: { p50: pct(ttft, .5), p90: pct(ttft, .9), max: ttft.at(-1) },
            total: { p50: pct(total, .5), p90: pct(total, .9), max: total.at(-1) },
            words: { median: pct(ws, .5), max: ws.at(-1), over: ws.filter((w) => w > 70).length },
            checks: Object.fromEntries(checks.map((c) => [c, done.filter((v) => v.checks[c]).length])),
            samples: done.slice(0, 3),
            finish: done.reduce((a, v) => ({ ...a, [v.finish]: (a[v.finish] || 0) + 1 }), {}),
        };
    }

    const cues = timeline.items.filter((i) => i.kind !== 'spoken');

    return {
        startedAt: timeline.startedAt, endedAt: timeline.endedAt, durationMin, items,
        heard, answered, delivered, answerFailures, answersToNobody, surfacedMax, surfacedMulti, extendsTotal, supersedesTotal, longs, longWhole,
        caught, unverifiableWithSttUp, liveFragmentsDropped, cueAnswers, screenCaptures, heuristicChips, raceLosses,
        sttCloses: stt.closes, lostUtterances: stt.lostUtterances.length, resolvedEmptyFinals: stt.resolvedEmptyFinals, fragmentChips: stt.finalsAfterReconnect.length,
        coachingAnswers: stats.coachingBlobs, codingForSpoken, expiryLoops: stats.expired, liveReconnects: stats.reconnects,
        detectP50, ttftP90, ttftSource, judge, pinned, budget, length, cueBlocks,
        // extra — feed the report's findings prose and tables; not part of the gate.
        // `dispatches` is the raw parsed dispatch list (narrowest export needed to make a
        // per-dispatch parse — e.g. a held detection's `question` — independently testable;
        // fix round 1, R27), not otherwise reachable once claim-once folds each line into
        // its item's aggregated fields.
        detectP90, stats, stt, routes, redirects, hardFails, liveQ, orphanLive, cues, answersPass, dispatches,
    };
}

/**
 * The counting rows were absolute: delivered >= 50, heard >= 51, acceptable >= 47, all
 * tuned to interview60's 52 items. Any other roster fails them on arithmetic — a FLAWLESS
 * 40-item scenario50 hour failed all three — which would report "gate failed" for a
 * perfect run and bury a real failure beside it.
 *
 * They are now the same PROPORTIONS of whatever roster ran, calibrated on interview60's
 * 52: a 52-item run still needs exactly 50, 51 and 47 (after7/after8 unchanged), and the
 * 76-spoken after9 timeline is held to the same share — 73 and 74, which it meets at 76/76.
 * `floor` rather than `ceil`, so the allowance ("at most one unheard") scales as an
 * allowance rather than rounding up into a demand for perfection.
 *
 * Each row scales by a ROSTER count, never by what the run produced: the quality bar
 * first divided by `judge.n`, which counts graded PAIRS — up with doubles (after7 graded
 * 54 over 52 questions, re-scoring its 47 acceptable from PASS to FAIL) and down with a
 * half-dead hour (10 acceptable of 12 graded would have passed a roster of 20).
 */
const ROSTER = 52;
const scaled = (n, of) => Math.floor((of * n) / ROSTER);
/** The spoken items the judge grades inside its base row — the long design questions and
 *  the follow-ups are counted beside it (summarizeJudge), so they are not in the bar. */
export const gradeable = (items) => items.filter((i) => i.level !== 'long' && i.level !== 'followup').length;

/**
 * Roster levels whose questions ARE coding questions, so a CODING route on them is correct.
 * interview60 has none of these on a spoken item (its coding lives on screenshot cues);
 * scenario50 asks 15 of its 50 mains as spoken coding or SQL.
 */
export const CODING_LEVELS = new Set(['coding', 'codingHeavy', 'sql']);

/**
 * Answered spoken questions routed CODING that are NOT coding questions — the misroutes.
 * The earlier count took every coding route as a misroute, which would have failed a
 * perfect scenario50 hour on its six S1+S2 coding/SQL questions. A follow-up carries
 * level 'followup' whatever it follows, so its parent's level decides (S1Q04F follows the
 * coding question S1Q04); the parent may be a screenshot cue, hence the lookup over `all`
 * — the whole timeline — rather than the spoken items alone. An unknown parent leaves the
 * follow-up's own level standing.
 */
export const spokenCodingRoutes = (items, all = items) => {
    const levelOf = new Map(all.map((i) => [i.id, i.level]));
    const effective = (i) => (i.level === 'followup' && levelOf.has(i.chain) ? levelOf.get(i.chain) : i.level);
    return items.filter((i) => i.answered && i.routeCoding && !CODING_LEVELS.has(effective(i))).length;
};

export const GATE = [
    { key: 'answered', label: 'Answered hands-free', before: '26/52', pass: (m) => m.delivered >= scaled(50, m.items.length) && m.answersToNobody === 0, show: (m) => `${m.delivered}/${m.answered} dispatched, ${m.answersToNobody} to nobody` },
    { key: 'heard', label: 'Heard by either detector', before: '51/52', pass: (m) => m.heard >= scaled(51, m.items.length), show: (m) => `${m.heard}/${m.items.length}` },
    { key: 'surfaced', label: 'Surfaced detections per question', before: '12 doubles, 1 invented', pass: (m) => m.surfacedMulti === 0 && m.answersToNobody === 0, show: (m) => `${m.surfacedMulti} doubles, ${m.extendsTotal} extended, ${m.supersedesTotal} superseded, ${m.caught} caught, ${m.answersToNobody} unclaimed` },
    { key: 'stt', label: 'STT socket closes / lost utterances / fragment chips', before: '299 / 2 / 5', pass: (m) => m.sttCloses <= 5 && m.lostUtterances === 0 && m.fragmentChips === 0, show: (m) => `${m.sttCloses} / ${m.lostUtterances} (${m.resolvedEmptyFinals} resolved within 5 s) / ${m.fragmentChips}` },
    { key: 'coaching', label: 'Technical questions answered via the coaching path', before: '25', pass: (m) => m.coachingAnswers === 0, show: (m) => String(m.coachingAnswers) },
    { key: 'coding', label: 'Spoken questions routed CODING', before: '4 routes (2 of them screenshot cues)', pass: (m) => m.codingForSpoken === 0, show: (m) => `${m.codingForSpoken}, ${m.cueAnswers} cue answers, ${m.screenCaptures} captures` },
    { key: 'expiry', label: 'Live expiry loops', before: '0', pass: (m) => m.expiryLoops === 0, show: (m) => String(m.expiryLoops) },
    { key: 'quality', label: 'Interview-acceptable answers (Opus 5 judge)', before: 'not graded', pass: (m) => !!m.judge && m.judge.wrong === 0 && m.judge.acceptable >= scaled(47, gradeable(m.items)), show: (m) => m.judge ? `${m.judge.acceptable} acceptable, ${m.judge.weak} weak, ${m.judge.wrong} wrong of ${m.judge.n}${m.judge.errors ? `, ${m.judge.errors} errors` : ''}${m.judge.long?.n ? `; long ${m.judge.long.acceptable} of ${m.judge.long.n}` : ''}${m.judge.followup?.n ? `, follow-ups ${m.judge.followup.acceptable} of ${m.judge.followup.n}` : ''}` : 'not run' },
    // 2026-09-08 roster: a long design question counts as answered whole when the
    // dispatched text (answer or extend) covers ≥ 80% of its scripted content words.
    { key: 'long', label: 'Long questions answered whole', before: 'not in the roster', pass: (m) => m.longWhole === m.longs, show: (m) => m.longs ? `${m.longWhole} of ${m.longs} (dispatched text covers ≥ 80% of the question)` : 'none in the roster' },
    // TTFT p90 bar is the app's own stall budget under the shipped thinking level (LOW since
    // the 2026-09-17 bench): 10 s, above which the fallback replaces the answer anyway. It
    // was 5 s while the answer ran at MINIMAL (s50e 1.6 s, s50f 3.4 s); LOW measured p90
    // 7.8 s on s50g and 7.1 s on the bench, so 5 s would fail every LOW hour by design.
    { key: 'latency', label: 'Answer TTFT p90 · detect p50', before: '3.7 s (answer-only pass) · 4.1 s', pass: (m) => (m.ttftP90 ?? Infinity) <= 10000 && (m.detectP50 ?? Infinity) <= 5000, show: (m) => `${m.ttftP90 == null ? '—' : (m.ttftP90 / 1000).toFixed(1) + ' s'}${m.ttftSource === 'answer-only' ? ' (answer-only pass)' : ''} · ${m.detectP50 == null ? '—' : (m.detectP50 / 1000).toFixed(1) + ' s'}` },
    { key: 'pinned', label: 'Answer prompt pinned to the dispatched question', before: 'not logged', pass: (m) => m.pinned.answers > 0 && m.pinned.legacy === 0 && m.pinned.missing === 0 && m.pinned.mismatched === 0, show: (m) => m.pinned.answers === 0 ? 'no answers' : m.pinned.legacy === m.pinned.answers ? 'not logged' : `${m.pinned.answers - m.pinned.legacy - m.pinned.missing - m.pinned.mismatched}/${m.pinned.answers} pinned, ${m.pinned.missing} missing, ${m.pinned.mismatched} mismatched${m.pinned.legacy ? `, ${m.pinned.legacy} legacy` : ''}` },
    // Flight s50c (2026-09-12): the app no longer cuts under 200 words — the
    // question-scaled cut of spec 2026-09-09 §3.5 fired on 13 of 42 answers and
    // removed the last asked part of 4 of the 8 in-app failures. The stream is
    // clamped at 200 only (verbalStreamFilter.SPOKEN_WORD_GUARD), so any cut is a
    // runaway the row must surface, and `max` must stay at or under the guard.
    // `n` must cover the delivered answers (cue answers and coding routes emit
    // no budget line, hence 0.9). p50 is unbounded: the model's own stop
    // governs length now.
    { key: 'budget', label: 'Spoken answers: streamed whole under the 200-word guard', before: '13 of 42 cut by the question-scaled budget (s50c)', pass: (m) => m.budget.n > 0 && m.budget.n >= Math.floor(m.delivered * 0.9) && m.budget.cut === 0 && m.budget.max <= 200, show: (m) => m.budget.n === 0 ? 'not logged' : `${m.budget.n} answers, ${m.budget.cut} cut by the guard, words p50 ${m.budget.p50} max ${m.budget.max}` },
    // Fails on any answer past the 150-word cliff — a candidate cannot say one aloud — and
    // shows the over-85 share the grader cannot. Expected to FAIL on the current build (s50j:
    // five answers at or past 158); the row exists so the length lever has a number.
    { key: 'length', label: 'Spoken answers under the 150-word cliff', before: 'not measured (s50e: every in-app miss was length alone)', pass: (m) => m.length.n > 0 && m.length.over150 === 0, show: (m) => m.length.n === 0 ? 'not logged' : `words p90 ${m.length.p90}, over 85: ${m.length.over85}/${m.length.n}, over 150: ${m.length.over150}/${m.length.n}` },
    // Cue mode (spec 2026-09-20): every verbal answer opens with a cue block the candidate
    // glances at. `n` covers the delivered answers like the budget row (coding routes emit no
    // cues line, hence 0.9); every block present and well-formed. Older runs read "not logged".
    { key: 'cueBlocks', label: 'Cue block above every spoken answer', before: 'not logged (before cue mode)', pass: (m) => m.cueBlocks.n > 0 && m.cueBlocks.n >= Math.floor(m.delivered * 0.9) && m.cueBlocks.present === m.cueBlocks.n && m.cueBlocks.wellformed === m.cueBlocks.n, show: (m) => m.cueBlocks.n === 0 ? 'not logged' : `${m.cueBlocks.present}/${m.cueBlocks.n} present, ${m.cueBlocks.wellformed} well-formed, ${m.cueBlocks.trimmed} trimmed` },
];

/** Counts over spoken items only — mirrors summarizeVerdicts in interview60.judge.mjs (kept dependency-free here). */
export function summarizeJudge(judged) {
    const all = Object.values(judged.items ?? {}).filter((v) => v.kind === 'spoken');
    // The long design questions and the follow-ups (2026-09-08 roster) are counted
    // beside the base roster, not inside it, so the 52-question row stays comparable
    // with after7/after8 (whose judge files carry no level field at all).
    const extra = (level) => {
        const of = all.filter((v) => v.level === level);
        const count = (verdict) => of.filter((v) => v.verdict === verdict).length;
        return { n: of.length, acceptable: count('acceptable'), weak: count('weak'), wrong: count('wrong') };
    };
    const spoken = all.filter((v) => v.level !== 'long' && v.level !== 'followup');
    const count = (verdict) => spoken.filter((v) => v.verdict === verdict).length;
    return { model: judged.model ?? null, n: spoken.length, acceptable: count('acceptable'), weak: count('weak'), wrong: count('wrong'), errors: count('error'),
        long: extra('long'), followup: extra('followup') };
}

export function evaluateGate(m) {
    const rows = GATE.map((g) => ({ label: g.label, before: g.before, value: g.show(m), pass: g.pass(m) }));
    return { rows, pass: rows.every((r) => r.pass) };
}
