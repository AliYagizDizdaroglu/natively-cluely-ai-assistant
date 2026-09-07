/**
 * The shape two ears' texts share, for "one contains the other" checks only:
 * lower-case, a 1–3 letter token joined to the digits after it ("p 99" → "p99"),
 * punctuation dropped, whitespace collapsed. Deepgram and Live disagree on exactly
 * these (after8 H02, 2026-09-07: "has p 99 latency creeping up. How…" vs
 * "…has P99 latency creeping up, how…"), which made the fuller sentence of an
 * answered head look new — a second answer instead of an extension.
 */
export function normalizeForContainment(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b([a-z]{1,3}) (\d+)\b/g, '$1$2')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
