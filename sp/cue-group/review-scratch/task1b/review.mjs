// Throwaway review script, Task 1b. Read-only on the worktree: reads files and git blobs, mutates only in memory.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const WT = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const BASE = '64d74a144a609e37e3f302a4802cfec41c5e0340';
const git = (...args) => execFileSync('git', ['-C', WT, ...args], { maxBuffer: 64 * 1024 * 1024 });
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const rd = (rel) => fs.readFileSync(path.join(WT, ...rel.split('/')));

// ---- 1. ipcHandlers.ts: H0 / H1 and exactly which bytes were inserted
const base = git('show', `${BASE}:electron/ipcHandlers.ts`);
const cur = rd('electron/ipcHandlers.ts');
console.log('H0 base blob', sha(base), base.length, 'bytes; equals report H0:', sha(base) === '5D6A318A347FC0C4FCE63D9D7B7C21692D6640FA6B21FDB19E163AAC1EC4B2B5');
console.log('H1 work file', sha(cur), cur.length, 'bytes; equals report H1:', sha(cur) === 'ECA165910DF78E5228634FDB7939438EADA1C8AB9A1D0108BB8228899F4AD03A');
let i = 0; while (i < base.length && base[i] === cur[i]) i++;
const inserted = cur.subarray(i, i + (cur.length - base.length));
const restSame = Buffer.compare(cur.subarray(i + inserted.length), base.subarray(i)) === 0;
const lineNo = cur.subarray(0, i).toString('utf8').split('\n').length;
const curLines = cur.toString('utf8').split('\n');
console.log('first difference at byte', i, '(line', lineNo + ')', 'inserted', JSON.stringify(inserted.toString('latin1')), 'rest identical:', restSame);
for (const n of [lineNo - 1, lineNo, lineNo + 1]) console.log('  line', n, JSON.stringify(curLines[n - 1]));

// ---- 2. typed-prompt test == the brief's Step 3 block, byte for byte
const briefLines = rd('.superpowers/sdd/2026-09-30-cue-early-close/task-1b-brief.md').toString('utf8').replace(/\r\n/g, '\n').split('\n');
console.log('brief fences at 89/123:', JSON.stringify(briefLines[88]), JSON.stringify(briefLines[122]));
const expectedTest = briefLines.slice(89, 122).join('\n') + '\n';
const testBuf = rd('electron/ipcHandlers.typedPrompt.test.ts');
const testSrc = testBuf.toString('utf8');
console.log('typed test: BOM', testBuf[0] === 0xef, '| CR bytes', testBuf.includes(13), '| lines', testSrc.split('\n').length - 1, '| verbatim:', testSrc === expectedTest);
if (testSrc !== expectedTest) {
    const a = testSrc.split('\n'), b = expectedTest.split('\n');
    for (let k = 0; k < Math.max(a.length, b.length); k++) if (a[k] !== b[k]) { console.log('  first mismatch line', k + 1, JSON.stringify(a[k]), 'vs brief', JSON.stringify(b[k])); break; }
}

// ---- 3. chains test == base with the brief's two Step 5 replacements, nothing else
const B = (from, to) => briefLines.slice(from - 1, to).join('\n') + '\n';   // 1-based, inclusive
const old1 = B(153, 154), new1 = B(160, 160), old2 = B(166, 168), new2 = B(174, 176);
console.log('step5 old1', JSON.stringify(old1)); console.log('step5 new1', JSON.stringify(new1));
console.log('step5 old2', JSON.stringify(old2)); console.log('step5 new2', JSON.stringify(new2));
const chainsBase = git('show', `${BASE}:electron/test/golden/interview60.chains.test.ts`).toString('utf8');
const occurs = (s, sub) => s.split(sub).length - 1;
console.log('old1 occurs in base', occurs(chainsBase, old1), '| old2 occurs in base', occurs(chainsBase, old2));
const chainsExpected = chainsBase.replace(old1, () => new1).replace(old2, () => new2);
const chainsCur = rd('electron/test/golden/interview60.chains.test.ts').toString('utf8');
console.log('chains test == base + the brief\'s two edits exactly:', chainsCur === chainsExpected);

// ---- 4. out-of-scope file untouched
console.log('interview60.metrics.test.ts identical to base:', Buffer.compare(git('show', `${BASE}:electron/test/golden/interview60.metrics.test.ts`), rd('electron/test/golden/interview60.metrics.test.ts')) === 0);
const mjs = rd('electron/test/golden/interview60.chains.mjs');
console.log('interview60.chains.mjs (what the chains pin prints as Received on a failure):', mjs.toString('utf8').split('\n').length - 1, 'lines,', mjs.length, 'bytes');

// ---- 5. the pins' own logic, lifted from the test file, run on in-memory mutants
const pinRe = /expect\(mentioning\((\/.+?\/)\)\)\.toEqual\(\[\n([\s\S]*?)\n\s*\]\);/g;
const pins = [...testSrc.matchAll(pinRe)].map(([, lit, body]) => ({ re: new Function(`return ${lit}`)(), exp: new Function(`return [${body}]`)() }));
console.log('pins lifted:', pins.length, pins.map((p) => `${p.re} -> ${p.exp.length} line(s)`).join(' ; '));
const verdict = (text) => {
    const lines = text.split('\n').map((l) => l.trim());
    return pins.map(({ re, exp }) => (isDeepStrictEqual(lines.filter((l) => re.test(l)), exp) ? 'pass' : 'FAIL'));
};
const tight = (text) => text.split('\n').map((l) => l.trim()).filter((l) => /\bverbalSystemPrompt\b/.test(l));
const src = cur.toString('utf8');
const mut = (name, from, to) => {
    const n = occurs(src, from);
    if (n !== 1) throw new Error(`${name}: target occurs ${n} times`);
    return [name, src.replace(from, () => to)];
};
const IND = '              ';
const CALL = 'stream = llmHelper.streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);';
const IMPORT = 'import { VERBAL_TYPED_PROMPT } from "./llm/prompts"';
const cases = [
    ['current source (calibration: pass / pass)', src],
    mut('A brief mutant: plain branch -> hands-free (FAIL / pass)', 'let verbalSystemPrompt = VERBAL_TYPED_PROMPT;', 'let verbalSystemPrompt = VERBAL_WHAT_TO_ANSWER_PROMPT;'),
    mut('B brief mutant: call wraps the variable (pass / FAIL)', 'streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);', 'streamVerbalWithGeminiFlash(userContent, wrap(verbalSystemPrompt), undefined, selectedModel);'),
    mut('C knowledge branch -> hands-free', '${kr.systemPromptInjection}\\n\\n${VERBAL_TYPED_PROMPT}', '${kr.systemPromptInjection}\\n\\n${VERBAL_WHAT_TO_ANSWER_PROMPT}'),
    mut('D CUE_RULE appended on the plain branch', 'let verbalSystemPrompt = VERBAL_TYPED_PROMPT;', 'let verbalSystemPrompt = VERBAL_TYPED_PROMPT + CUE_RULE;'),
    mut('E a second import naming CUE_RULE', IMPORT, `${IMPORT}\nimport { CUE_RULE } from "./llm/prompts"`),
    mut('F added line re-assigns the variable before the call', CALL, `verbalSystemPrompt = withCueRule(verbalSystemPrompt);\n${IND}${CALL}`),
    mut('G added line re-assigns it after the knowledge branch', 'let verbalContext = context;', `let verbalContext = context;\n${IND}verbalSystemPrompt = promptFor(mode);`),
    mut('H1 harmless: semicolon on the import', `${IMPORT}\n`, `${IMPORT};\n`),
    mut('H2 harmless: single quotes on the import', IMPORT, "import { VERBAL_TYPED_PROMPT } from './llm/prompts'"),
    mut('H3 harmless: call wrapped over two lines', CALL, `stream = llmHelper.streamVerbalWithGeminiFlash(\n${IND}  userContent, verbalSystemPrompt, undefined, selectedModel);`),
    mut('H4 harmless: call re-indented', `${IND}${CALL}`, `${IND}    ${CALL}`),
    ['H5 harmless: CRLF endings', src.replace(/\n/g, '\r\n')],
    mut('H6 harmless: a log line reading the prompt length', CALL, `console.log('[IPC] typed prompt chars', verbalSystemPrompt.length);\n${IND}${CALL}`),
];
console.log('tight pin (every line naming verbalSystemPrompt) on the current source:', JSON.stringify(tight(src)));
for (const [name, text] of cases) console.log(name.padEnd(62), verdict(text).join(' / ').padEnd(12), '| tight pin lines:', tight(text).length);
