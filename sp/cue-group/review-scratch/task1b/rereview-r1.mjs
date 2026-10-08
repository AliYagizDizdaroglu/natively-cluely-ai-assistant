// Throwaway re-review script, Task 1b fix round 1. Read-only on the worktree: reads files and git blobs,
// mutates only in memory. Pins are lifted from the test files' own text, so the check runs the test's logic.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const WT = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const SCRATCH = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp';
const BASE = '64d74a144a609e37e3f302a4802cfec41c5e0340';
const H1 = 'ECA165910DF78E5228634FDB7939438EADA1C8AB9A1D0108BB8228899F4AD03A';
const git = (...args) => execFileSync('git', ['-C', WT, ...args], { maxBuffer: 64 * 1024 * 1024 });
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const rd = (rel) => fs.readFileSync(path.join(WT, ...rel.split('/')));
const occurs = (s, sub) => s.split(sub).length - 1;

// ---- 0. state: HEAD, index, the source file this round must not have touched
const head = git('rev-parse', 'HEAD').toString().trim();
console.log('HEAD == BASE:', head === BASE, '| staged:', JSON.stringify(git('diff', '--cached', '--name-only').toString()));
const cur = rd('electron/ipcHandlers.ts');
console.log('ipcHandlers.ts sha256 == H1:', sha(cur) === H1);

// ---- 1. the round's delta: round-1 test file (the brief's Step 3 block) vs the current one
const briefLines = rd('.superpowers/sdd/2026-09-30-cue-early-close/task-1b-brief.md').toString('utf8').replace(/\r\n/g, '\n').split('\n');
const round1 = briefLines.slice(89, 122).join('\n') + '\n';
const snap = fs.readFileSync(path.join(SCRATCH, 'typedPrompt.before-fix1.test.ts'), 'utf8');
console.log("implementer's pre-fix snapshot == the brief's Step 3 block:", snap === round1);
const testBuf = rd('electron/ipcHandlers.typedPrompt.test.ts');
const testSrc = testBuf.toString('utf8');
console.log('current test: BOM', testBuf[0] === 0xef, '| CR', testBuf.includes(13), '| one trailing LF', testSrc.endsWith('\n') && !testSrc.endsWith('\n\n'),
    '| lines', testSrc.split('\n').length - 1, '| it( blocks', (testSrc.match(/^\s*it\(/gm) || []).length);
// line-level delta by LCS
const a = round1.split('\n'), b = testSrc.split('\n');
const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
const delta = [];
for (let i = 0, j = 0; i < a.length || j < b.length;) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; }
    else if (j < b.length && (i === a.length || L[i][j + 1] >= L[i + 1][j])) delta.push(`+ (new ${j + 1}) ${b[j++]}`);
    else delta.push(`- (old ${i + 1}) ${a[i++]}`);
}
console.log(`round delta: +${delta.filter((d) => d[0] === '+').length} -${delta.filter((d) => d[0] === '-').length}`);
for (const d of delta) console.log('   ', d);
for (const [n, l] of b.entries()) if (l.length > 120) console.log(`    long line ${n + 1}: ${l.length} chars`);

// chains test and its round-1 state (base + the brief's two Step 5 edits)
const B = (from, to) => briefLines.slice(from - 1, to).join('\n') + '\n';
const chainsBase = git('show', `${BASE}:electron/test/golden/interview60.chains.test.ts`).toString('utf8');
const chainsExpected = chainsBase.replace(B(153, 154), () => B(160, 160)).replace(B(166, 168), () => B(174, 176));
console.log('chains test == base + the brief\'s two edits (unchanged this round):', rd('electron/test/golden/interview60.chains.test.ts').toString('utf8') === chainsExpected);

// ---- 2. lift the pins from a test file's text
const pinRe = /expect\(mentioning\((\/.+?\/[a-z]*)\)\)\.toEqual\(\[\n([\s\S]*?)\n\s*\]\);/g;
const lift = (text) => [...text.matchAll(pinRe)].map(([, lit, body]) => ({ re: new Function(`return ${lit}`)(), exp: new Function(`return [${body}]`)() }));
const now = lift(testSrc), old = lift(round1);
for (const [tag, pins] of [['round 1', old], ['now', now]]) console.log(`pins ${tag}:`, pins.map((p) => `${p.re} (flags "${p.re.flags}") -> ${p.exp.length} expected`).join(' ; '));

const src = cur.toString('utf8');
const srcLines = src.split('\n');
const received = (text, re) => text.split('\n').map((l) => l.trim()).filter((l) => re.test(l));
const verdict = (pins, text) => pins.map(({ re, exp }) => (isDeepStrictEqual(received(text, re), exp) ? 'pass' : 'FAIL')).join(' / ');

// ---- 3. test 2 on today's source: exactly three lines, and which ones
const t2 = now[1];
const hits = srcLines.map((l, k) => [k + 1, l]).filter(([, l]) => t2.re.test(l)).map(([n]) => n);
console.log('test 2 expected entries:', t2.exp.length, '| received on today\'s source:', received(src, t2.re).length, 'at lines', hits.join(', '),
    '| equal:', isDeepStrictEqual(received(src, t2.re), t2.exp));
console.log('test 2 expected == trimmed lines 547, 560, 577:', isDeepStrictEqual(t2.exp, [547, 560, 577].map((n) => srcLines[n - 1].trim())));

// ---- 4. mutants (in memory)
const mut = (name, from, to) => {
    const n = occurs(src, from);
    if (n !== 1) throw new Error(`${name}: target occurs ${n} times`);
    return [name, src.replace(from, () => to)];
};
const IND = '              ';
const CALL = 'stream = llmHelper.streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);';
const cases = [
    ['current source                                   (want pass / pass)', src],
    mut('A  brief: declaration -> hands-free                (want FAIL / FAIL)', 'let verbalSystemPrompt = VERBAL_TYPED_PROMPT;', 'let verbalSystemPrompt = VERBAL_WHAT_TO_ANSWER_PROMPT;'),
    mut('B  brief: call wraps the variable                  (want pass / FAIL)', '(userContent, verbalSystemPrompt, undefined', '(userContent, wrap(verbalSystemPrompt), undefined'),
    mut('F  finding: re-assign added before the call (577) (want pass / FAIL)', CALL, `verbalSystemPrompt = withCueRule(verbalSystemPrompt);\n${IND}${CALL}`),
    mut('G  finding: re-assign added after line 548        (want pass / FAIL)', 'let verbalContext = context;', `let verbalContext = context;\n${IND}verbalSystemPrompt = promptFor(mode);`),
    mut('C  knowledge branch -> hands-free                 (want FAIL / FAIL)', '${kr.systemPromptInjection}\\n\\n${VERBAL_TYPED_PROMPT}', '${kr.systemPromptInjection}\\n\\n${VERBAL_WHAT_TO_ANSWER_PROMPT}'),
    mut('I  a second call naming another prompt            (want pass / FAIL)', CALL, `${CALL}\n${IND}stream = llmHelper.streamVerbalWithGeminiFlash(userContent, handsFree, undefined, selectedModel);`),
    mut('J  the call sends another variable                (want pass / FAIL)', '(userContent, verbalSystemPrompt, undefined', '(userContent, handsFreePrompt, undefined'),
    mut('K  inner-block shadow before the call             (want pass / FAIL)', CALL, `{ const verbalSystemPrompt = promptFor(mode); }\n${IND}${CALL}`),
    mut('M  compound assignment before the call            (want pass / FAIL)', CALL, `verbalSystemPrompt += suffix;\n${IND}${CALL}`),
    mut('N  re-assignment split over two lines             (want pass / FAIL)', CALL, `verbalSystemPrompt =\n${IND}  withCueRule(verbalSystemPrompt);\n${IND}${CALL}`),
    mut('D  knowledge branch removed                       (want FAIL / FAIL)', '                        verbalSystemPrompt = `${kr.systemPromptInjection}\\n\\n${VERBAL_TYPED_PROMPT}`;\n', ''),
    mut('H4 harmless: call re-indented                     (want pass / pass)', `${IND}${CALL}`, `${IND}    ${CALL}`),
    ['H5 harmless: CRLF endings                         (want pass / pass)', src.replace(/\n/g, '\r\n')],
    mut('H6 comment naming the variable (property)         (pass / FAIL)', CALL, `// verbalSystemPrompt is sent as is\n${IND}${CALL}`),
];
console.log('\n' + 'case'.padEnd(72), 'round-1 pins'.padEnd(14), 'current pins');
for (const [name, text] of cases) console.log(name.padEnd(72), verdict(old, text).padEnd(14), verdict(now, text));
