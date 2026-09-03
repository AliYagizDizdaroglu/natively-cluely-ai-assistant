/**
 * Reconcile what the Live listener SAYS was asked with what the STT HEARD.
 *
 * On 2026-09-02 Live emitted "Tell me about a time you handled a resource
 * constraint problem…" while the interim transcript carried, verbatim, "Why
 * would you use CloudFormation instead of configuring things by…". Nothing
 * compared the two, so the invented question became the chip and the intent.
 * Live also paraphrases freely, which defeated text-based dedupe (12 double
 * chips in the hour). Both problems have one fix: anchor every Live question
 * to the transcript sentence it came from.
 */
export interface RecentSpeech { text: string; at: number; final: boolean }
import { isFragment } from './questionShape';

export type ReconcileVerdict = 'match' | 'paraphrase' | 'replaced' | 'unverifiable';
export interface Reconciled { text: string; anchor: string | null; verdict: ReconcileVerdict; score: number }

const words = (s: string) => { const tokens: string[] = s.toLowerCase().match(/[a-z0-9]+/g) ?? []; return new Set(tokens.filter((w) => w.length > 3)); };

/** Fraction of a's content words (len > 3) present in b. 0 when a has none. */
export function overlap(a: string, b: string): number {
    const A = words(a), B = words(b);
    if (!A.size) return 0;
    let hit = 0;
    for (const w of A) if (B.has(w)) hit++;
    return hit / A.size;
}

/** Two detections describe the same utterance when either covers half the other's content, or one contains the other. */
export function sameAnchor(a: string, b: string): boolean {
    const na = a.toLowerCase().trim(), nb = b.toLowerCase().trim();
    if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return true;
    return overlap(a, b) >= 0.5 || overlap(b, a) >= 0.5;
}

const MATCH = 0.5;
const PARAPHRASE = 0.25;

export function reconcileLiveQuestion(liveText: string, recent: RecentSpeech[]): Reconciled {
    const spoken = recent.filter((r) => r.text.trim().length > 0);
    if (!spoken.length) return { text: liveText, anchor: null, verdict: 'unverifiable', score: 0 };
    let best = spoken[0], bestScore = -1;
    for (const r of spoken) {
        const s = overlap(liveText, r.text);
        if (s > bestScore) { best = r; bestScore = s; }
    }
    if (bestScore >= MATCH) return { text: liveText, anchor: best.text, verdict: 'match', score: bestScore };
    if (bestScore >= PARAPHRASE) return { text: liveText, anchor: best.text, verdict: 'paraphrase', score: bestScore };
    // Below the floor while the window holds speech: Live's text is not what was said.
    // Surface the most recent thing the interviewer actually said instead.
    const latest = spoken.reduce((a, b) => (b.at > a.at ? b : a));
    // A fragment ("?", "Um.") is no evidence of what was said: it must not replace a
    // substantive Live question (2026-09-03 Live-only hour, W04 lost that way).
    if (isFragment(latest.text)) return { text: liveText, anchor: null, verdict: 'unverifiable', score: bestScore };
    return { text: latest.text, anchor: latest.text, verdict: 'replaced', score: bestScore };
}
