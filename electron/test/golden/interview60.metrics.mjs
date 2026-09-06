/**
 * One analysis for one run folder. Used by `run.mjs gate` and by the report,
 * so the verdict and the page cannot disagree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { overlap, logSince } from './interview60.lib.mjs';

const CONTAMINATED = ['[2026-09-02T16:21:50'];
const ts = (s) => Date.parse(s);
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
 * answerFailures, answersToNobody, surfacedMax, surfacedMulti, extendsTotal, caught,
 * unverifiableWithSttUp, liveFragmentsDropped, cueAnswers, heuristicChips, raceLosses, sttCloses,
 * lostUtterances, fragmentChips, coachingAnswers, codingForSpoken,
 * expiryLoops, liveReconnects, detectP50, ttftP90, ttftSource) plus a few
 * extra fields (stats, stt, routes, redirects, hardFails, liveQ, orphanLive,
 * cues, answersPass, detectP90) that only the report's findings/tables prose
 * needs — kept here so that prose and the gate never re-derive the same
 * numbers two different ways.
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
    const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|extend) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: extends="(?:[^"\\]|\\.)*")?(?: question="((?:[^"\\]|\\.)*)")?/gm)]
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
    const budget = {
        n: budgetLines.length,
        over: budgetLines.filter((b) => b.words > 80).length,
        allowance: budgetLines.filter((b) => b.allowance).length,
        cut: budgetLines.filter((b) => b.cut).length,
        cutShort: budgetLines.filter((b) => b.cut && b.words < 80).length,
        p50: pct(budgetWords, .5),
        max: budgetWords.length ? budgetWords[budgetWords.length - 1] : null,
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
    const lostUtterances = finals.filter((f) => !f.text).map((f) => {
        const lastPartial = partials.filter((p) => p.at < f.at && f.at - p.at < 12000).pop();
        const lastFinal = finals.filter((g) => g.at < f.at && g.text).pop();
        return lastPartial && (!lastFinal || lastPartial.at > lastFinal.at) ? { at: f.at, text: lastPartial.text } : null;
    }).filter(Boolean);
    const stt = {
        closes: sttClosedAt.length,
        gapMedianS: q10(sttGaps, .5),
        lifeP10: q10(sttLife, .1),
        lifeP90: q10(sttLife, .9),
        finals: finals.filter((f) => f.text).length,
        emptyFinals: finals.filter((f) => !f.text).length,
        finalsAfterReconnect: finals.filter((f) => f.text && sttReconnectAt.some((r) => f.at - r >= 0 && f.at - r <= 3000)),
        lostUtterances,
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
            const candidates = allWindows
                .filter((it) => d.at >= it.playedAt - 2000 && d.at <= it.spokeEnd + 60000)
                .map((it) => ({ it, score: Math.max(overlap(d.anchor, it.q), overlap(it.q, d.anchor)) }))
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
            // (main.ts extend dispatch) — one surface, not a second chip/double.
            const surfaced = mine.filter((d) => d.action !== 'drop' && d.action !== 'extend').length;
            const extended = mine.filter((d) => d.action === 'extend').length;
            return { ...it, heardBy, answered: !!(ans && route), answeredAt: ans?.at ?? null,
                detectMs: mine.length ? Math.min(...mine.map((d) => d.at)) - spokeEnd : null,
                dispatches: surfaced, extended, verdict: ans?.verdict ?? mine[0]?.verdict ?? null,
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
    const codingForSpoken = items.filter((i) => i.answered && i.routeCoding).length;
    // both detectors independently surfacing a chip for the same question —
    // dispatches already folds in the dedupe (a suppressed/dropped source
    // doesn't add to the count), so >1 here is exactly "two chips on screen".
    const surfacedMulti = items.filter((i) => i.dispatches > 1).length;
    const surfacedMax = items.length ? Math.max(...items.map((i) => i.dispatches)) : 0;
    const extendsTotal = items.reduce((s, i) => s + (i.extended ?? 0), 0);

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
        heard, answered, delivered, answerFailures, answersToNobody, surfacedMax, surfacedMulti, extendsTotal,
        caught, unverifiableWithSttUp, liveFragmentsDropped, cueAnswers, heuristicChips, raceLosses,
        sttCloses: stt.closes, lostUtterances: stt.lostUtterances.length, fragmentChips: stt.finalsAfterReconnect.length,
        coachingAnswers: stats.coachingBlobs, codingForSpoken, expiryLoops: stats.expired, liveReconnects: stats.reconnects,
        detectP50, ttftP90, ttftSource, judge, pinned, budget,
        // extra — feed the report's findings prose and tables; not part of the gate
        detectP90, stats, stt, routes, redirects, hardFails, liveQ, orphanLive, cues, answersPass,
    };
}

export const GATE = [
    { key: 'answered', label: 'Answered hands-free', before: '26/52', pass: (m) => m.delivered >= 50 && m.answersToNobody === 0, show: (m) => `${m.delivered}/${m.answered} dispatched, ${m.answersToNobody} to nobody` },
    { key: 'heard', label: 'Heard by either detector', before: '51/52', pass: (m) => m.heard >= 51, show: (m) => `${m.heard}/${m.items.length}` },
    { key: 'surfaced', label: 'Surfaced detections per question', before: '12 doubles, 1 invented', pass: (m) => m.surfacedMulti === 0 && m.answersToNobody === 0, show: (m) => `${m.surfacedMulti} doubles, ${m.extendsTotal} extended, ${m.caught} caught, ${m.answersToNobody} unclaimed` },
    { key: 'stt', label: 'STT socket closes / lost utterances / fragment chips', before: '299 / 2 / 5', pass: (m) => m.sttCloses <= 5 && m.lostUtterances === 0 && m.fragmentChips === 0, show: (m) => `${m.sttCloses} / ${m.lostUtterances} / ${m.fragmentChips}` },
    { key: 'coaching', label: 'Technical questions answered via the coaching path', before: '25', pass: (m) => m.coachingAnswers === 0, show: (m) => String(m.coachingAnswers) },
    { key: 'coding', label: 'Spoken questions routed CODING', before: '4 routes (2 of them screenshot cues)', pass: (m) => m.codingForSpoken === 0, show: (m) => `${m.codingForSpoken}, ${m.cueAnswers} cue answers` },
    { key: 'expiry', label: 'Live expiry loops', before: '0', pass: (m) => m.expiryLoops === 0, show: (m) => String(m.expiryLoops) },
    { key: 'quality', label: 'Interview-acceptable answers (Opus 5 judge)', before: 'not graded', pass: (m) => !!m.judge && m.judge.wrong === 0 && m.judge.acceptable >= 47, show: (m) => m.judge ? `${m.judge.acceptable} acceptable, ${m.judge.weak} weak, ${m.judge.wrong} wrong of ${m.judge.n}${m.judge.errors ? `, ${m.judge.errors} errors` : ''}` : 'not run' },
    { key: 'latency', label: 'Answer TTFT p90 · detect p50', before: '3.7 s (answer-only pass) · 4.1 s', pass: (m) => (m.ttftP90 ?? Infinity) <= 5000 && (m.detectP50 ?? Infinity) <= 5000, show: (m) => `${m.ttftP90 == null ? '—' : (m.ttftP90 / 1000).toFixed(1) + ' s'}${m.ttftSource === 'answer-only' ? ' (answer-only pass)' : ''} · ${m.detectP50 == null ? '—' : (m.detectP50 / 1000).toFixed(1) + ' s'}` },
    { key: 'pinned', label: 'Answer prompt pinned to the dispatched question', before: 'not logged', pass: (m) => m.pinned.answers > 0 && m.pinned.legacy === 0 && m.pinned.missing === 0 && m.pinned.mismatched === 0, show: (m) => m.pinned.answers === 0 ? 'no answers' : m.pinned.legacy === m.pinned.answers ? 'not logged' : `${m.pinned.answers - m.pinned.legacy - m.pinned.missing - m.pinned.mismatched}/${m.pinned.answers} pinned, ${m.pinned.missing} missing, ${m.pinned.mismatched} mismatched${m.pinned.legacy ? `, ${m.pinned.legacy} legacy` : ''}` },
    // Spec 2026-09-05 §3: the floor equals the limit, so a cut answer always has
    // at least 80 words — `cutShort` is 0 by construction and non-zero only if
    // the old 40-word floor is somehow back. `n` must cover the delivered answers
    // (cue answers and coding routes emit no budget line, hence 0.9). p50 ≤ 100:
    // the pre-budget raw median was 97, so the cut must still exist. max ≤ 130:
    // a 50-word sentence in progress at 80 — pathological, and the 160 ceiling
    // only bounds a terminator-free answer.
    { key: 'budget', label: 'Spoken answers: the sentence in progress at 80 words finishes (ceiling 160)', before: '36 of 55 cut under 80 words (after6)', pass: (m) => m.budget.n > 0 && m.budget.n >= Math.floor(m.delivered * 0.9) && m.budget.cutShort === 0 && m.budget.p50 <= 100 && m.budget.max <= 130, show: (m) => m.budget.n === 0 ? 'not logged' : `${m.budget.n} answers, ${m.budget.over} over 80, ${m.budget.cutShort} cut under 80, words p50 ${m.budget.p50} max ${m.budget.max}` },
];

/** Counts over spoken items only — mirrors summarizeVerdicts in interview60.judge.mjs (kept dependency-free here). */
export function summarizeJudge(judged) {
    const spoken = Object.values(judged.items ?? {}).filter((v) => v.kind === 'spoken');
    const count = (verdict) => spoken.filter((v) => v.verdict === verdict).length;
    return { model: judged.model ?? null, n: spoken.length, acceptable: count('acceptable'), weak: count('weak'), wrong: count('wrong'), errors: count('error') };
}

export function evaluateGate(m) {
    const rows = GATE.map((g) => ({ label: g.label, before: g.before, value: g.show(m), pass: g.pass(m) }));
    return { rows, pass: rows.every((r) => r.pass) };
}
