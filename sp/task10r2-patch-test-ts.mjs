import fs from 'node:fs';

const path = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.flight.test.ts";
let text = fs.readFileSync(path, 'utf8');
text = text.replace(/\r\n/g, '\n');

function applyOnce(label, old, neu) {
    const count = text.split(old).length - 1;
    if (count !== 1) { console.error(`${label}: expected 1 occurrence, found ${count}`); process.exit(1); }
    text = text.replace(old, neu);
    console.log(`${label}: OK`);
}

// M1: import FOCUSED_MODELS too (exported from interview60.flight.mjs), alphabetically before FOCUSED_ONLY_BY_ROSTER.
applyOnce('M1-import',
`import { ANSWER_MODELS, FOCUSED_ONLY_BY_ROSTER, LIVE_DEFAULT, LIVE_FALLBACK, PAIRED_ARMS, answersFileFor, capturedOnly, chooseLiveModel, focusedOnlyFor, newestRunDir } from './interview60.flight.mjs';`,
`import { ANSWER_MODELS, FOCUSED_MODELS, FOCUSED_ONLY_BY_ROSTER, LIVE_DEFAULT, LIVE_FALLBACK, PAIRED_ARMS, answersFileFor, capturedOnly, chooseLiveModel, focusedOnlyFor, newestRunDir } from './interview60.flight.mjs';`);

// M1: split the assertion -- keep the exact toEqual test, add a second test covering every id the
// flight can schedule (answer + focused + paired arms), not just ANSWER_MODELS.
applyOnce('M1-split-test',
`describe('ANSWER_MODELS', () => {
    it('the flight answers with the two Flash Lites only: no Groq comparison arms (user, 2026-09-26)', () => {
        expect(ANSWER_MODELS).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
        for (const m of ANSWER_MODELS) expect(m, m).not.toContain('/');
    });
});`,
`describe('ANSWER_MODELS', () => {
    it('the flight answers with the two Flash Lites only: no Groq comparison arms (user, 2026-09-26)', () => {
        expect(ANSWER_MODELS).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
    });

    it('no id the flight can schedule runs on Groq: answer, focused and paired arms (user, 2026-09-26)', () => {
        for (const m of [...ANSWER_MODELS, ...FOCUSED_MODELS, ...PAIRED_ARMS.map((a) => a.model)]) expect(m, m).not.toContain('/');
    });
});`);

fs.writeFileSync(path, text, 'utf8');
console.log('WROTE ' + path + '  length=' + text.length);
