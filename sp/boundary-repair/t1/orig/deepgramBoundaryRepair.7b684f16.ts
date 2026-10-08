/**
 * Puts back the word(s) Deepgram drops at a segment boundary.
 *
 * nova-3 (interim_results, endpointing 300, smart_format) sometimes finalizes a segment SHORT of
 * its own latest interim and starts the next segment after a word that then appears in no final;
 * the app joins finals verbatim, so the word is gone before any app logic sees it. Reproduced at
 * the seam on 2026-09-29 (scratchpad seam-probe.mjs, 4 clips x 5 plays straight to Deepgram, the
 * app's exact options): 6 of 20 plays lost a word. Flight h40c R22 is the symptom:
 *
 *   interim  "How do you cut hallucinations in a rag answer without just making"
 *   final    "How do you cut"
 *   final    "in a rag answer without just making it refuse?"
 *
 * The app answered "How do you cut in a rag answer without just making it refuse?" and all six
 * replays of that prompt answered about refusals.
 *
 * This is rule v3 of the design brief (scratchpad boundary-repair/DESIGN.md), a line-for-line port
 * of its reference rule-v3.mjs; the two must agree event for event (rule-sim.mjs --impl proves it).
 *
 *   CUT    a final F1 whose tokens equal the preceding interim I's first |F1| tokens (strict), or
 *          all but F1's last token (tolerant: Deepgram re-spells the word at the cut, "RAC" ->
 *          "Rag", in 5 of 5 seam plays of S2Q07), with I longer than F1. T = I's tokens after F1;
 *          Traw = the same words in I's own spelling.
 *   REPAIR on the NEXT final F2 only, within REPAIR_WINDOW_MS of F1, when F2 does not simply start
 *          with T[0] (the normal case, 527 in the logs: the word moved to the next segment): for
 *          k = 1 then 2 (k < |T|), if F2's first min(2, |T| - k) tokens EXACTLY equal T[k..], emit
 *          Traw[0..k) + ' ' + F2. Anything else, and every interim, passes through unchanged.
 *
 * Measured over every run log (rule-sim.mjs, 2026-09-29): non-holdout 25 repairs, 25 TRUE against
 * the scripted question, 0 FALSE; holdout 4 / 4 TRUE; on the seam recording 4 of the 6 lost words,
 * nothing else. v2's two wider branches were dropped after 4 FALSE repairs on holdout ("two" before
 * "to answer", "fee" before "feature", "four point" before "4.1%"), so two shapes stay unrepaired
 * on purpose: the |T| == 1 tail (F2 does not start with the interim's one remaining word — text
 * alone cannot tell a lost word from Deepgram re-hearing the same audio, "schedule" ->
 * "scheduled"), and resumption evidence that differs only by number formatting ("eighty" / "84%").
 *
 * Pure: no clock, no logging. DeepgramStreamingSTT creates one per live socket, feeds every
 * NON-EMPTY Transcript event with its arrival time, and logs each restore.
 */

/** The longest F1 -> F2 gap among the repaired losses was 4441 ms; the margin keeps a tail from being glued onto the next, unrelated utterance. */
const REPAIR_WINDOW_MS = 5000;
/** The largest skip observed: 1 loss of 2 words, 25 of 1 (non-holdout logs). */
const MAX_SKIPPED_WORDS = 2;
/** Resumption tokens that must match exactly: 2 — the evidence every observed loss provides — or 1 when the interim holds no more. */
const RESUME_MATCH_WORDS = 2;

/** Comparison tokens: thousands commas between digits removed ("10,000" -> "10000"), lowercase, [a-z0-9']+ runs — the evidence scans' normalisation. */
const stripThousands = (s: string): string => s.replace(/(\d),(\d)/g, '$1$2');
const tok = (s: string): string[] => stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
/** The same tokens in the text's own spelling (not lowercased): index-aligned with tok() on the same text. */
const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];

export interface BoundaryRepairResult {
    /** What to emit: `text` as received, or the restored word(s) + ' ' + `text`. */
    text: string;
    /** The restored word(s) in the interim's own spelling, in order; null when nothing was restored. */
    restored: string[] | null;
}

export interface BoundaryRepair {
    /** One call per NON-EMPTY Transcript event, in arrival order; `atMs` is the arrival time (only finals read it). */
    onTranscript(text: string, isFinal: boolean, atMs: number): BoundaryRepairResult;
}

export function createBoundaryRepair(): BoundaryRepair {
    let lastInterim: string | null = null;
    let cut: { T: string[]; Traw: string[]; atMs: number } | null = null;
    return {
        onTranscript(text, isFinal, atMs) {
            if (!isFinal) {
                lastInterim = text;
                return { text, restored: null };
            }
            let out = text;
            let restored: string[] | null = null;
            const remembered = cut;
            if (remembered && atMs - remembered.atMs <= REPAIR_WINDOW_MS) {
                const T = remembered.T, f = tok(text);
                if (f.length && f[0] !== T[0]) {
                    for (let k = 1; k <= MAX_SKIPPED_WORDS && k < T.length && !restored; k++) {
                        const m = Math.min(RESUME_MATCH_WORDS, T.length - k);
                        if (f.length >= m && T.slice(k, k + m).every((w, j) => w === f[j])) restored = remembered.Traw.slice(0, k);
                    }
                }
                if (restored) out = `${restored.join(' ')} ${text}`;
            }
            cut = null;
            if (lastInterim) {
                const iw = tok(lastInterim), fw = tok(text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: rawTok(lastInterim).slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}
