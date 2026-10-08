// REVIEW THROWAWAY: the spec's flag-on machine as I read it (2026-10-01-turn-memory-design.md §3.3-3.4),
// built on a copy of the real interviewerTurn.ts. Not a proposal; used only to check the spec's own claims.
// Where the spec is silent, the choice made here is marked UNSPEC and counted, so the review can say what it assumed.
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
export const QUOTE_MIN = 0.5, QUOTE_MIN_CONTENT_WORDS = 4, REMEMBERED_TURNS = 3;
const cw = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
export function quoteScore(e: string, s: string): number { return cw(e).size < QUOTE_MIN_CONTENT_WORDS ? 0 : overlap(e, s); }

export const unspec: Record<string, number> = {};
const U = (k: string) => { unspec[k] = (unspec[k] ?? 0) + 1; };

export function createTurn(memory = { revive: false, echo: false }, quote = quoteScore, opts: { rearmUndetected?: boolean; echoAfterR15?: boolean } = {}) {
    const c = C;
    let turn: any = null; let nextId = 1; const remembered: any[] = [];
    const open = (at: number) => { if (!turn) turn = { id: nextId++, startedAt: at, finals: [], live: [], speaking: false, vadSeen: false, lastSpeechAt: -Infinity, lastFinalAt: -Infinity, detected: false, detectedAt: null, classifyAsked: false, notAQuestion: false, candidateAt: null, dispatched: null, pendingAfterDispatch: false, declined: null, classifyInFlight: false }; return turn; };
    const remember = (t: any) => { if (memory.echo && t && t.dispatched) { remembered.push({ text: t.dispatched.text, live: [...t.live], dispatchedAt: t.dispatched.at, id: t.id }); while (remembered.length > REMEMBERED_TURNS) remembered.shift(); } };
    const effectiveStopAt = (t: any, now: number) => now - t.lastSpeechAt < c.wordlessGraceMs ? t.lastSpeechAt : -Infinity;
    const reopenIfStale = (at: number) => {
        if (turn && turn.dispatched && at - Math.max(turn.dispatched.at, turn.lastFinalAt, effectiveStopAt(turn, at)) >= c.continuationMs) { remember(turn); turn = null; return; }
        if (memory.revive && turn && turn.declined && at - Math.max(turn.declined.at, turn.lastFinalAt, effectiveStopAt(turn, at)) >= c.continuationMs) { turn = null; }
    };
    const finalsText = (t: any) => t.finals.map((f: any) => f.text).join(' ');
    const textOf = (t: any) => t.finals.length ? { text: finalsText(t), fromLive: false } : t.live.length ? { text: t.live.join(' '), fromLive: true } : { text: '', fromLive: false };
    const silenceMs = (t: any, now: number) => now - t.lastSpeechAt;
    const settled = (t: any, now: number) => t.finals.length === 0 || now - t.lastFinalAt >= c.settleMs;
    const quiet = (t: any, now: number) => !t.speaking && silenceMs(t, now) >= c.gateMs && settled(t, now);
    const failSafeAt = (t: any) => t.detectedAt === null ? null : Math.max(t.detectedAt, t.lastFinalAt, t.lastSpeechAt) + c.maxHoldMs;
    const holdReason = (t: any, now: number) => t.speaking ? 'speaking' : silenceMs(t, now) < c.gateMs ? 'gate' : !settled(t, now) ? 'settle' : 'unfinished';
    const closedAs = (t: any) => t.declined.verdict === 'unknown' ? 'no-verdict' : 'not-a-question';
    return {
        remembered,
        speech(active: boolean, at: number) { if (!turn && !active) return; const t = open(at); t.vadSeen = true; t.speaking = active; if (!active) t.lastSpeechAt = at; },
        final(text: string, at: number) {
            reopenIfStale(at); const t = open(at); t.finals.push({ text: text.trim(), at }); t.lastFinalAt = at;
            if (!t.vadSeen) t.lastSpeechAt = at; if (t.dispatched) t.pendingAfterDispatch = true;
            if (memory.revive && t.declined) t.classifyAsked = false; // rejoin re-arms (spec §3.3)
            else if (memory.revive && opts.rearmUndetected && !t.detected && !t.dispatched && t.classifyAsked) t.classifyAsked = false; // NOT in the spec: re-arm an undetected turn whose classify is in flight
        },
        liveClaim(text: string, at: number): any {
            if (memory.echo) {
                if (opts.echoAfterR15) reopenIfStale(at);
                let best = 0, of: any = null;
                for (const r of remembered) { const s = quote(text, r.text); if (s > best) { best = s; of = r; } }
                const openScore = turn && turn.finals.length ? quote(text, finalsText(turn)) : 0;
                if (best >= QUOTE_MIN && best > openScore) return { kind: 'absorbed', of: of.text, ofId: of.id, score: best, openScore, ageMs: at - of.dispatchedAt };
            }
            reopenIfStale(at);
            if (memory.revive && turn && turn.declined) {
                const s = quote(text, finalsText(turn));
                if (s < QUOTE_MIN) { const closed = closedAs(turn); turn = null; const t = open(at); t.live.push(text.trim()); if (!t.vadSeen) t.lastSpeechAt = at; return { kind: 'replaced-declined', closed, score: s }; }
            }
            const t = open(at); t.live.push(text.trim()); if (!t.vadSeen) t.lastSpeechAt = at; return { kind: 'joined' };
        },
        detected(source: string, at: number, verdict?: string, forTurn?: number, o: { finals?: number; text?: string } = {}): any {
            if (forTurn !== undefined && (!turn || turn.id !== forTurn)) return { kind: 'ignored', why: 'stale-turn' };
            if (!memory.revive) { reopenIfStale(at); const t = open(at); t.detected = true; t.detectedAt = at; if (verdict === 'not-a-question' || verdict === 'unknown') t.notAQuestion = true; return { kind: 'marked' }; }
            if (forTurn !== undefined) {
                const t = turn;
                if (t.dispatched) return { kind: 'ignored', why: 'dispatched' };
                if (o.finals !== undefined && o.finals !== t.finals.length) return { kind: 'ignored', why: 'stale-finals' };
                if (verdict === 'not-a-question' || verdict === 'unknown') {
                    if (t.detected) { U('negative verdict on an already-marked turn: DECLINED'); t.detected = false; t.detectedAt = null; }
                    const was = t.declined; t.declined = { at, verdict }; return { kind: 'declined', verdict, again: !!was };
                }
                if (t.declined) { t.declined = null; t.detected = true; t.detectedAt = at; return { kind: 'revived', score: 1, finals: t.finals.length, by: 'verdict' }; }
                t.detected = true; t.detectedAt = at; return { kind: 'marked' };
            }
            reopenIfStale(at);
            if (turn && turn.declined) {
                if (o.text === undefined) throw new Error('a detection on a declined turn needs its text');
                const s = quote(o.text, finalsText(turn));
                if (s >= QUOTE_MIN) { turn.declined = null; turn.detected = true; turn.detectedAt = at; return { kind: 'revived', score: s, finals: turn.finals.length, by: source }; }
                const closed = closedAs(turn); turn = null; const t = open(at); t.detected = true; t.detectedAt = at; return { kind: 'replaced-declined', closed, score: s };
            }
            const t = open(at); t.detected = true; t.detectedAt = at; return { kind: 'marked' };
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
            if (atGate || unfinishedHoldElapsed || failSafe) { t.dispatched = { at: now, text }; return { kind: 'dispatch', text, live: [...t.live], finished: isFinished, finals: t.finals.length, fromLive }; }
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
        snapshot() { return turn ? { open: true, id: turn.id, finals: turn.finals.length, live: turn.live.length, detected: turn.detected, dispatched: !!turn.dispatched, declined: turn.declined?.verdict ?? null, classifyAsked: turn.classifyAsked } : { open: false, id: null }; },
    };
}
