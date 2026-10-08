// r2 THROWAWAY: the revision-2 flag-on machine (2026-10-01-turn-memory-design.r2.md §3), built on the reviewer's
// proto.ts (itself a verbatim copy of interviewerTurn.ts plus the r1 branches). Lines marked R2 differ from proto.ts.
// Not a proposal for the implementation's shape; used only to check the revised design's claims. Rewritten 2026-10-01
// (the previous attempt's file is replaced; nothing in it is relied on).
import { overlap } from '../../dispatcher/src/questionReconcile.ts';

export const C = { gateMs: 1200, settleMs: 400, unfinishedHoldMs: 2500, continuationMs: 8000, maxHoldMs: 8000, wordlessGraceMs: 3000 };
const TRAILING_CONNECTIVE = /\b(and|or|so|but|because|with|for|to|of|the|a|an|then|also|plus|versus|vs|including|like|such as|as)\s*$/i;
const TERMINATOR = /[.?!]["'”’)\]]*$/;
const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
export function readsFinished(text: string): boolean {
    const t = text.trim(); const w = words(t);
    if (w.length < 4) return false; if (!TERMINATOR.test(t)) return false;
    const body = t.replace(TERMINATOR, '');
    if (/,$/.test(body) || TRAILING_CONNECTIVE.test(body)) return false;
    const sentences = t.split(/(?<=[.?!])\s+/).filter(Boolean);
    if (sentences.length === 1 && /\.$/.test(t) && w.length <= 6) return false;
    return true;
}
// R2 §3.2: the quote test's constants.
export const QUOTE_MIN = 0.5;                 // = questionReconcile MATCH
export const QUOTE_MIN_CONTENT_WORDS = 4;     // = ChipDeduper TAIL_MIN_CONTENT_WORDS: evidence under it is "unscorable" forward
export const QUOTE_MIN_HITS = 2;              // residual words that must be in the finals before a remembered match is overridden
export const REVERSE_MIN_CONTENT_WORDS = 2;   // the declined text needs this many content words for the reverse (unscorable) rule
export const REMEMBERED_TURNS = 3;
export const cw = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));

export interface Judgement { scorable: boolean; remIdx: number; remScore: number; residual: number; hits: number; quotesOpen: boolean; echo: boolean; openScore: number; rule: 'forward' | 'reverse'; by: 'residual' | 'outright' | 'reverse' | null }
/**
 * R2 §3.2: ONE judgement for a piece of fresh evidence (a chip's text or a Live claim's raw text) against the open
 * turn's finals and the remembered turns.
 *  - rem: the remembered turn the evidence quotes best (newest wins ties); remMatch when scorable and ≥ QUOTE_MIN.
 *  - residual: the evidence's content words NOT in that remembered text (all of them without a remembered match).
 *  - quotesOpen ("fits the open turn"), scorable evidence (≥ 4 content words), either way:
 *      (a) residual: at least QUOTE_MIN_HITS residual words are in the finals and they are ≥ QUOTE_MIN of the residual
 *          (with no remembered match this is r1's forward test, overlap ≥ 0.5);
 *      (b) outright: the whole evidence quotes the finals ≥ QUOTE_MIN and STRICTLY better than the remembered text
 *          (br1 S2Q04F: own 0.58 against its parent's 0.50; a tie goes to the memory — I2's restating statement).
 *  - quotesOpen, unscorable evidence (< 4 content words): the REVERSE direction — the finals have ≥ 2 content words
 *    and ≥ QUOTE_MIN of THEM are in the evidence (the evidence is the declined text itself, or an extension of it:
 *    the re-smoke's "How could repeatedly").
 *  - echo: quotes a remembered turn and does not fit the open turn.
 */
export function judgeEvidence(text: string, finalsText: string, remembered: { text: string }[]): Judgement {
    const W = cw(text); const scorable = W.size >= QUOTE_MIN_CONTENT_WORDS;
    let remIdx = -1, remScore = 0;
    for (let i = remembered.length - 1; i >= 0; i--) { const s = overlap(text, remembered[i].text); if (s > remScore) { remScore = s; remIdx = i; } }
    const remMatch = scorable && remScore >= QUOTE_MIN;
    const remWords = remMatch ? cw(remembered[remIdx].text) : new Set<string>();
    const residual = [...W].filter((w) => !remWords.has(w));
    const F = cw(finalsText);
    const hits = residual.filter((w) => F.has(w)).length;
    let quotesOpen: boolean, openScore: number, by: Judgement['by'] = null;
    if (scorable) {
        openScore = overlap(text, finalsText);
        const byResidual = residual.length > 0 && hits >= QUOTE_MIN_HITS && hits / residual.length >= QUOTE_MIN;
        const outright = openScore >= QUOTE_MIN && openScore > remScore;
        quotesOpen = byResidual || outright; by = byResidual ? 'residual' : outright ? 'outright' : null;
    } else { openScore = F.size ? overlap(finalsText, text) : 0; quotesOpen = F.size >= REVERSE_MIN_CONTENT_WORDS && openScore >= QUOTE_MIN; by = quotesOpen ? 'reverse' : null; }
    return { scorable, remIdx, remScore, residual: residual.length, hits, quotesOpen, echo: remMatch && !quotesOpen, openScore, rule: scorable ? 'forward' : 'reverse', by };
}

export function createTurn(memory = { revive: false, echo: false }, judge = judgeEvidence) {
    const c = C;
    let turn: any = null; let nextId = 1; const remembered: any[] = [];
    const open = (at: number) => { if (!turn) turn = { id: nextId++, startedAt: at, finals: [], live: [], speaking: false, vadSeen: false, lastSpeechAt: -Infinity, lastFinalAt: -Infinity, detected: false, detectedAt: null, classifyAsked: false, notAQuestion: false, candidateAt: null, dispatched: null, pendingAfterDispatch: false, declined: null }; return turn; };
    const remember = (t: any) => { if (memory.echo && t && t.dispatched) { remembered.push({ text: t.dispatched.text, dispatchedAt: t.dispatched.at, id: t.id }); while (remembered.length > REMEMBERED_TURNS) remembered.shift(); } };
    const effectiveStopAt = (t: any, now: number) => now - t.lastSpeechAt < c.wordlessGraceMs ? t.lastSpeechAt : -Infinity;
    const reopenIfStale = (at: number) => {
        if (turn && turn.dispatched && at - Math.max(turn.dispatched.at, turn.lastFinalAt, effectiveStopAt(turn, at)) >= c.continuationMs) { remember(turn); turn = null; return; }
        if (memory.revive && turn && turn.declined && at - Math.max(turn.declined.at, turn.lastFinalAt, effectiveStopAt(turn, at)) >= c.continuationMs) { turn = null; } // R2: R15 for a declined turn, same clock
    };
    const finalsText = (t: any) => t.finals.map((f: any) => f.text).join(' ');
    const textOf = (t: any) => t.finals.length ? { text: finalsText(t), fromLive: false } : t.live.length ? { text: t.live.join(' '), fromLive: true } : { text: '', fromLive: false };
    const silenceMs = (t: any, now: number) => now - t.lastSpeechAt;
    const settled = (t: any, now: number) => t.finals.length === 0 || now - t.lastFinalAt >= c.settleMs;
    const quiet = (t: any, now: number) => !t.speaking && silenceMs(t, now) >= c.gateMs && settled(t, now);
    const failSafeAt = (t: any) => t.detectedAt === null ? null : Math.max(t.detectedAt, t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs;
    const holdReason = (t: any, now: number) => t.speaking ? 'speaking' : silenceMs(t, now) < c.gateMs ? 'gate' : !settled(t, now) ? 'settle' : 'unfinished';
    const closedAs = (t: any) => t.declined.verdict === 'unknown' ? 'no-verdict' : 'not-a-question';
    const pushLive = (t: any, text: string, at: number) => { t.live.push(text.trim()); if (!t.vadSeen) t.lastSpeechAt = at; };
    return {
        remembered,
        speech(active: boolean, at: number) { if (!turn && !active) return; const t = open(at); t.vadSeen = true; t.speaking = active; if (!active) t.lastSpeechAt = at; },
        final(text: string, at: number) {
            reopenIfStale(at); const t = open(at); t.finals.push({ text: text.trim(), at }); t.lastFinalAt = at;
            if (!t.vadSeen) t.lastSpeechAt = at; if (t.dispatched) t.pendingAfterDispatch = true;
            // R2 (I3): flag on, a final landing on an undetected turn after its classify was asked re-arms the classify,
            // declined or not; the in-flight verdict will be ignored as stale-finals and the re-armed one judges the grown text.
            if (memory.revive && !t.detected && !t.dispatched && t.classifyAsked) t.classifyAsked = false;
        },
        /** R2 §4.1: the one entry point for fresh evidence from either ear (today: liveClaim + detected without a verdict). */
        evidence(source: 'live' | 'whisper', text: string, at: number): any {
            if (!memory.revive && !memory.echo) { reopenIfStale(at); const t = open(at); if (source === 'live') pushLive(t, text, at); t.detected = true; t.detectedAt = at; return { kind: 'marked' }; }
            reopenIfStale(at); // R2 (Minor 8): a stale dispatched turn is remembered and closed BEFORE the echo test
            const t0 = turn;
            const j = judge(text, t0 && t0.finals.length ? finalsText(t0) : '', remembered);
            if (memory.echo && j.echo) { const r = remembered[j.remIdx]; return { kind: 'absorbed', source, of: r.text, ofId: r.id, score: j.remScore, openScore: j.openScore, residual: j.residual, hits: j.hits, ageMs: at - r.dispatchedAt }; }
            if (memory.revive && t0 && t0.declined) {
                if (j.quotesOpen) { t0.declined = null; t0.detected = true; t0.detectedAt = at; if (source === 'live') pushLive(t0, text, at); return { kind: 'revived', by: source, rule: j.rule, how: j.by, score: j.openScore, remScore: j.remScore, residual: j.residual, hits: j.hits, finals: t0.finals.length }; }
                // R2 (C3): a non-quoting positive never discards finals. The finals that rejoined AFTER the decline (unjudged
                // text) form the fresh turn it marks; the judged text closes as today's verdict would have closed it. A whisper
                // positive with no unjudged tail has nothing to mark — it is ignored and the declined turn lives on.
                const tail = t0.finals.filter((f: any) => f.at > t0.declined.at);
                if (source === 'whisper' && tail.length === 0) return { kind: 'ignored', why: j.scorable ? 'no-quote' : 'unscorable', score: j.openScore };
                const closed = closedAs(t0);
                const vad = { speaking: t0.speaking, vadSeen: t0.vadSeen, lastSpeechAt: t0.lastSpeechAt };
                turn = null; const t = open(at); t.finals = tail; t.lastFinalAt = tail.length ? tail[tail.length - 1].at : -Infinity; Object.assign(t, vad);
                if (!t.vadSeen) t.lastSpeechAt = tail.length ? t.lastFinalAt : at;
                if (source === 'live') pushLive(t, text, at); t.detected = true; t.detectedAt = at;
                return { kind: 'replaced-declined', by: source, closed, score: j.openScore, moved: tail.length, unscorable: !j.scorable };
            }
            const t = open(at); if (source === 'live') pushLive(t, text, at); t.detected = true; t.detectedAt = at; return { kind: 'marked' };
        },
        /** R2 §4.1: a classify verdict, scoped to the turn and finals count it judged (today: detected(…, verdict, forTurn)). */
        verdict(v: 'question' | 'not-a-question' | 'unknown', forTurn: number, finals: number, at: number): any {
            if (!turn || turn.id !== forTurn) return { kind: 'ignored', why: 'stale-turn' };
            const t = turn;
            if (!memory.revive) { t.detected = true; t.detectedAt = at; if (v !== 'question') t.notAQuestion = true; return { kind: 'marked' }; } // flag off: unknown closes as not-a-question
            if (t.dispatched) return { kind: 'ignored', why: 'dispatched' };
            if (finals !== t.finals.length) return { kind: 'ignored', why: 'stale-finals' };
            if (v !== 'question') {
                if (t.detected) return { kind: 'ignored', why: 'marked' }; // R2 (I9)
                const again = !!t.declined; t.declined = { at, verdict: v }; return { kind: 'declined', verdict: v, again };
            }
            if (t.declined) { t.declined = null; t.detected = true; t.detectedAt = at; return { kind: 'revived', by: 'verdict', finals: t.finals.length }; }
            t.detected = true; t.detectedAt = at; return { kind: 'marked' };
        },
        candidateSpoke(at: number) { if (!turn) return; turn.candidateAt = at; },
        tick(now: number): any {
            if (!turn) return { kind: 'idle' };
            const t = turn;
            if (t.candidateAt !== null) { remember(t); turn = null; return { kind: 'close', reason: 'candidate' }; }
            if (t.notAQuestion) { turn = null; return { kind: 'close', reason: 'not-a-question' }; }
            if (t.dispatched) {
                if (t.pendingAfterDispatch) {
                    if (quiet(t, now) || now >= Math.max(t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs) {
                        const { text } = textOf(t); const replaces = t.dispatched.text; t.dispatched = { at: now, text }; t.pendingAfterDispatch = false;
                        return { kind: 'supersede', text, live: [...t.live], replaces, finals: t.finals.length };
                    }
                    return { kind: 'hold', reason: holdReason(t, now) };
                }
                if (!t.speaking && now - Math.max(effectiveStopAt(t, now), t.dispatched.at) >= c.continuationMs) { remember(t); turn = null; return { kind: 'close', reason: 'continuation-expired' }; }
                return { kind: 'idle' };
            }
            if (memory.revive && t.declined) {
                if (!t.speaking && now - Math.max(t.declined.at, t.lastFinalAt, effectiveStopAt(t, now)) >= c.continuationMs) { const reason = closedAs(t); turn = null; return { kind: 'close', reason }; }
                if (quiet(t, now) && !t.classifyAsked) { t.classifyAsked = true; return { kind: 'classify', text: finalsText(t), finals: t.finals.length, turn: t.id, rearmed: true }; }
                return { kind: 'hold', reason: 'declined' };
            }
            const hasText = t.finals.length > 0 || t.live.length > 0;
            if (!hasText) {
                const fs = failSafeAt(t);
                if (fs !== null && now >= fs) { turn = null; return { kind: 'close', reason: 'nothing-heard' }; }
                return { kind: 'hold', reason: t.speaking ? 'speaking' : 'undetected' };
            }
            if (!t.detected) {
                if (quiet(t, now) && !t.classifyAsked) { t.classifyAsked = true; const { text } = textOf(t); return { kind: 'classify', text, finals: t.finals.length, turn: t.id }; }
                return { kind: 'hold', reason: 'undetected' };
            }
            const { text, fromLive } = textOf(t); const isFinished = readsFinished(text);
            const atGate = t.finals.length > 0 && quiet(t, now) && isFinished;
            const unfinishedHoldElapsed = !t.speaking && silenceMs(t, now) >= c.gateMs + c.unfinishedHoldMs && settled(t, now);
            const fs = failSafeAt(t); const failSafe = fs !== null && now >= fs;
            if (atGate || unfinishedHoldElapsed || failSafe) { t.dispatched = { at: now, text }; return { kind: 'dispatch', text, live: [...t.live], finished: isFinished, finals: t.finals.length, fromLive, path: atGate ? 'gate' : unfinishedHoldElapsed ? 'unfinished' : 'failsafe' }; }
            return { kind: 'hold', reason: holdReason(t, now) };
        },
        nextTimerAt(now: number): number | null {
            if (!turn) return null; const t = turn;
            if (t.candidateAt !== null || t.notAQuestion) return now;
            const cand: number[] = [];
            if (!t.speaking && (!t.dispatched || t.pendingAfterDispatch)) { cand.push(t.lastSpeechAt + c.gateMs); cand.push(t.lastSpeechAt + c.gateMs + c.unfinishedHoldMs); }
            if (t.finals.length > 0) cand.push(t.lastFinalAt + c.settleMs);
            if (!t.dispatched) { const fs = failSafeAt(t); if (fs !== null) cand.push(fs); }
            if (t.dispatched && t.pendingAfterDispatch) cand.push(Math.max(t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs);
            if (t.dispatched && !t.pendingAfterDispatch) { cand.push(t.dispatched.at + c.continuationMs); if (t.lastSpeechAt > t.dispatched.at) cand.push(t.lastSpeechAt + c.wordlessGraceMs); }
            if (memory.revive && t.declined) { cand.push(Math.max(t.declined.at, t.lastFinalAt) + c.continuationMs); if (t.lastSpeechAt > t.declined.at) cand.push(t.lastSpeechAt + c.wordlessGraceMs); }
            const f = cand.filter((x) => x > now); return f.length ? Math.min(...f) : null;
        },
        reset() { turn = null; remembered.length = 0; },
        snapshot() { return turn ? { open: true, id: turn.id, finals: turn.finals.length, live: turn.live.length, detected: turn.detected, dispatched: !!turn.dispatched, declined: turn.declined?.verdict ?? null, classifyAsked: turn.classifyAsked, remembered: remembered.length } : { open: false, id: null, remembered: remembered.length }; },
    };
}
