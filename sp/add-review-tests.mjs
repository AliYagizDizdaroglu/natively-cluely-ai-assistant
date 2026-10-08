// THROWAWAY: pin the two states the review found unexercised — the anchor a join-match
// returns, and the join promoting an UNVERIFIABLE claim (the only behavioural promotion:
// unverifiable diverts to liveHold instead of dispatching).
import fs from 'node:fs';

const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/services/questionReconcile.test.ts';
let s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const anchor = [
    '    it(\'is corroborated by the window as a whole, not by any one line of it\', () => {',
    '        const r = reconcileLiveQuestion(L03_CLAIM, L03_WINDOW);',
    '        expect(r.verdict).toBe(\'match\');',
    '        expect(r.text).toBe(L03_CLAIM);',
    '    });',
].join(eol);

const replacement = [
    '    it(\'is corroborated by the window as a whole, not by any one line of it\', () => {',
    '        const r = reconcileLiveQuestion(L03_CLAIM, L03_WINDOW);',
    '        expect(r.verdict).toBe(\'match\');',
    '        expect(r.text).toBe(L03_CLAIM);',
    '        // The anchor stays a SINGLE line — the best-scoring one — so the deduper keeps',
    '        // comparing one utterance against one utterance. Without this the anchor could drift',
    '        // to the latest line and nothing would fail.',
    '        expect(r.anchor).toBe(\'Say you have 20 models in production owned by four different teams,\');',
    '    });',
    '',
    '    it(\'promotes an unverifiable claim, which is the promotion that changes behaviour\', () => {',
    '        // Deepgram\'s last interim before Live reports often ends mid-clause. That made the',
    '        // latest line fragmentary, so the claim came out UNVERIFIABLE (score 0.19, anchor null)',
    '        // and main.ts diverted it to liveHold instead of dispatching it. The three long',
    '        // questions this happened to in after9 scored 0.95-0.97 on the joined window.',
    '        const withMidClauseTail = [...L03_WINDOW, sp(\'and how you would keep\', -1200, false)];',
    '        const r = reconcileLiveQuestion(L03_CLAIM, withMidClauseTail);',
    '        expect(r.verdict).toBe(\'match\');',
    '        expect(r.text).toBe(L03_CLAIM);',
    '    });',
].join(eol);

if (!s.includes(anchor)) throw new Error('anchor missing');
s = s.replace(anchor, replacement);
fs.writeFileSync(p, s);
console.log('review tests added');
