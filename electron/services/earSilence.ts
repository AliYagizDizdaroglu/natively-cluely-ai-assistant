/**
 * Silent-listener detector (bundle-1 SPEC 5). A pure module: no clock, no I/O; main.ts feeds it the
 * interviewer STT's speech-started / utterance-end events and the ear's caption events, with timestamps.
 *
 * The signal is UTTERANCES, not seconds: an interviewer utterance (speech-started .. utterance-end) is
 * "captioned" if an ear caption falls in [start - leadMs, end + graceMs]; k consecutive uncaptioned
 * utterances since the ear came up mean the ear is deaf while its session still reports `connected`
 * (the 2026-09-30 episodes: 1011 reconnect churn, status never `failed`, so shouldFailOver never fired).
 * Wall-clock gaps are the wrong unit: the healthy maximum from the last caption to an uncaptioned
 * utterance end was 237 s.
 */

/**
 * Provenance (SPEC 5.1/5.2, bundle-1/ear-gap3.out.txt): 22 healthy runs (24 had utterance events, 2 hold the
 * episodes) reach at most 3 uncaptioned utterances in a row (in 4 of 22); the real episodes reached 7 and 10.
 * k = 5 sits 2 above the healthy maximum and still fires on both episodes (D3: the user approved 4; 5 needs sign-off).
 * graceMs / leadMs are the caption-window edges used to score those runs.
 */
export const EAR_SILENCE_K = 5;
export const EAR_SILENCE_GRACE_MS = 10_000;
export const EAR_SILENCE_LEAD_MS = 2_000;
/** A speech-started with no utterance-end is dropped when the next start comes more than this later. */
const DANGLING_START_MS = 60_000;
/** Captions older than this can no longer fall in any live window (60 s dangling start + grace + lead). */
const CAPTION_KEEP_MS = 120_000;

export interface EarSilenceWatch {
  /** Start counting. Call at the ear instance's first `connected` status; nothing before it is recorded. */
  arm(): void;
  caption(at: number): void;
  utteranceStart(at: number): void;
  utteranceEnd(at: number): void;
  /** Judge every utterance whose window has closed (end + graceMs <= now). 'silent' once, then null until reset(). */
  tick(now: number): 'silent' | null;
  /** Forget utterances, captions and the count (a new ear instance). Does not disarm. */
  reset(): void;
}

export function createEarSilenceWatch(
  opts: { k?: number; graceMs?: number; leadMs?: number } = {},
): EarSilenceWatch {
  const k = opts.k ?? EAR_SILENCE_K, graceMs = opts.graceMs ?? EAR_SILENCE_GRACE_MS, leadMs = opts.leadMs ?? EAR_SILENCE_LEAD_MS;
  let armed = false;
  let openStart: number | null = null;
  let pending: Array<{ s: number; u: number }> = [];
  let captions: number[] = [];
  let misses = 0;
  let fired = false;

  return {
    arm() { armed = true; },
    caption(at) { if (armed) captions.push(at); },
    utteranceStart(at) {
      if (!armed) return;
      // Two starts before one end: the FIRST start is kept, unless it is stale (no end for > 60 s): then it is dropped, uncounted.
      if (openStart !== null && at - openStart <= DANGLING_START_MS) return;
      openStart = at;
    },
    utteranceEnd(at) {
      if (!armed || openStart === null) return;   // an end with no start is ignored
      pending.push({ s: openStart, u: at });
      openStart = null;
    },
    tick(now) {
      let verdict: 'silent' | null = null;
      const due = pending.filter((p) => p.u + graceMs <= now).sort((a, b) => a.u - b.u);
      pending = pending.filter((p) => p.u + graceMs > now);
      for (const p of due) {
        const captioned = captions.some((c) => c >= p.s - leadMs && c <= p.u + graceMs);
        misses = captioned ? 0 : misses + 1;
        if (misses >= k && !fired) { fired = true; verdict = 'silent'; }
      }
      captions = captions.filter((c) => c >= now - CAPTION_KEEP_MS);
      return verdict;
    },
    reset() { openStart = null; pending = []; captions = []; misses = 0; fired = false; },
  };
}
