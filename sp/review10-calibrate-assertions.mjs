// Reviewer calibration for Task 10's new test, without touching MAIN: runs the test's two
// assertions (same vitest `expect`, same expressions) against known arrays.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
// vitest's own `expect` refuses to load outside its runner, so build it the way vitest does:
// chai 5.3.3 + @vitest/expect 2.1.9 (the versions MAIN's vitest 2.1.9 resolves).
void createRequire;
const chai = await import(pathToFileURL(path.join(MAIN, 'node_modules/chai/index.js')).href);
const ve = await import(pathToFileURL(path.join(MAIN, 'node_modules/@vitest/expect/dist/index.js')).href);
chai.use(ve.JestExtend); chai.use(ve.JestChaiExpect); chai.use(ve.JestAsymmetricMatchers);
const expect = chai.expect;
const { ANSWER_MODELS, FOCUSED_MODELS, PAIRED_ARMS } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.flight.mjs')).href);

const first = (e) => String(e?.message ?? e).split('\n')[0];
const whole = (A) => { try { expect(A).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']); for (const m of A) expect(m, m).not.toContain('/'); return 'PASS'; } catch (e) { return 'FAIL  ' + first(e); } };
const slashOnly = (A) => { try { for (const m of A) expect(m, m).not.toContain('/'); return 'PASS'; } catch (e) { return 'FAIL  ' + first(e); } };

const cases = {
    'MAIN ANSWER_MODELS (as built now)': ANSWER_MODELS,
    'known good: the two lites': ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'],
    'known bad: old four (HEAD)': ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'],
    'known bad: + qwen': ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'qwen/qwen3.8-27b'],
    'known bad: 3.5 replaced by gpt-oss': ['gemini-3.1-flash-lite', 'openai/gpt-oss-120b'],
    'known bad: reordered lites': ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
};
for (const [name, A] of Object.entries(cases)) console.log(`${name.padEnd(38)} whole test: ${whole(A)}`);
console.log('');
console.log(`'/' clause alone on + qwen:               ${slashOnly(cases['known bad: + qwen'])}`);
console.log(`'/' clause alone on the two lites:        ${slashOnly(cases['known good: the two lites'])}`);
console.log('');
// What the flight schedules with --model beyond ANSWER_MODELS: is any of it guarded against a "/" id?
const scheduled = [...ANSWER_MODELS, ...FOCUSED_MODELS, ...PAIRED_ARMS.map((a) => a.model)];
console.log(`every --model id the flight can schedule (${new Set(scheduled).size} distinct): ${[...new Set(scheduled)].join(', ')}`);
console.log(`any "/" among them: ${scheduled.some((m) => m.includes('/'))}`);
console.log(`would the new test notice a "/" id in FOCUSED_MODELS? ${whole(ANSWER_MODELS) === 'PASS' ? 'no - it reads ANSWER_MODELS only' : 'n/a'}`);
