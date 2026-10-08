/**
 * Terms Deepgram is told to expect, so the interviewer's vocabulary survives transcription.
 *
 * Every entry was measured, not guessed: each scripted roster question was diffed against the
 * text the app actually heard for it (233 scripted-vs-heard pairs across every flight run we
 * still hold), and only words lost in TWO OR MORE separate flights are listed. Hyphenation
 * and numeral differences ("dead-letter" vs "dead letter", "million" vs "1,000,000") were
 * excluded — smart_format rewrites those and the model reads them correctly either way.
 *
 * Two of these changed an answer's meaning rather than its spelling, which is why this list
 * exists at all:
 *
 *   S1Q04F  "while preserving the tie rule"        heard as  "the Thai rule"
 *           The model answered the garble and invented regional sharding. It was the ONLY
 *           wrong answer of flight s50j — and it was wrong in every offline arm too, because
 *           every arm replays the same transcript. An STT defect scored as a quality miss.
 *
 *   S2Q05   "skip chunks that do not fit, deduplicate chunk ids"
 *           heard as  "skip chunks that do not fit, duplicate chunk IDs"
 *           The requirement inverts. Lost in 4 of 5 flights.
 *
 * The rest are names the model needs in order to answer at all:
 *   S1Q09F  "and which on AKS"      heard as "and which on axe"    (4 flights)
 *   S2Q04   "unique document ids"   heard as "uniqueids"/"documenteds" (5 flights)
 *   S2Q01   "reranking"             heard as "re ranking"          (4 flights)
 *
 * WHAT THIS LIST ACTUALLY FIXES — each clip was replayed through a real nova-3 live socket,
 * 16 kHz linear16 at the app's own settings, with the list off and on (2026-09-20):
 *
 *   FIXED     "Thai rule"    -> "tie rule"     S1Q04F, the answer-changing one
 *   FIXED     "re ranking"   -> "reranking"    S2Q01
 *   NOT FIXED "axe"          for AKS           S1Q09F — six spellings tried ('AKS', 'aks',
 *             'A K S', 'AKS cluster', with and without 'Azure Kubernetes Service'); the
 *             decoder returns "axe" at 0.64-0.74 confidence every time, so the synthetic
 *             roster audio genuinely says "axe" and no keyterm can reach it. A human
 *             interviewer saying the letters would not produce this, which is why the term
 *             stays — but do not count it as a fix.
 *   NOT FIXED "documenteds"  for document ids  S2Q04 — six spellings tried, same outcome:
 *             the two words are run together in the audio itself.
 *   UNVERIFIED 'deduplicate', 'chunk ids', 'tie-breaking' — the S2Q05 tail did not reproduce
 *             in the replay slices, so these ride on the flight-diff evidence alone.
 *
 * Deliberately NOT listed: words whose loss was a spelling variant (cancelling/canceling), a
 * numeral rewrite (million), or a common word missed once in passing (pack, extend, prefer,
 * support, break). Keyterm prompting biases the decoder toward what it is given, so padding
 * this list with ordinary English would cost accuracy elsewhere for nothing.
 *
 * NO REGRESSION. Keyterm prompting biases the decoder toward what it is given, so all 40 s50j
 * clips were replayed off and on and scored by word error rate against the scripted text:
 * mean WER 22.35% off, 22.43% on, with 35 of 40 clips identical. The sweep flagged 2 clips
 * "worse" and 3 "better" — but at ONE run per config, which is the same single-sample trap the
 * s50j twin reps exist to catch. Re-running the five at 3 reps per config settles it:
 *
 *   S1Q08  within-OFF spread 17.1 pts, ON minus OFF 0.0  <- its "regression" reproduces with
 *                                                           the list OFF; it is this harness's
 *                                                           fixed 6 s tail truncating the clip
 *   S1Q06  0.0 spread, ON minus OFF 0.0                  <- "regression" does not reproduce
 *   S1Q07  0.0 spread, ON minus OFF 0.0                  <- "improvement" does not reproduce
 *   S2Q01  0.0 spread, ON minus OFF -7.7 pts, 3/3 reps   <- the reranking fix, perfectly stable
 *
 * So the list costs nothing and the gains it does make are reproducible. Measure the within-
 * config spread before believing any between-config difference here.
 *
 * To extend it: re-run the scripted-vs-heard diff after a flight and add what the hour lost
 * twice. Do not add a term because it looks hard to hear — and confirm it against the audio
 * before calling it fixed, because two of the seven here do not respond at all.
 *
 * @see https://developers.deepgram.com/docs/keyterm
 */
export const DEEPGRAM_KEYTERMS: readonly string[] = [
    'tie rule',
    'tie-breaking',
    'deduplicate',
    'document ids',
    'chunk ids',
    'AKS',
    'reranking',
];

/**
 * keyterm prompting is a nova-3, English-only parameter. The app switches Deepgram to another
 * language — and to 'multi' — at runtime from the language picker, and sending keyterm on
 * those connections is at best ignored and at worst a 400 that costs the socket. So the list
 * rides only on English sockets, and every other language gets undefined (the caller spreads
 * it, so undefined means the parameter is simply absent).
 */
export function keytermsFor(languageCode: string): readonly string[] | undefined {
    return /^en(-|$)/i.test(languageCode) ? DEEPGRAM_KEYTERMS : undefined;
}
