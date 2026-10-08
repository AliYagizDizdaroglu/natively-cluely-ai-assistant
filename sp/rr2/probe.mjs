// Throwaway re-review probe (read-only against MAIN). Loads MAIN's real IntentClassifier.ts
// through esbuild's transform, then (a) calibrates against the vitest result, (b) mutates
// TECHNICAL_CONTEXT in memory to see which tests pin which markers, (c) prints where each new
// test question lands, (d) probes hasWord on inflections / compounds.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RR2 = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/rr2';
const require = createRequire(MAIN + '/package.json');
const esbuild = require('esbuild');

const SRC = readFileSync(MAIN + '/electron/knowledge/IntentClassifier.ts', 'utf8');
const HEAD_SRC = readFileSync(RR2 + '/head.IntentClassifier.ts', 'utf8');
const TEST_SRC = readFileSync(MAIN + '/electron/knowledge/IntentClassifier.test.ts', 'utf8');
const TYPES_SRC = readFileSync(MAIN + '/electron/knowledge/types.ts', 'utf8');

// IntentType values read from types.ts itself (fail loudly if the shape changed).
const enumBody = TYPES_SRC.match(/export enum IntentType \{([^}]*)\}/);
if (!enumBody) throw new Error('IntentType enum not found in types.ts');
const IntentType = Object.fromEntries([...enumBody[1].matchAll(/(\w+)\s*=\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
if (Object.keys(IntentType).length !== 6) throw new Error('expected 6 IntentType members, got ' + JSON.stringify(IntentType));

const IMPORT_LINE = "import { IntentType } from './types';";
function load(src) {
    if (!src.includes(IMPORT_LINE)) throw new Error('import line not found');
    const code = esbuild.transformSync(src.replace(IMPORT_LINE, 'const IntentType = globalThis.__IT;'), { loader: 'ts', format: 'cjs' }).code;
    globalThis.__IT = IntentType;
    const module = { exports: {} };
    new Function('module', 'exports', 'require', code)(module, module.exports, require);
    return module.exports;
}

const TC_RE = /const TECHNICAL_CONTEXT = \[([\s\S]*?)\];/;
function currentTerms(src) {
    const m = src.match(TC_RE);
    if (!m) throw new Error('TECHNICAL_CONTEXT not found');
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
function withTerms(src, terms) {
    if (!TC_RE.test(src)) throw new Error('TECHNICAL_CONTEXT not found');
    return src.replace(TC_RE, `const TECHNICAL_CONTEXT = [${terms.map((t) => `'${t}'`).join(', ')}];`);
}

// Rosters.
const { INTERVIEW } = await import(pathToFileURL(MAIN + '/electron/test/golden/interview60.questions.mjs').href);
const { SPOKEN: HOLDOUT } = await import(pathToFileURL(MAIN + '/electron/test/golden/holdout40.questions.mjs').href);
let S50 = [];
try { S50 = (await import(pathToFileURL(MAIN + '/electron/test/golden/scenario50.questions.mjs').href)).SPOKEN ?? []; } catch (e) { console.log('scenario50 import failed:', e.message); }
const I60 = INTERVIEW.filter((i) => i.kind !== 'screenshot');

// The test file's assertions, replicated; every string is checked to appear verbatim in the test file.
const N = IntentType.NEGOTIATION;
const TESTS = [
    ['76 spoken interview', (c) => I60.length === 76 && I60.filter((i) => c(i.q) === N).length === 0],
    ['holdout 45', (c) => HOLDOUT.length === 45 && HOLDOUT.filter((i) => c(i.q) === N).length === 0],
    ['R09 technical', (c) => c('Give me the SQL for the second highest salary in each department.') === IntentType.TECHNICAL],
    ['marker beats pay', 'not', [
        'For each department, write a query that returns the salary range: the minimum and the maximum salary.',
        'Write a SQL query that joins each employee to the pay grade whose salary range contains their salary.',
        "Compute each employee's total pay in SQL as base salary plus bonus.",
        'Train a regression model that predicts expected salary from years of experience.',
        'Write a query that computes total compensation per department.',
        'Design a pipeline that ingests equity trades from three exchanges.',
    ]],
    ['pay w/o marker', 'is', ["What's your expected salary?", 'What is your salary range for this level?', 'Is the compensation package negotiable?']],
    ['IDIOM (new)', 'is', [
        'A signing bonus is also on the table if that helps you decide.',
        'What salary would it take for you to join us?',
        'Is equity on the table for you, or would you rather have a higher base?',
    ]],
    ['PLURAL (new)', 'not', [
        "Write queries that return each department's salary range.",
        "Given the employees and departments tables, return each department's salary range.",
        'Use window functions to rank employees by base salary within each department.',
    ]],
    ['real negotiation', 'is', [
        'What are your salary expectations for this role?',
        'We can offer 140k base plus equity — how does that sound?',
        'Is the compensation package negotiable?',
        'What signing bonus would make this work for you?',
    ]],
    ['weak words', 'not', [
        'What do you expect the base image to contain?',
        'How would you reduce the payload size of the request?',
        'What is the requirement for the range of a counter in this stock system?',
    ]],
    ['whole words', (c) => c('How do you scale the database?') === IntentType.TECHNICAL],
    ['other categories', (c) => c('Tell me about yourself.') === IntentType.INTRO && c('What is the company culture like?') === IntentType.COMPANY_RESEARCH
        && c('Walk me through your projects.') === IntentType.PROFILE_DETAIL && c('Explain the algorithm complexity.') === IntentType.TECHNICAL && c('Good morning.') === IntentType.GENERAL],
];
for (const t of TESTS) if (Array.isArray(t[2])) for (const q of t[2]) {
    const lit = q.includes("'") ? `"${q}"` : `'${q}'`;
    if (!TEST_SRC.includes(lit)) throw new Error('probe drifted from the test file: ' + q);
}
function run(c) {
    const failed = [];
    for (const t of TESTS) {
        let ok;
        if (typeof t[1] === 'function') ok = t[1](c);
        else ok = t[2].every((q) => (t[1] === 'is' ? c(q) === N : c(q) !== N));
        if (!ok) failed.push(t[0]);
    }
    return failed;
}

const cur = load(SRC);
const terms = currentTerms(SRC);
console.log('TECHNICAL_CONTEXT count', terms.length, JSON.stringify(terms));
const RULING = ['sql', 'query', 'queries', 'tables', 'database', 'databases', 'schema', 'schemas', 'column', 'columns', 'function', 'functions', 'algorithm', 'algorithms', 'regression', 'pipeline', 'pipelines', 'dataset', 'datasets', 'implement', 'code'];
console.log('matches ruling list+order:', JSON.stringify(terms) === JSON.stringify(RULING));

console.log('\n== calibration ==');
console.log('current source  -> failing:', JSON.stringify(run(cur.classifyIntent)), '(vitest said 11/11 pass)');
console.log('HEAD 08dcb8f    -> failing:', JSON.stringify(run(load(HEAD_SRC).classifyIntent)));
const ROUND1 = ['sql', 'query', 'table', 'database', 'schema', 'join', 'function', 'algorithm', 'regression', 'pipeline', 'dataset', 'column', 'implement', 'code'];
console.log('round-1 list    -> failing:', JSON.stringify(run(load(withTerms(SRC, ROUND1)).classifyIntent)), '(implementer RED: idiom + plural)');

console.log('\n== mutations ==');
for (const add of ['table', 'join']) console.log(`+${add}`.padEnd(14), '-> failing:', JSON.stringify(run(load(withTerms(SRC, [...terms, add])).classifyIntent)));
for (const t of terms) console.log(`-${t}`.padEnd(14), '-> failing:', JSON.stringify(run(load(withTerms(SRC, terms.filter((x) => x !== t))).classifyIntent)));
const PLURALS = ['queries', 'tables', 'databases', 'schemas', 'columns', 'functions', 'algorithms', 'pipelines', 'datasets'];
console.log('-all 9 plurals'.padEnd(14), '-> failing:', JSON.stringify(run(load(withTerms(SRC, terms.filter((x) => !PLURALS.includes(x)))).classifyIntent)));
console.log('empty list'.padEnd(14), '-> failing:', JSON.stringify(run(load(withTerms(SRC, [])).classifyIntent)));

console.log('\n== where the six new questions land (current source) ==');
for (const t of TESTS.filter((x) => /new/.test(x[0]))) for (const q of t[2]) console.log(cur.classifyIntent(q).padEnd(17), q);

console.log('\n== roster questions that carry a strong term (current source) ==');
const strongList = [...SRC.match(/const STRONG_NEGOTIATION = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
for (const [name, list] of [['interview60', I60], ['holdout40', HOLDOUT], ['scenario50', S50]]) {
    let n = 0;
    for (const i of list) {
        const l = i.q.toLowerCase();
        const s = strongList.filter((k) => cur.hasWord(l, k));
        const m = terms.filter((k) => cur.hasWord(l, k));
        if (s.length) { n++; console.log(name, i.id, 'strong', JSON.stringify(s), 'markers', JSON.stringify(m), '->', cur.classifyIntent(i.q)); }
    }
    console.log(name, 'size', list.length, 'with a strong term:', n, 'NEGOTIATION:', list.filter((i) => cur.classifyIntent(i.q) === N).length);
}

console.log('\n== hasWord on compounds / inflections ==');
const probes = {
    sql: ['mysql', 'nosql', 'postgresql', 'sqlite', 't-sql', 'pl/sql', "sql's", 'sql server', 'spark sql', 'sparksql', 'sequel'],
    code: ['coding', 'codebase', 'source-code', 'zip code', 'unicode', 'coded', 'codes'],
    implement: ['implementation', 'implemented', 'implementing', 'implements'],
    query: ['subquery', 'querying', 'queried', 'sub-query'],
    queries: ['subqueries', 'any queries'],
    dataset: ['data set', 'data-set'],
    regression: ['regressions'],
    function: ['functional', 'job function', 'cross-functional'],
    functions: ['across functions'],
    pipeline: ['in the pipeline', 'candidate pipeline'],
    tables: ['turn the tables', 'the tables have turned'],
    column: ['in the plus column', 'columnar'],
};
for (const [term, samples] of Object.entries(probes)) console.log(term.padEnd(11), samples.map((s) => `${s}=${cur.hasWord(s, term) ? 'Y' : 'n'}`).join('  '));

console.log('\n== plausible speech, current classification ==');
for (const q of [
    // negotiation speech that carries a marker (vetoed -> ordinary answer, no salary block)
    'Do you have any queries about the compensation package?',
    'Any queries regarding the salary range before we send the offer?',
    'Our salary range for this function is 90 to 110k — does that work for you?',
    'Salary bands are the same across functions, so what salary would work for you?',
    'We have other candidates in the pipeline, so what salary would it take?',
    'Our salary range is adjusted by zip code — where will you be based?',
    'We would implement a signing bonus if the base does not work for you.',
    'Equity goes in the plus column for this role — how does that sound?',
    // technical speech with a strong phrase and NO listed marker (still NEGOTIATION)
    "In MySQL, return each department's salary range.",
    "Using PostgreSQL, find employees whose base salary exceeds their manager's base salary.",
    "Write the sequel that returns each department's salary range.",
    "In this coding exercise, compute each employee's base salary plus bonus.",
    "Given the employee table, return each department's salary range.",
    "Join employees to departments and return each department's salary range.",
    "Using the data set of offers, what salary range does each level get?",
]) console.log(cur.classifyIntent(q).padEnd(17), q);
