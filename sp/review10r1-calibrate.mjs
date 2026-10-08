// Reviewer calibration for Task 10 fix round 1, without touching MAIN.
// Copies the flight test, the flight module and its roster imports into a scratch root, then
// runs MAIN's vitest (MAIN's config: globals true, so the copied test drops only its
// `import ... from 'vitest'` line) against variants of the COPIED flight module, and reports
// which tests fail in each. MAIN's files are only read.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const GOLDEN_REL = path.join('electron', 'test', 'golden');
const SP = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(SP, 'vitest-cal-r1');
const GOLDEN = path.join(ROOT, GOLDEN_REL);
const FILES = ['interview60.flight.mjs', 'interview60.flight.test.ts', 'roster.mjs', 'interview60.questions.mjs', 'scenario50.questions.mjs', 'holdout40.questions.mjs'];

fs.mkdirSync(GOLDEN, { recursive: true });
const src = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(MAIN, GOLDEN_REL, f), 'utf8')]));
for (const f of FILES) if (f !== 'interview60.flight.mjs' && f !== 'interview60.flight.test.ts') fs.writeFileSync(path.join(GOLDEN, f), src[f]);

// The test copy: identical but for line 1 (globals: true in MAIN's config supplies describe/it/expect).
const IMPORT_LINE = "import { describe, it, expect } from 'vitest';";
if (!src['interview60.flight.test.ts'].startsWith(IMPORT_LINE)) { console.error('test line 1 is not the vitest import'); process.exit(1); }
fs.writeFileSync(path.join(GOLDEN, 'interview60.flight.test.ts'), src['interview60.flight.test.ts'].replace(IMPORT_LINE, '// vitest import dropped for the scratch copy: globals: true'));

const once = (text, from, to) => {
    const n = text.split(from).length - 1;
    if (n !== 1) throw new Error(`expected exactly one "${from.slice(0, 60)}", found ${n}`);
    return text.replace(from, to);
};
const FLIGHT = src['interview60.flight.mjs'];
const FOCUSED = "export const FOCUSED_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];";
const ANSWER = "export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];";
const PAIRED_LAST = "    { model: ANSWER_MODELS[1], tag: 'high', captured: false, args: ['--thinking', 'HIGH'] },\n];";
const PAIRED_FIRST = "    { model: ANSWER_MODELS[0], tag: 'low', captured: false, args: ['--thinking', 'LOW'] },";

const variants = [
    ['V0 baseline copy (no change)', FLIGHT],
    ['V1 FOCUSED_MODELS + qwen/qwen3.8-27b', once(FLIGHT, FOCUSED, FOCUSED.replace("'gemini-3.5-flash'];", "'gemini-3.5-flash', 'qwen/qwen3.8-27b'];"))],
    ['V2 PAIRED_ARMS + a Groq arm (appended)', once(FLIGHT, PAIRED_LAST, PAIRED_LAST.replace('\n];', "\n    { model: 'openai/gpt-oss-120b', tag: 'groq', captured: false, args: [] },\n];"))],
    ['V3 PAIRED_ARMS low arm on a Groq id', once(FLIGHT, PAIRED_FIRST, PAIRED_FIRST.replace('model: ANSWER_MODELS[0]', "model: 'openai/gpt-oss-120b'"))],
    ['V4 ANSWER_MODELS + qwen/qwen3.8-27b', once(FLIGHT, ANSWER, ANSWER.replace("'gemini-3.5-flash-lite'];", "'gemini-3.5-flash-lite', 'qwen/qwen3.8-27b'];"))],
    ['V5 known negative: FOCUSED_MODELS + gemini-3.9-flash', once(FLIGHT, FOCUSED, FOCUSED.replace("'gemini-3.5-flash'];", "'gemini-3.5-flash', 'gemini-3.9-flash'];"))],
];

const VITEST = path.join(MAIN, 'node_modules', 'vitest', 'vitest.mjs');
const CONFIG = path.join(MAIN, 'vitest.config.ts');
const OUT = path.join(ROOT, 'result.json');
const ENV = { ...process.env };
delete ENV.NATIVELY_ROSTER; // the roster default, as in the implementer's runs
for (const [name, text] of variants) {
    fs.writeFileSync(path.join(GOLDEN, 'interview60.flight.mjs'), text);
    if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
    const r = spawnSync(process.execPath, [VITEST, 'run', '--root', ROOT, '--config', CONFIG, '--reporter=json', `--outputFile=${OUT}`, 'electron/test/golden/interview60.flight.test.ts'], { cwd: ROOT, encoding: 'utf8', env: ENV });
    if (!fs.existsSync(OUT)) { console.log(`${name}: NO RESULT (exit ${r.status})\n${(r.stderr || r.stdout || '').slice(0, 1500)}`); continue; }
    const j = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const all = j.testResults.flatMap((t) => t.assertionResults);
    const failed = all.filter((a) => a.status === 'failed');
    console.log(`${name}: ${all.length} tests, ${all.filter((a) => a.status === 'passed').length} passed, ${failed.length} failed (exit ${r.status})`);
    for (const f of failed) console.log(`    FAILED  ${f.fullName}\n            ${String(f.failureMessages?.[0] ?? '').split('\n')[0].slice(0, 160)}`);
}
// Leave the copy as the unmodified baseline.
fs.writeFileSync(path.join(GOLDEN, 'interview60.flight.mjs'), FLIGHT);
