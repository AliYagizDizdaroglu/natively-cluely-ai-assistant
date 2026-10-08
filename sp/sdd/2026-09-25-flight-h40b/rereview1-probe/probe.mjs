// Throwaway probe for the task-2 re-review 1. Read-only on MAIN: reads files, runs `git show <sha>`
// in the whole-turn worktree (same object store as MAIN), compiles in memory with esbuild
// (write: false; outdir points into this scratchpad folder so even a mistake could not touch MAIN).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { r09Missing } from '../../../guard-r09.mjs';

const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const WT = MAIN + '\\.claude\\worktrees\\whole-turn';
const HEAD_SHA = process.argv[2] ?? '08dcb8f';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(MAIN + '\\package.json');
const esbuild = req('esbuild');
const BARE = 'still lists bare "salary" as a negotiation term';
const PHRASE = 'lacks the R09 phrase terms';
let diffs = 0;
const check = (label, got, predicted) => {
    const same = got === predicted;
    if (!same) diffs++;
    console.log(`${same ? 'as predicted' : 'DIFFERS    '} | ${label}: ${JSON.stringify(got)}${same ? '' : ` (predicted ${JSON.stringify(predicted)})`}`);
};

console.log('=== A. predicate edge cases (the real r09Missing) ===');
const A = [
    ['phrase entries only, TS style', "const S = [\n    'salary expectation', 'salary expectations', 'expected salary', 'salary range', 'your salary',\n    'base salary', 'what salary', 'compensation',\n];", null],
    ['bare first, TS single quotes (HEAD shape)', "const S = [\n    'salary', 'compensation',\n];", BARE],
    ['bare in esbuild output, one per line', 'const S = [\n  "salary",\n  "compensation"\n];', BARE],
    ['bare, minified', 'const S=["salary","compensation","salary expectations"];', BARE],
    ["bare, space before comma  'salary' ,", "const S = ['salary' , 'salary expectations'];", BARE],
    ['bare LAST, esbuild layout, phrase list present', 'const S = [\n  "salary expectations",\n  "salary"\n];', null],
    ['bare LAST, minified, phrase list present', 'const S=["salary expectations","salary"];', null],
    ['bare LAST, esbuild layout, no phrase list', 'const S = [\n  "compensation",\n  "salary"\n];', PHRASE],
    ['bare LAST, TS with trailing comma, phrase list present', "const S = [\n    'salary expectations', 'salary',\n];", BARE],
    ['comment quoting "salary" then a word (current source line 29)', '// "salary" by itself is not strong either\nconst S = [\'salary expectations\'];', null],
    ['comment quoting "salary" then a comma', '// the old list was "salary", "compensation"\nconst S = [\'salary expectations\'];', BARE],
];
for (const [label, text, predicted] of A) check(label, r09Missing(text), predicted);

console.log('\n=== B. the build that a rebuild would produce (esbuild ' + esbuild.version + ', build-electron.js options) ===');
const stripMapLine = (s) => s.replace(/\r?\n\/\/# sourceMappingURL=[^\n]*\n?$/, '\n');
const T = (code) => esbuild.transformSync(code, { loader: 'ts', format: 'cjs', platform: 'node', target: 'node20', sourcefile: 'electron/knowledge/IntentClassifier.ts' }).code;
const headSrc = execFileSync('git', ['show', `${HEAD_SHA}:electron/knowledge/IntentClassifier.ts`], { cwd: WT, encoding: 'utf8' });
const wtSrc = fs.readFileSync(`${MAIN}\\electron\\knowledge\\IntentClassifier.ts`, 'utf8');
const distPath = `${MAIN}\\dist-electron\\electron\\knowledge\\IntentClassifier.js`;
const distBefore = fs.statSync(distPath).mtimeMs;
const distText = fs.readFileSync(distPath, 'utf8');
// B1 calibration: HEAD's text through my pipeline must reproduce the on-disk (old) dist byte for byte.
check('B1 transform(HEAD source) === on-disk dist (minus sourceMappingURL line)', T(headSrc) === stripMapLine(distText), true);
// B2 the real build API (bundle:false etc.) on the working-tree file equals my transform of the same text.
const built = await esbuild.build({
    entryPoints: ['electron/knowledge/IntentClassifier.ts'], absWorkingDir: MAIN, bundle: false,
    outdir: path.join(HERE, 'out-never-written'), outbase: MAIN, platform: 'node', target: 'node20',
    format: 'cjs', sourcemap: true, jsx: 'automatic', loader: { '.ts': 'ts', '.js': 'js' }, logLevel: 'warning', write: false,
});
const builtJs = built.outputFiles.find((f) => f.path.endsWith('IntentClassifier.js')).text;
check('B2 build API(working tree) === transform(working tree) (minus sourceMappingURL line)', stripMapLine(builtJs) === T(wtSrc), true);
check('B3 r09Missing(predicted post-rebuild dist)', r09Missing(builtJs), null);
check('B4 r09Missing(on-disk dist, old build)', r09Missing(distText), BARE);
check('B5 on-disk dist untouched by this probe (mtime)', fs.statSync(distPath).mtimeMs === distBefore, true);
check('B6 out-never-written folder absent', fs.existsSync(path.join(HERE, 'out-never-written')), false);
const lines = builtJs.split('\n');
const i0 = lines.findIndex((l) => l.startsWith('const STRONG_NEGOTIATION'));
console.log('   predicted dist STRONG_NEGOTIATION block:\n   ' + lines.slice(i0, i0 + 24).join('\n   '));
console.log('   predicted dist lines containing "salary":', lines.filter((l) => l.includes('salary')).length, '| containing the veto call:', lines.filter((l) => l.includes('TECHNICAL_CONTEXT.some')).length);

console.log('\n=== C. does the TECHNICAL_CONTEXT veto (not covered by r09Missing) change any holdout40 classification? ===');
const typesMod = req(`${MAIN}\\dist-electron\\electron\\knowledge\\types.js`);
const load = (code) => {
    const module = { exports: {} };
    new Function('module', 'exports', 'require', code)(module, module.exports, (id) => {
        if (id === './types') return typesMod;
        throw new Error('unexpected require ' + id);
    });
    return module.exports;
};
const VETO = ' && !TECHNICAL_CONTEXT.some(kw => hasWord(lower, kw))';
const phraseOnlySrc = wtSrc.replace(VETO, '');
check('C0 veto clause found and removed for the phrase-only variant', phraseOnlySrc !== wtSrc, true);
check('C0b phrase-only variant still passes r09Missing (the guard would PASS it)', r09Missing(T(phraseOnlySrc)), null);
const V = { head: load(T(headSrc)), phraseOnly: load(T(phraseOnlySrc)), workingTree: load(T(wtSrc)) };
const H = await import(pathToFileURL(`${MAIN}\\electron\\test\\golden\\holdout40.questions.mjs`).href);
const items = H.HOLDOUT40;
console.log(`   holdout40 items: ${items.length} (spoken ${H.SPOKEN.length})`);
for (const [name, mod] of Object.entries(V)) {
    const neg = items.filter((x) => mod.classifyIntent(x.q) === typesMod.IntentType.NEGOTIATION).map((x) => x.id);
    console.log(`   ${name}: NEGOTIATION = ${JSON.stringify(neg)}`);
}
const vetoMatters = items.filter((x) => V.phraseOnly.classifyIntent(x.q) !== V.workingTree.classifyIntent(x.q)).map((x) => x.id);
check('C1 holdout40 items classified differently with vs without the veto', JSON.stringify(vetoMatters), '[]');
const r09 = items.find((x) => x.id === 'R09');
console.log(`   R09: head=${V.head.classifyIntent(r09.q)} phraseOnly=${V.phraseOnly.classifyIntent(r09.q)} workingTree=${V.workingTree.classifyIntent(r09.q)}`);

console.log(`\n${diffs === 0 ? 'ALL AS PREDICTED' : diffs + ' DIFFER FROM PREDICTION'}`);
