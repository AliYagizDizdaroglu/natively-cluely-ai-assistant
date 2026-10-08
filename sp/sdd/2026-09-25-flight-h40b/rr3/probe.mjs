// Throwaway re-review 3 probe (read-only against MAIN). Reuses re-review 2's loader
// (esbuild.transformSync of MAIN's real IntentClassifier.ts) and adds:
//  A. package integrity: HEAD + review-task1-fix3.diff == MAIN's working files, byte for byte;
//     HEAD + review-task1-fix2.diff == the state re-review 2 approved (written out for a diff -u)
//  B. the 12 tests replicated (strings checked verbatim against the test file), calibrated
//  C. list / comment / test-title checks against the ruling
//  D. mutations of the four new terms
//  E. hasWord on the new terms' neighbours
//  F. round 2 -> round 3 classification differences over rosters + test strings + every heard line
//  G. monotonicity against HEAD, plausible negotiation speech, report-claim checks, guard predicate
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const SDD = SP + '/sdd/2026-09-25-flight-h40b';
const RR3 = SDD + '/rr3';
const require = createRequire(MAIN + '/package.json');
const esbuild = require('esbuild');
const rd = (p) => readFileSync(p, 'utf8');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const FILES = { ts: 'electron/knowledge/IntentClassifier.ts', test: 'electron/knowledge/IntentClassifier.test.ts' };
const WORK = { ts: rd(`${MAIN}/${FILES.ts}`), test: rd(`${MAIN}/${FILES.test}`) };
const HEAD = { ts: rd(RR3 + '/head.ts'), test: rd(RR3 + '/head.test.ts') };

// ---------------- A. package integrity ----------------
function parsePackage(text) {
    const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
    const start = lines.findIndex((l) => l.startsWith('diff --git '));
    if (start < 0) throw new Error('no diff in package');
    const files = {};
    let cur = null, h = null;
    const done = () => h && h.o === h.b && h.n === h.d;
    for (const l of lines.slice(start)) {
        let m;
        if ((m = l.match(/^diff --git a\/(\S+) b\/(\S+)$/))) { cur = files[m[2]] = []; h = null; continue; }
        if ((m = l.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/))) {
            h = { a: +m[1], b: m[2] === undefined ? 1 : +m[2], c: +m[3], d: m[4] === undefined ? 1 : +m[4], body: [], o: 0, n: 0 };
            cur.push(h); continue;
        }
        if (!h || done()) continue; // file headers, or text after a complete hunk
        if (l.startsWith('\\')) throw new Error('no-newline marker not handled');
        const line = l === '' ? ' ' : l; // an empty context line whose leading space was lost
        if (!/^[ +-]/.test(line)) throw new Error('unexpected hunk line: ' + JSON.stringify(l));
        h.body.push(line);
        if (line[0] !== '+') h.o++;
        if (line[0] !== '-') h.n++;
    }
    for (const [f, hs] of Object.entries(files)) for (const x of hs) if (!(x.o === x.b && x.n === x.d)) throw new Error(`incomplete hunk in ${f} @${x.a}`);
    return files;
}
function apply(src, hunks) {
    if (src.includes('\r')) throw new Error('expected LF-only source (eol.mjs measured LF on all four files)');
    const lines = src.split('\n');
    let offset = 0;
    for (const h of hunks) {
        const oldL = h.body.filter((l) => l[0] !== '+').map((l) => l.slice(1));
        const newL = h.body.filter((l) => l[0] !== '-').map((l) => l.slice(1));
        const at = h.a - 1 + offset;
        if (!eq(lines.slice(at, at + h.b), oldL)) throw new Error(`hunk @${h.a} does not apply`);
        lines.splice(at, h.b, ...newL);
        offset += h.d - h.b;
    }
    return lines.join('\n');
}
const PKG3 = parsePackage(rd(SDD + '/review-task1-fix3.diff'));
const PKG2 = parsePackage(rd(SDD + '/review-task1-fix2.diff'));
console.log('== A. package integrity ==');
for (const k of ['ts', 'test']) {
    const rebuilt = apply(HEAD[k], PKG3[FILES[k]]);
    console.log(`HEAD + fix3 package == MAIN ${k}:`, rebuilt === WORK[k], ` (bytes ${Buffer.byteLength(rebuilt)} vs ${Buffer.byteLength(WORK[k])})`);
    console.log(`  MAIN ${k}: trailing-ws lines: ${WORK[k].split('\n').filter((l) => /[ \t]+$/.test(l)).length}, tab lines: ${WORK[k].split('\n').filter((l) => l.includes('\t')).length}`);
}
// Calibrate the integrity check: a one-character change in the working copy must read false.
console.log('calibration (altered working ts) equal:', apply(HEAD.ts, PKG3[FILES.ts]) === WORK.ts.replace("'mysql'", "'mysq1'"));
const R2 = { ts: apply(HEAD.ts, PKG2[FILES.ts]), test: apply(HEAD.test, PKG2[FILES.test]) };
writeFileSync(RR3 + '/round2.ts', R2.ts);
writeFileSync(RR3 + '/round2.test.ts', R2.test);
console.log('round-2 state reconstructed from HEAD + fix2 package -> rr3/round2.ts, rr3/round2.test.ts');

// ---------------- B. loader + tests ----------------
const TYPES_SRC = rd(MAIN + '/electron/knowledge/types.ts');
const enumBody = TYPES_SRC.match(/export enum IntentType \{([^}]*)\}/);
if (!enumBody) throw new Error('IntentType enum not found');
const IntentType = Object.fromEntries([...enumBody[1].matchAll(/(\w+)\s*=\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
if (Object.keys(IntentType).length !== 6) throw new Error('expected 6 IntentType members');
globalThis.__IT = IntentType;
const IMPORT_LINE = "import { IntentType } from './types';";
function load(src) {
    if (!src.includes(IMPORT_LINE)) throw new Error('import line not found');
    const code = esbuild.transformSync(src.replace(IMPORT_LINE, 'const IntentType = globalThis.__IT;'), { loader: 'ts', format: 'cjs' }).code;
    const module = { exports: {} };
    new Function('module', 'exports', 'require', code)(module, module.exports, require);
    return module.exports;
}
const TC_RE = /const TECHNICAL_CONTEXT = \[([\s\S]*?)\];/;
const termsOf = (src) => { const m = src.match(TC_RE); if (!m) throw new Error('TECHNICAL_CONTEXT not found'); return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]); };
const withTerms = (src, t) => src.replace(TC_RE, `const TECHNICAL_CONTEXT = [${t.map((x) => `'${x}'`).join(', ')}];`);

const { INTERVIEW } = await import(pathToFileURL(MAIN + '/electron/test/golden/interview60.questions.mjs').href);
const { SPOKEN: HOLDOUT } = await import(pathToFileURL(MAIN + '/electron/test/golden/holdout40.questions.mjs').href);
const S50 = (await import(pathToFileURL(MAIN + '/electron/test/golden/scenario50.questions.mjs').href)).SPOKEN ?? [];
const I60 = INTERVIEW.filter((i) => i.kind !== 'screenshot');

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
    ['idiom', 'is', [
        'A signing bonus is also on the table if that helps you decide.',
        'What salary would it take for you to join us?',
        'Is equity on the table for you, or would you rather have a higher base?',
    ]],
    ['plural', 'not', [
        "Write queries that return each department's salary range.",
        "Given the employees and departments tables, return each department's salary range.",
        'Use window functions to rank employees by base salary within each department.',
    ]],
    ['SPELLINGS (new)', 'not', [
        "Give me the sequel for each department's salary range.",
        "Using Postgres, return each department's salary range.",
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
    if (!WORK.test.includes(lit)) throw new Error('probe drifted from the test file: ' + q);
}
const itCount = (WORK.test.match(/^\s+it\(/gm) || []).length;
if (itCount !== TESTS.length) throw new Error(`test file has ${itCount} it() blocks, probe replicates ${TESTS.length}`);
const run = (c) => TESTS.filter((t) => !(typeof t[1] === 'function' ? t[1](c) : t[2].every((q) => (t[1] === 'is' ? c(q) === N : c(q) !== N)))).map((t) => t[0]);

const cur = load(WORK.ts), r2 = load(R2.ts), head = load(HEAD.ts);
const R1_TERMS = ['sql', 'query', 'table', 'database', 'schema', 'join', 'function', 'algorithm', 'regression', 'pipeline', 'dataset', 'column', 'implement', 'code'];
const r1 = load(withTerms(WORK.ts, R1_TERMS));
console.log('\n== B. calibration (it() blocks in file: ' + itCount + ') ==');
console.log('current source -> failing:', JSON.stringify(run(cur.classifyIntent)), '(vitest should say 12/12)');
console.log('round-2 source -> failing:', JSON.stringify(run(r2.classifyIntent)), '(implementer RED: 1 failed / 11 passed, the new test)');
console.log('HEAD 08dcb8f   -> failing:', JSON.stringify(run(head.classifyIntent)));

// ---------------- C. list / comment / test title ----------------
console.log('\n== C. ruling checks ==');
const RULED25 = ['sql', 'sequel', 'postgresql', 'postgres', 'mysql', 'query', 'queries', 'tables', 'database', 'databases', 'schema', 'schemas', 'column', 'columns', 'function', 'functions', 'algorithm', 'algorithms', 'regression', 'pipeline', 'pipelines', 'dataset', 'datasets', 'implement', 'code'];
const NEW4 = ['sequel', 'postgresql', 'postgres', 'mysql'];
const t3 = termsOf(WORK.ts), t2 = termsOf(R2.ts);
console.log('list count', t3.length, '== ruled 25 in order:', eq(t3, RULED25));
console.log('calibration (two ruled terms swapped) equal:', eq(t3, [RULED25[0], RULED25[2], RULED25[1], ...RULED25.slice(3)]));
console.log('round-2 list count', t2.length, '; current minus the 4 new == round-2 list:', eq(t3.filter((x) => !NEW4.includes(x)), t2), '; new 4 at index 1-4:', eq(t3.slice(1, 5), NEW4));
console.log('duplicates:', t3.length - new Set(t3).size, '; any non-lowercase term:', t3.some((x) => x !== x.toLowerCase()), '; any non [a-z] term:', t3.filter((x) => !/^[a-z]+$/.test(x)));
const L = WORK.ts.split('\n');
const i = L.findIndex((l) => l.startsWith('const TECHNICAL_CONTEXT'));
let j = i - 1; while (j >= 0 && L[j].startsWith('//')) j--;
const cl = L.slice(j + 1, i);
const RULING2 = 'A marker vetoes NEGOTIATION. On 2026-09-24 (h40a R09) "the SQL for the second highest salary in each department" went to the negotiation coaching card, and the phrase list alone still sends "write a query that returns the salary range" there. A technical question wrongly sent to the card is unspeakable; a negotiation question wrongly vetoed gets an ordinary answer without the salary block. "table" and "join" are not markers: "on the table" and "join us" are negotiation idioms.';
const NEWSENT = '"sequel", "postgres" and "mysql" are how the transcript spells SQL.';
const joined = cl.map((l) => l.replace(/^\/\/ ?/, '')).join(' ');
console.log('comment lines', cl.length, '; joined == round-2 ruling + new sentence:', joined === RULING2 + ' ' + NEWSENT, '; last line == "// " + sentence:', cl[cl.length - 1] === '// ' + NEWSENT);
console.log('calibration (period dropped) equal:', joined === RULING2 + ' ' + NEWSENT.replace('SQL.', 'SQL'));
const L2 = R2.ts.split('\n'); const i2 = L2.findIndex((l) => l.startsWith('const TECHNICAL_CONTEXT'));
let j2 = i2 - 1; while (j2 >= 0 && L2[j2].startsWith('//')) j2--;
console.log('round-2 comment lines unchanged (first 6 of 7):', eq(L2.slice(j2 + 1, i2), cl.slice(0, -1)));
console.log('line widths:', L.slice(j + 1, i + 5).map((l, k) => `${j + 2 + k}:${l.length}`).join(' '));
const TITLE = String.raw`    it('the transcript\'s spellings of SQL are markers too ("sequel", "Postgres")', () => {`;
console.log('new test title line verbatim present:', WORK.test.split('\n').includes(TITLE));
const titles = [...WORK.test.matchAll(/^\s+it\((['"])((?:\\.|(?!\1).)*)\1/gm)].map((m) => m[2]);
const k = titles.findIndex((t) => t.startsWith('the transcript'));
console.log('placement: prev =', JSON.stringify(titles[k - 1]), '| next =', JSON.stringify(titles[k + 1]));

// ---------------- D. mutations ----------------
console.log('\n== D. mutations (current source) ==');
for (const t of NEW4) console.log(`-${t}`.padEnd(14), '-> failing:', JSON.stringify(run(load(withTerms(WORK.ts, t3.filter((x) => x !== t))).classifyIntent)));
console.log('-all 4 new'.padEnd(14), '-> failing:', JSON.stringify(run(load(withTerms(WORK.ts, t3.filter((x) => !NEW4.includes(x)))).classifyIntent)));
console.log('-sql'.padEnd(14), '-> failing:', JSON.stringify(run(load(withTerms(WORK.ts, t3.filter((x) => x !== 'sql'))).classifyIntent)));

// ---------------- E. hasWord on the new terms ----------------
console.log('\n== E. hasWord ==');
const probes = {
    sequel: ['sequel', 'sequels', "sequel's", 'my sequel', 'sequel server', 'no sequel', 'prequel', 'sequelize', 'sequel-based'],
    postgres: ['postgres', 'postgresql', "postgres's", 'postgres-backed', 'postgre sql', 'postgre', 'postgress'],
    postgresql: ['postgresql', "postgresql's", 'postgre sql', 'postgres sql'],
    mysql: ['mysql', "mysql's", 'my sql', 'my sequel', 'mysqldump'],
    sql: ['s q l', 's.q.l.', 'no sql', 'nosql', 'sql server', 'pl/sql', 't-sql', 'sqlite', 'postgre sql', 'my sql'],
};
for (const [term, samples] of Object.entries(probes)) console.log(term.padEnd(11), samples.map((s) => `${s}=${cur.hasWord(s, term) ? 'Y' : 'n'}`).join('  '));

// ---------------- F. round 2 -> round 3 over a corpus ----------------
console.log('\n== F. corpus ==');
const heard = [];
const PASSES = MAIN + '/electron/test/golden/passes';
for (const f of readdirSync(PASSES).filter((x) => x.endsWith('.md'))) {
    for (const m of rd(`${PASSES}/${f}`).matchAll(/^heard: "(.*)"\s*$/gm)) heard.push(m[1]);
}
const corpus = { roster: [...I60.map((x) => x.q), ...HOLDOUT.map((x) => x.q), ...S50.map((x) => x.q)], tests: [], heard };
for (const m of WORK.test.matchAll(/^\s+(['"])(.+?)\1,\r?$/gm)) corpus.tests.push(m[2]);
for (const m of WORK.test.matchAll(/classifyIntent\((['"])(.+?)\1\)/g)) corpus.tests.push(m[2]);
for (const [name, list] of Object.entries(corpus)) {
    const diff = list.filter((q) => r2.classifyIntent(q) !== cur.classifyIntent(q));
    const nonMono = list.filter((q) => { const c = cur.classifyIntent(q), h = head.classifyIntent(q); return (c === N && h !== N) || (h !== N && c !== h); });
    const withNew = list.filter((q) => NEW4.some((t) => cur.hasWord(q.toLowerCase(), t)));
    console.log(`${name.padEnd(7)} n=${String(list.length).padStart(4)}  r2->r3 changed: ${diff.length}  non-monotone vs HEAD: ${nonMono.length}  containing a new term: ${withNew.length}  NEGOTIATION now: ${list.filter((q) => cur.classifyIntent(q) === N).length}`);
    for (const q of diff) console.log('     changed', r2.classifyIntent(q), '->', cur.classifyIntent(q), JSON.stringify(q));
    for (const q of nonMono) console.log('     NON-MONOTONE', head.classifyIntent(q), '->', cur.classifyIntent(q), JSON.stringify(q));
}
console.log('heard lines carrying a strong phrase (current source):');
const strongList = [...WORK.ts.match(/const STRONG_NEGOTIATION = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
for (const q of heard) { const s = strongList.filter((t) => cur.hasWord(q.toLowerCase(), t)); if (s.length) console.log('    ', JSON.stringify(s), cur.classifyIntent(q), JSON.stringify(q)); }

// ---------------- G. targeted sentences ----------------
const show = (title, qs) => {
    console.log(`\n== ${title} ==   HEAD | r1 | r2 | r3`);
    for (const q of qs) console.log([head, r1, r2, cur].map((m) => m.classifyIntent(q).slice(0, 11).padEnd(11)).join(' '), q);
};
show('G1. the new test and M1 cases', [
    "Give me the sequel for each department's salary range.",
    "Using Postgres, return each department's salary range.",
    "Write PostgreSQL that returns each department's salary range.",
    "In MySQL, return each department's salary range.",
    "Using PostgreSQL, find employees whose base salary exceeds their manager's base salary.",
    "Write the sequel that returns each department's salary range.",
    'Give me the sequel for the second highest salary in each department. Say it out ',
]);
show('G2. plausible negotiation speech carrying a new term (stack-naming) and English "sequel"', [
    'What are your salary expectations for this senior Postgres role?',
    'This is a MySQL DBA position, so what salary range are you targeting?',
    "For a sequel developer role, what's your expected salary?",
    "For a SQL developer role, what's your expected salary?",
    'As a sequel to our last call, here is our salary offer.',
    'Is the compensation negotiable?',
]);
show('G3. the corrected round-2 sentence (report claims)', [
    "Given the employee table, return each department's salary range.",
    "From the employees table, compute each employee's base salary plus bonus.",
    "Join employees to departments and return each department's salary range.",
    'Design a table for equity trades.',
]);
show('G4. residual spoken forms round 3 does not cover', [
    "Write S Q L that returns each department's salary range.",
    "In SQLite, return each department's salary range.",
    "In BigQuery, return each department's salary range.",
    "Write two sequels that return each department's salary range.",
]);

// ---------------- H. Task 2 guard predicate on this source ----------------
const { r09Missing } = await import(pathToFileURL(SP + '/guard-r09.mjs').href);
console.log('\n== H. guard-r09 r09Missing ==');
console.log('current source:', JSON.stringify(r09Missing(WORK.ts)), '| round-2 source:', JSON.stringify(r09Missing(R2.ts)), '| HEAD (must fail):', JSON.stringify(r09Missing(HEAD.ts)));
