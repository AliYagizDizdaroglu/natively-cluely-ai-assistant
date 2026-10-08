// THROWAWAY: corroborate a Live claim against the window's lines JOINED, not only the best
// single line (GREEN step). Purely additive: inserted between the existing match and
// paraphrase checks, so everything that matched before matches identically.
import fs from 'node:fs';

const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/services/questionReconcile.ts';
let s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const anchor = "    if (bestScore >= MATCH) return { text: liveText, anchor: best.text, verdict: 'match', score: bestScore };";
if (!s.includes(anchor)) throw new Error('anchor missing');

const added = [
    anchor,
    '    // A question longer than one transcript line can never match any single line. after9\'s six',
    '    // long questions ran 24.6-28.5s and scored 0.20-0.31 against their best line — under the',
    '    // floor — so L03 was answered as "that people do not start ignoring it.", the last thing',
    '    // the interviewer had said. Deepgram emits interims as cumulative prefixes, so the window\'s',
    '    // lines JOINED reconstruct the utterance: the same six score 0.95-1.00 that way (0.35-0.72',
    '    // under the old fixed 15s window, which is why reconcileWindowMs sizes it to the claim).',
    '    //',
    '    // Held to MATCH, not PARAPHRASE: a union of unrelated speech reaches the paraphrase floor on',
    '    // generic words alone. after8 07:36:26 had Live claim a question nobody asked, sharing only',
    '    // "multiple" and "cluster" with the real one for a joined 0.25 exactly — corroborating there',
    '    // would keep the invented question, the failure this reconciler exists to prevent. The anchor',
    '    // stays the best single line, so dedup still compares one utterance against one utterance.',
    '    const joinScore = overlap(liveText, spoken.map((r) => r.text).join(\' \'));',
    "    if (joinScore >= MATCH) return { text: liveText, anchor: best.text, verdict: 'match', score: joinScore };",
].join(eol);

s = s.replace(anchor, added);
fs.writeFileSync(p, s);
console.log('join impl added');
