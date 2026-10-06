/** Spec 4.2. Pure: no clock, no I/O. */
export const MAX_WORDS = 80;
export const MIN_WORDS = 8;
const MARKER_RE = /[<>\[\]]|__\S+?__/;

export function tokensOf(text: string): string[] { const t = text.trim(); return t ? t.split(/\s+/) : []; }
export function lettersOnly(tok: string): string { return tok.toLowerCase().replace(/[^a-z]/g, ''); }
export function isHardWord(tok: string): boolean { return /^(hard)+$/.test(lettersOnly(tok)); }
export function isCleanHard(tok: string): boolean { return lettersOnly(tok) === 'hard'; }

/**
 * The first word is the first token with a letter (review I-1): letterless leading tokens such as `"`, `...` or `1.`
 * are skipped. It is complete once whitespace follows it, or the turn has ended.
 */
export function completeFirstWord(text: string, ended: boolean): string | null {
    const re = /\S+/g; let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
        if (lettersOnly(m[0]) === '') continue;
        return m.index + m[0].length < text.length || ended ? m[0] : null;
    }
    return null;
}

export function routeFirstWord(word: string): { route: 'hard' | 'live'; reason: '-' | 'garbled-hard' } {
    if (!isHardWord(word)) return { route: 'live', reason: '-' };
    return { route: 'hard', reason: isCleanHard(word) ? '-' : 'garbled-hard' };
}

export function hasMarker(text: string): boolean { return MARKER_RE.test(text); }

export type CheckReason = '-' | 'marker' | 'too-long' | 'incomplete' | 'incomplete-after-show' | 'too-short';
/** The first failing row wins (spec 4.2 table). `shown` picks incomplete vs incomplete-after-show. */
export function checkCompleted(text: string, completed: boolean, ended: boolean, shown = false): { ok: boolean; reason: CheckReason; words: number } {
    const words = tokensOf(text).length;
    if (hasMarker(text)) return { ok: false, reason: 'marker', words };
    if (words > MAX_WORDS) return { ok: false, reason: 'too-long', words };
    if (ended && !completed) return { ok: false, reason: shown ? 'incomplete-after-show' : 'incomplete', words };
    if (ended && words < MIN_WORDS) return { ok: false, reason: 'too-short', words };
    return { ok: true, reason: '-', words };
}

export function decisionRoute(text: string, completed: boolean, ended: boolean): 'hard' | 'easy-answer' | 'invalid' {
    const w = completeFirstWord(text, ended);
    if (w === null) return 'invalid';
    if (isHardWord(w)) return 'hard';
    return ended && checkCompleted(text, completed, ended).ok ? 'easy-answer' : 'invalid';
}

/**
 * What may be on screen: the text before the first token carrying a marker, at most 80 words, and,
 * while streaming, complete tokens only (a token still arriving may yet turn out to carry a marker).
 */
export function showablePrefix(text: string, ended: boolean): { prefix: string; stop: null | 'marker' | 'too-long' } {
    const re = /\S+/g; let m: RegExpExecArray | null; let n = 0;
    while ((m = re.exec(text))) {
        n++;
        if (MARKER_RE.test(m[0])) return { prefix: text.slice(0, m.index), stop: 'marker' };
        if (n > MAX_WORDS) return { prefix: text.slice(0, m.index), stop: 'too-long' };
    }
    if (ended) return { prefix: text, stop: null };
    const lastWs = Math.max(text.lastIndexOf(' '), text.lastIndexOf('\n'), text.lastIndexOf('\t'));
    return { prefix: lastWs >= 0 ? text.slice(0, lastWs + 1) : '', stop: null };
}
