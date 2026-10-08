// Throwaway: is the change monotone against HEAD (current NEGOTIATION => HEAD NEGOTIATION; HEAD non-NEGOTIATION => same category)?
// And what does dropping 'table'/'join' cost against round 1?
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RR2 = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/rr2';
const require = createRequire(MAIN + '/package.json');
const esbuild = require('esbuild');
const IMPORT_LINE = "import { IntentType } from './types';";
globalThis.__IT = { TECHNICAL: 'technical', INTRO: 'intro', COMPANY_RESEARCH: 'company_research', NEGOTIATION: 'negotiation', PROFILE_DETAIL: 'profile_detail', GENERAL: 'general' };
function load(src) {
    if (!src.includes(IMPORT_LINE)) throw new Error('import line not found');
    const code = esbuild.transformSync(src.replace(IMPORT_LINE, 'const IntentType = globalThis.__IT;'), { loader: 'ts', format: 'cjs' }).code;
    const module = { exports: {} };
    new Function('module', 'exports', 'require', code)(module, module.exports, require);
    return module.exports.classifyIntent;
}
const SRC = readFileSync(MAIN + '/electron/knowledge/IntentClassifier.ts', 'utf8');
const cur = load(SRC);
const head = load(readFileSync(RR2 + '/head.IntentClassifier.ts', 'utf8'));
const TC_RE = /const TECHNICAL_CONTEXT = \[([\s\S]*?)\];/;
const r1 = load(SRC.replace(TC_RE, "const TECHNICAL_CONTEXT = ['sql', 'query', 'table', 'database', 'schema', 'join', 'function', 'algorithm', 'regression', 'pipeline', 'dataset', 'column', 'implement', 'code'];"));

const corpus = [];
for (const f of ['interview60', 'holdout40', 'scenario50']) {
    const m = await import(pathToFileURL(`${MAIN}/electron/test/golden/${f}.questions.mjs`).href);
    for (const i of m.SPOKEN ?? []) corpus.push(i.q);
}
const testSrc = readFileSync(MAIN + '/electron/knowledge/IntentClassifier.test.ts', 'utf8');
for (const m of testSrc.matchAll(/^\s+(['"])(.+?)\1,$/gm)) corpus.push(m[2]);
for (const m of testSrc.matchAll(/classifyIntent\((['"])(.+?)\1\)/g)) corpus.push(m[2]);
const extra = [
    "Given the employee table, return each department's salary range.",
    "From the employees table, compute each employee's base salary plus bonus.",
    "Join employees to departments and return each department's salary range.",
    'Design a table for equity trades.',
    "Let's talk salary.",
    'How much salary do you expect?',
    'Do you have any queries about the compensation package?',
];
corpus.push(...extra);
let bad = 0;
for (const q of corpus) {
    const c = cur(q), h = head(q);
    if ((c === 'negotiation' && h !== 'negotiation') || (h !== 'negotiation' && c !== h)) { bad++; console.log('NON-MONOTONE', h, '->', c, q); }
}
console.log('corpus', corpus.length, 'non-monotone vs HEAD:', bad);
console.log('changed vs HEAD (HEAD negotiation -> now other):');
for (const q of corpus) if (head(q) === 'negotiation' && cur(q) !== 'negotiation') console.log('  ', cur(q).padEnd(16), q);
console.log('round 1 -> round 2 differences:');
for (const q of corpus) if (r1(q) !== cur(q)) console.log('  ', r1(q).padEnd(12), '->', cur(q).padEnd(12), q);
