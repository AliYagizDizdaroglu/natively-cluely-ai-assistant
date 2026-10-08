// THROWAWAY: add reconcileWindowMs to questionReconcile.ts (GREEN step).
import fs from 'node:fs';

const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/services/questionReconcile.ts';
let s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const anchor = 'const MATCH = 0.5;';
if (!s.includes(anchor)) throw new Error('anchor missing');

const block = [
    '/**',
    ' * How far back the interviewer transcript must be read to corroborate a Live claim.',
    ' *',
    ' * reconcileLiveQuestion scores Live\'s text against the lines in this window and REPLACES it',
    ' * with the latest line when nothing clears PARAPHRASE. A fixed 15s window is shorter than a',
    ' * long question: after9\'s six long questions ran 24.6-28.5s and Live reported each 3.3-5.3s',
    ' * after the clip ended, so the window held only the tail, Live\'s whole question scored below',
    ' * the floor, and L03 was answered as "that people do not start ignoring it."',
    ' *',
    ' * Sized from the claim\'s own spoken length. WORDS_PER_SEC is the p10 of the 79 clips measured',
    ' * in that hour (median 2.66, min 1.71), so the window over-covers median-rate speech by ~19%.',
    ' * LAG_MS covers the gap between the interviewer finishing and Live reporting it (3.3-5.3s',
    ' * measured) plus the STT\'s own finalisation. The floor is the 15s this used to be, so a claim',
    ' * under 16 words keeps exactly today\'s behaviour. The cap stops a runaway claim from reaching',
    ' * back into the previous question, where an unrelated line could win the anchor — the same',
    ' * failure sameAnchor\'s window guard exists for (after8 W08).',
    ' */',
    'const WORDS_PER_SEC = 2.24;',
    'const LAG_MS = 8_000;',
    'const MIN_WINDOW_MS = 15_000;',
    'const MAX_WINDOW_MS = 60_000;',
    '',
    'export function reconcileWindowMs(liveText: string): number {',
    '    const spoken = ((liveText.match(/[A-Za-z0-9\']+/g) ?? []).length / WORDS_PER_SEC) * 1000;',
    '    return Math.min(MAX_WINDOW_MS, Math.max(MIN_WINDOW_MS, Math.round(spoken + LAG_MS)));',
    '}',
    '',
].join(eol);

s = s.replace(anchor, block + anchor);
fs.writeFileSync(p, s);
console.log('impl added');
