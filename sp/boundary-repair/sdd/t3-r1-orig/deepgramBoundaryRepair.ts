/**
 * Puts back the word(s) Deepgram drops at a segment boundary.
 *
 * nova-3 (interim_results, endpointing 300, smart_format) sometimes finalizes a segment SHORT of
 * its own latest interim and starts the next segment after a word that then appears in no final;
 * the turn text is built from finals, so the word is gone before the question is asked. Reproduced
 * at the seam on 2026-09-29 (scratchpad seam-probe.mjs, clips streamed straight to Deepgram with
 * the app's option object): 6 of 20 plays lost a word, then 9 of 48. Flight h40c R22 is the symptom:
 *
 *   interim  "How do you cut hallucinations in a rag answer without just making"
 *   final    "How do you cut"
 *   final    "in a rag answer without just making it refuse?"
 *
 * and the app dispatched "How do you cut in a rag answer without just making it refuse?".
 *
 * This is rule v4 of the design brief (scratchpad boundary-repair/DESIGN-v4.md), a line-for-line
 * port of its reference rule-v4.mjs; the two must agree event for event (check-v4.mjs proves the
 * reference on every recorded stream; the controller replays the built module the same way).
 *
 *   CUT    a final F1 whose tokens equal the preceding interim I's first |F1| tokens (strict), or
 *          all but F1's last token, which must be a RE-SPELLING of I's token at that position
 *          (tolerant: Deepgram re-spells the word at the cut, "RAC" -> "Rag", 5 of 5 seam plays of
 *          S2Q07) — see isRespelling(). I must be longer than F1 and ASCII-LETTERED (the tokens
 *          are ASCII: accented English such as "résumé" stays aligned but tokenises as fragments,
 *          and a lost "résumé" came back as "r sum" in the 2026-09-29 review's probe; 0 such
 *          interims in the 28 English logs and the seam recordings). The ASCII-letter condition
 *          is also what keeps rawTok() index-aligned with tok(): no character it admits changes
 *          the token count, checked on every code point in the 2026-09-29 v4 re-review. T = I's
 *          tokens after F1; Traw = the same words in I's own spelling.
 *   PAUSE  clear() forgets the cut and the latest interim (the adapter calls it on an empty FINAL and
 *          on UtteranceEnd); a final with speechFinal (Deepgram heard the utterance end there) leaves
 *          no cut. None of the three occurred inside a repaired loss on the recorded data: 0 of 29 log
 *          repairs had an empty final between F1 and F2, 0 of 6 seam repairs an UtteranceEnd, and all
 *          63 seam cuts had speech_final=false.
 *   REPAIR on the NEXT final F2 only, within REPAIR_WINDOW_MS of F1, when F2 does not simply start
 *          with T[0] (the normal case, 527 in the logs: the word moved to the next segment): for
 *          k = 1 then 2 (k < |T|), if F2's first min(2, |T| - k) tokens EXACTLY equal T[k..], emit
 *          Traw[0..k) + ' ' + F2. Anything else, and every interim, passes through unchanged.
 *
 * Measured over every run log and both seam recordings (check-v4.mjs, 2026-09-29): non-holdout logs
 * 25 repairs, all 25 TRUE against the scripted question (the measured precision; 25 is a floor on
 * the number of losses, since the logs cannot show a loss that left no interim evidence); holdout
 * 4 / 4 TRUE — reported only, NOT an independent validation and not evidence for any choice here
 * (v2's holdout failures chose what v3 removed; R22 and these 4 are excluded from any future
 * holdout measurement of this rule); seam recordings 6 repairs, all true, of 15 boundary losses
 * (4 of 6 on the first; 2 of 9 on the second, where 4 losses left NO interim evidence — F1 longer
 * than its last interim — which no interim rule reaches). v2's two wider branches were dropped
 * after 4 FALSE repairs on holdout ("two" before "to answer", "fee" before "feature", "four point"
 * before "4.1%"), so two shapes stay unrepaired on purpose: the |T| == 1 tail (F2 does not start
 * with the interim's one remaining word — text alone cannot tell a lost word from Deepgram
 * re-hearing the same audio, "schedule" -> "scheduled"), and resumption evidence that differs only
 * by number formatting ("eighty" / "84%"). The weakest path is k = 2 with m = 1: one observed loss
 * ("for a" before "production").
 *
 * English only: the tokens are ASCII, and the spec review showed the rule mangling Spanish and
 * Turkish text. DeepgramStreamingSTT creates the repair only on an English connection (the same
 * test as keytermsFor) and passes every other language, and 'multi', through untouched.
 *
 * Pure: no clock, no logging. DeepgramStreamingSTT creates one per live socket, feeds every
 * NON-EMPTY Transcript event with its arrival time and speech_final flag, and logs each restore.
 */

/**
 * The longest F1 -> F2 gap among the repaired losses was 3715 ms (logs; 3115 holdout, 3207 seam); the
 * margin keeps a tail from being glued onto the next, unrelated utterance. NORMAL cuts (nothing lost)
 * reach 7835 ms, 12 of 527 past 5000, so the window will occasionally miss a real loss.
 */
const REPAIR_WINDOW_MS = 5000;
/** The largest skip observed: 1 loss of 2 words, 25 of 1 (non-holdout logs). */
const MAX_SKIPPED_WORDS = 2;
/** Resumption tokens that must match exactly: 2 — the evidence every observed loss provides — or 1 when the interim holds no more. */
const RESUME_MATCH_WORDS = 2;

/** Comparison tokens: thousands commas between digits removed ("10,000" -> "10000"), lowercase, [a-z0-9']+ runs — the evidence scans' normalisation. */
const stripThousands = (s: string): string => s.replace(/(\d),(\d)/g, '$1$2');
const tok = (s: string): string[] => stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
/** The same tokens in the text's own spelling (not lowercased): index-aligned with tok() on any text without a non-ASCII letter — the NON_ASCII_LETTER guard in createBoundaryRepair is what guarantees it. */
const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];
/** A letter or combining mark outside ASCII: the tokenisers split such a word into fragments, so an interim holding one is never a cut (2026-09-29 review M2). */
const NON_ASCII_LETTER = /(?![\x00-\x7F])[\p{L}\p{M}]/u;

/**
 * F1's last token may only be a RE-SPELLING of the interim's token at that position: same first
 * letter, no digit, no longer. smart_format writes "ninety two percent" as "92%" — one final token
 * over three interim words — and a compound merges "all right" into "Alright": a final token that
 * absorbed more audio than the interim's word shifts T, and v3 restored "two percent" / "right"
 * (the spec review's probes). Measured on the 42 tolerant cuts in the NON-HOLDOUT logs and seam
 * recordings (check-v4.out.txt): all 34 kept are no longer than the interim's token ("xgboost" ->
 * "xg", "dashboard" -> "dash", "RAC" -> "Rag"); 7 refused as longer (all "break" -> "breaks") and
 * 1 for a digit ("ninety" -> "92"), none of them followed by a repair; 0 refused for the first
 * letter — that rule rests only on the synthetic "put" for "cut" case. KNOWN RECALL COST: an
 * inflection is longer too, and it does not shift T (the 7 "breaks" cuts are aligned: F2 resumed at
 * the interim's next word, nothing lost); a word lost right after an inflected cut ("scale" ->
 * "scales", then "horizontally") was restored by v3 and is not by v4. No such loss in the data.
 */
const isRespelling = (finalTok: string, interimTok: string): boolean =>
    finalTok[0] === interimTok[0] && !/\d/.test(finalTok) && finalTok.length <= interimTok.length;

export interface BoundaryRepairResult {
    /** What to emit: `text` as received, or the restored word(s) + ' ' + `text`. */
    text: string;
    /** The restored word(s) in the interim's own spelling, in order; null when nothing was restored. */
    restored: string[] | null;
}

export interface BoundaryRepair {
    /**
     * One call per NON-EMPTY Transcript event, in arrival order; `atMs` is the arrival time (only
     * finals read it); `speechFinal` is Deepgram's speech_final flag (a final carrying it leaves no cut).
     */
    onTranscript(text: string, isFinal: boolean, atMs: number, speechFinal?: boolean): BoundaryRepairResult;
    /** A pause (an empty final, an UtteranceEnd): forget the remembered cut and the latest interim. */
    clear(): void;
}

export function createBoundaryRepair(): BoundaryRepair {
    let lastInterim: string | null = null;
    let cut: { T: string[]; Traw: string[]; atMs: number } | null = null;
    return {
        clear() {
            cut = null;
            lastInterim = null;
        },
        onTranscript(text, isFinal, atMs, speechFinal = false) {
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
            if (lastInterim && !speechFinal && !NON_ASCII_LETTER.test(lastInterim)) {
                const iw = tok(lastInterim), fw = tok(text), raw = rawTok(lastInterim);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]) && isRespelling(fw[fw.length - 1], iw[fw.length - 1]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: raw.slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}
