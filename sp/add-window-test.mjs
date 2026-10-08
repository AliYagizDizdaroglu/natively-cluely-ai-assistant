// THROWAWAY: append the reconcileWindowMs describe block (RED step) and update the import.
import fs from 'node:fs';

const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/services/questionReconcile.test.ts';
let s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const oldImport = "import { overlap, sameAnchor, reconcileLiveQuestion, type RecentSpeech } from './questionReconcile';";
const newImport = "import { overlap, sameAnchor, reconcileLiveQuestion, reconcileWindowMs, type RecentSpeech } from './questionReconcile';";
if (!s.includes(oldImport)) throw new Error('import anchor missing');
s = s.replace(oldImport, newImport);

const block = [
    '',
    'describe(\'reconcileWindowMs — how far back the transcript must be read to cover a claim\', () => {',
    '    // after9 measured 79 spoken clips: 2.66 words/sec median, 2.24 at p10, 1.71 min. The six',
    '    // long questions ran 24.6-28.5s and Live reported them 3.3-5.3s after the clip ended.',
    '    // A fixed 15s window therefore covered only the tail of a long question, and L03 was',
    '    // answered as "that people do not start ignoring it." — the transcript line the',
    '    // reconciler fell back to once Live\'s whole question scored below the floor.',
    '    it(\'keeps the 15s floor for a short claim, so nothing changes for ordinary questions\', () => {',
    '        expect(reconcileWindowMs(\'What is a DAG?\')).toBe(15_000);',
    '        expect(reconcileWindowMs(\'How would you detect data drift in a model that is already in production?\')).toBe(15_000);',
    '    });',
    '    it(\'covers L03: 69 words spoken in 25.9s, reported 5.3s after the clip ended\', () => {',
    '        const L03 = \'Let\\\'s talk about monitoring. Say you have twenty models in production, owned by four different teams, \'',
    '            + \'and today each team watches its own dashboards by hand. Design me a monitoring setup that catches data \'',
    '            + \'drift, prediction drift, and plain infrastructure problems, tells you which team owns the alert, and \'',
    '            + \'keeps the false alarm rate low enough that people do not start ignoring it.\';',
    '        expect(reconcileWindowMs(L03)).toBeGreaterThan(25_900 + 5_300);',
    '    });',
    '    it(\'covers L04, the longest in the roster: 84 words in 28.5s, reported 4.5s later\', () => {',
    '        const claim = new Array(84).fill(\'feature\').join(\' \');',
    '        expect(reconcileWindowMs(claim)).toBeGreaterThan(28_500 + 4_500);',
    '    });',
    '    it(\'caps a runaway claim so the window cannot swallow the previous question\', () => {',
    '        expect(reconcileWindowMs(new Array(500).fill(\'word\').join(\' \'))).toBeLessThanOrEqual(60_000);',
    '    });',
    '});',
    '',
].join(eol);

fs.writeFileSync(p, s.trimEnd() + eol + block);
console.log('test appended');
