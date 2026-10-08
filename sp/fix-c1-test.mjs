// THROWAWAY (RED): pin the rule that a capture invalidates extendOf.
import fs from 'node:fs';

const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/services/screenReference.test.ts';
let s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const oldImport = "import { mentionsScreen } from './screenReference';";
if (!s.includes(oldImport)) throw new Error('import anchor missing');
s = s.replace(oldImport, "import { mentionsScreen, extendOfAfterCapture } from './screenReference';");

const block = [
    '',
    'describe(\'extendOfAfterCapture — an extend that captures cannot build on the blind answer\', () => {',
    '    // after9 C03: the head "Walk me through it and mention the time" carried no screen',
    '    // reference, so it was answered blind — about drift and retraining, for a circular-queue',
    '    // problem. The fuller sentence arrived through the extend branch, which now captures the',
    '    // screen. extensionShape then tells the model it has ALREADY answered the first part, to',
    '    // add only the delta in under 30 words, and not to reintroduce that answer — muzzling the',
    '    // one answer that can finally see the screen, and anchoring it to a wrong one.',
    '    const HEAD = \'Walk me through it and mention the time\';',
    '    it(\'drops extendOf when the screen was captured for this answer\', () => {',
    '        expect(extendOfAfterCapture(HEAD, true)).toBeUndefined();',
    '    });',
    '    it(\'keeps extendOf when nothing was captured, so ordinary extends stay short\', () => {',
    '        // after8 measured the default shape at 104-114 words on six extensions against 27 with',
    '        // the extension shape: this path must not lose that.',
    '        expect(extendOfAfterCapture(HEAD, false)).toBe(HEAD);',
    '        expect(extendOfAfterCapture(undefined, false)).toBeUndefined();',
    '        expect(extendOfAfterCapture(undefined, true)).toBeUndefined();',
    '    });',
    '});',
    '',
].join(eol);

fs.writeFileSync(p, s.trimEnd() + eol + block);
console.log('C1 test appended');
