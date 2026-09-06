/**
 * "Extend on an added clause": the STT closes a final at a mid-question pause ("What is a
 * DAG?" … "and why does Airflow use that structure?"), the head is answered at once, and the
 * fuller sentence that follows is dropped as a duplicate — its second half never answered.
 * The fix answers the fuller sentence when it CONTAINS the answered text and adds a clause.
 *
 * Why containment plus a word count, not the spike's overlap variants: replayed over the
 * after5-7 flights (180 answers), "contains + ≥ 3 added words" fires 21 times — 5 on heads the
 * judge had marked weak or wrong (a rescue), 16 on heads judged acceptable whose second clause
 * the interviewer did ask. Content-word variants (≥ 2/≥ 3 words over three letters) miss
 * after7 M27's "and when would you not?" (five words, two of them content words), the one
 * weak head in that hour this rule reaches. A blanket "any longer overlapping text" rule was
 * 29 firings for 7 rescues and is not used.
 */
export const EXTEND_WINDOW_MS = 30_000;

const normalize = (t: string): string => t.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[?.!,;:]+$/, '');
const words = (t: string): string[] => t.toLowerCase().match(/[a-z0-9']+/g) ?? [];

export function shouldExtend(answered: string, later: string, ageMs: number): boolean {
    if (ageMs > EXTEND_WINDOW_MS) return false;
    const head = normalize(answered), full = normalize(later);
    if (!head || head === full || !full.includes(head)) return false;
    return words(full).length - words(head).length >= 3;
}
