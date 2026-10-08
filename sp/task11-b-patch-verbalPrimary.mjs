import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\LLMHelper.verbalPrimary.test.ts';
const text = fs.readFileSync(file, 'utf8');

const oldStr = `describe('NATIVELY_VERBAL_PRIMARY_MODEL overrides the verbal answer model only', () => {
    const saved = process.env[VERBAL_PRIMARY_MODEL_ENV];
    const savedLevel = process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    beforeEach(() => {
        generateContentStream.mockClear();
        delete process.env[VERBAL_PRIMARY_MODEL_ENV];
        delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    });
    afterEach(() => {
        if (saved === undefined) delete process.env[VERBAL_PRIMARY_MODEL_ENV];
        else process.env[VERBAL_PRIMARY_MODEL_ENV] = saved;
        if (savedLevel === undefined) delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
        else process.env.NATIVELY_GEMINI_THINKING_LEVEL = savedLevel;
    });
`;

const newStr = `describe('NATIVELY_VERBAL_PRIMARY_MODEL overrides the verbal answer model only', () => {
    const saved = process.env[VERBAL_PRIMARY_MODEL_ENV];
    const savedLevel = process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    // h40c review M2: a shell that exports NATIVELY_VERBAL_HEDGE (a flight or smoke shell) routed
    // the two lite models through the hedge instead of the plain call this file checks, changing
    // which model answers — same fix as LLMHelper.stallFallback.test.ts.
    const savedHedge = process.env.NATIVELY_VERBAL_HEDGE;
    const savedTrigger = process.env.NATIVELY_VERBAL_HEDGE_TRIGGER_MS;
    beforeEach(() => {
        generateContentStream.mockClear();
        delete process.env[VERBAL_PRIMARY_MODEL_ENV];
        delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
        delete process.env.NATIVELY_VERBAL_HEDGE;
        delete process.env.NATIVELY_VERBAL_HEDGE_TRIGGER_MS;
    });
    afterEach(() => {
        if (saved === undefined) delete process.env[VERBAL_PRIMARY_MODEL_ENV];
        else process.env[VERBAL_PRIMARY_MODEL_ENV] = saved;
        if (savedLevel === undefined) delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
        else process.env.NATIVELY_GEMINI_THINKING_LEVEL = savedLevel;
        if (savedHedge === undefined) delete process.env.NATIVELY_VERBAL_HEDGE;
        else process.env.NATIVELY_VERBAL_HEDGE = savedHedge;
        if (savedTrigger === undefined) delete process.env.NATIVELY_VERBAL_HEDGE_TRIGGER_MS;
        else process.env.NATIVELY_VERBAL_HEDGE_TRIGGER_MS = savedTrigger;
    });
`;

const count = text.split(oldStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(oldStr).join(newStr), 'utf8');
console.log('OK: verbalPrimary.test.ts patched with NATIVELY_VERBAL_HEDGE hygiene');
