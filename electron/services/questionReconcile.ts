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
import { looksFragmentary } from './questionShape';

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

/**
 * How far back the interviewer transcript must be read to corroborate a Live claim.
 *
 * reconcileLiveQuestion scores Live's text against the lines in this window and REPLACES it
 * with the latest line when nothing clears PARAPHRASE. A fixed 15s window is shorter than a
 * long question: after9's six long questions ran 24.6-28.5s and Live reported each 3.3-5.3s
 * after the clip ended, so the window held only the tail, Live's whole question scored below
 * the floor, and L03 was answered as "that people do not start ignoring it."
 *
 * Sized from the claim's own spoken length. WORDS_PER_SEC is a LOWER BOUND on speaking rate,
 * not a typical one: too high and the window stops short of the question's own start, which is
 * the L03 defect. It was first set to 2.24, the p10 of interview60's 79 clips — but that is a
 * property of one roster, not of speech. Rendering scenario50 (2026-09-08) produced clips down
 * to 1.55 w/s, its questions being comma-heavy lists the voice pauses through, and 12 of its
 * 100 clips fell outside the window at 2.24. Across all 179 clips of both rosters every one is
 * covered at 1.8; 1.6 keeps margin for a human interviewer, who pauses mid-question in ways a
 * synthesiser does not.
 *
 * Widening is not free in principle — a longer window joins more text, and the joined score can
 * only rise — so it was measured: replaying the 195 live dispatches of after7/8/9 at rates from
 * 2.24 down to 1.4 produced ZERO new corroborations, and the closest uncorroborated claim held
 * at 0.474, below MATCH, at every rate.
 *
 * LAG_MS covers the gap between the interviewer finishing and Live reporting it (3.3-5.3s
 * measured) plus the STT's own finalisation. The floor is the 15s this used to be, so a claim
 * under 12 words keeps exactly today's behaviour. The cap stops a runaway claim from reaching
 * back into the previous question, where an unrelated line could win the anchor — the same
 * failure sameAnchor's window guard exists for (after8 W08). The cap binds first past ~83
 * words, so a question longer than that is covered only if it is read faster than 1.6 w/s.
 */
const WORDS_PER_SEC = 1.6;
const LAG_MS = 8_000;
const MIN_WINDOW_MS = 15_000;
export const RECONCILE_MAX_WINDOW_MS = 60_000;

export function reconcileWindowMs(liveText: string): number {
    const spoken = ((liveText.match(/[A-Za-z0-9']+/g) ?? []).length / WORDS_PER_SEC) * 1000;
    return Math.min(RECONCILE_MAX_WINDOW_MS, Math.max(MIN_WINDOW_MS, Math.round(spoken + LAG_MS)));
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
    // A question longer than one transcript line can never match any single line. after9's six
    // long questions ran 24.6-28.5s and scored 0.20-0.31 against their best line — under the
    // floor — so L03 was answered as "that people do not start ignoring it.", the last thing
    // the interviewer had said. Deepgram emits interims as cumulative prefixes, so the window's
    // lines JOINED reconstruct the utterance: the same six score 0.95-1.00 that way (0.35-0.72
    // under the old fixed 15s window, which is why reconcileWindowMs sizes it to the claim).
    //
    // Held to MATCH, not PARAPHRASE: a union of unrelated speech reaches the paraphrase floor on
    // generic words alone. after8 07:36:26 had Live claim a question nobody asked, sharing only
    // "multiple" and "cluster" with the real one for a joined 0.25 exactly — corroborating there
    // would keep the invented question, the failure this reconciler exists to prevent. The anchor
    // stays the best single line, so dedup still compares one utterance against one utterance.
    const joinScore = overlap(liveText, spoken.map((r) => r.text).join(' '));
    if (joinScore >= MATCH) return { text: liveText, anchor: best.text, verdict: 'match', score: joinScore };
    if (bestScore >= PARAPHRASE) return { text: liveText, anchor: best.text, verdict: 'paraphrase', score: bestScore };
    // Below the floor while the window holds speech: Live's text is not what was said.
    // Surface the most recent thing the interviewer actually said instead.
    const latest = spoken.reduce((a, b) => (b.at > a.at ? b : a));
    // A fragment is no evidence of what was said: it must not replace a substantive Live
    // question. The first guard was isFragment (< 4 words; 2026-09-03 Live-only hour, W04
    // lost to "?"). The 2026-09-04 after5 hour had Whisper hallucinating exactly four words
    // ("I'm going to go.") on a channel that never went silent; that passed the guard and
    // replaced correct Live claims three times (W02 and M19 were answered as phantoms).
    // looksFragmentary — the fragment hold's own predicate — refuses those too, and over
    // the nine replaced verdicts in eight flight hours it changes only the phantom cases
    // (spec 2026-09-05 §2).
    if (looksFragmentary(latest.text)) return { text: liveText, anchor: null, verdict: 'unverifiable', score: bestScore };
    return { text: latest.text, anchor: latest.text, verdict: 'replaced', score: bestScore };
}
