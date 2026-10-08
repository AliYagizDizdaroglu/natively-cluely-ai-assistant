// Throwaway (scratchpad only, nothing under the worktree is written): differential fuzz of stripCueBlock.
// Claim under test: for every input and every chunking, the joined prose and the reported cues of stripCueBlock equal
// extractCues(whole) and the cues are reported exactly once, BEFORE the first prose piece is yielded.
// Calibration (rule 8): the same fuzz is run on the pre-change file from HEAD (must agree), and on the two brief
// mutants (must DISAGREE on some case, or this fuzz is too weak to mean anything).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const WT = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const SP = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\task1-impl\\fuzz';
const N = Number(process.argv[2] || 200000);
const SEED = Number(process.argv[3] || 12345);
fs.mkdirSync(SP, { recursive: true });

const FILE = 'electron/llm/verbalStreamFilter.ts';
const current = fs.readFileSync(path.join(WT, FILE), 'utf8');
const headBytes = execFileSync('git', ['show', 'HEAD:' + FILE], { cwd: WT, maxBuffer: 64 * 1024 * 1024 });
fs.writeFileSync(path.join(SP, 'old.mts'), headBytes);
fs.writeFileSync(path.join(SP, 'cur.mts'), current);
const mutate = (from, to) => {
    if (!current.includes(from)) throw new Error('mutation anchor missing: ' + from);
    return current.replace(from, to);
};
fs.writeFileSync(path.join(SP, 'mutA.mts'), mutate('const head = pending.trim();', 'const head = pending.trimStart();'));
fs.writeFileSync(path.join(SP, 'mutB.mts'), mutate('const CUE_LINE_PREFIX = /^\\d+\\s*(\\|\\s*.*)?$/;', 'const CUE_LINE_PREFIX = /^\\d+\\s*(\\|.*)?$/;'));

const load = (n) => import(pathToFileURL(path.join(SP, n + '.mts')).href);
const mods = { old: await load('old'), cur: await load('cur'), mutA: await load('mutA'), mutB: await load('mutB') };
const extractCues = mods.old.extractCues;   // unchanged by the task; the reference

// mulberry32, seeded: the same cases every run
function rngFrom(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const TOK = ['\n', '\n', '\n', '\r\n', '\r\n', '\r', ' ', ' ', '  ', '\t', '\u2028', '\u2029', '|', '|', '0', '1', '2', '12', '10', '3', '2024', '.', '-', '"', "'", '`', 'a', 'b', 'x',
    'Ten', ' million', ' vectors', ' | ', '__CUES__', '__CU', 'ES__', '1| a\n', '2| b\n', '1|', '2| Spa', '2|\rb\n', '2|\rb', '\n1| x\n', '3|  "q"\n', '1 | y\n', '1|\u2028z\n'];
function gen(rng) {
    let s = '';
    const r = rng();
    if (r < 0.80) s += ['', '', '\n', '  ', '\r\n', '\t'][Math.floor(rng() * 6)] + '__CUES__';
    else if (r < 0.88) s += '__CU';
    const n = Math.floor(rng() * 40);
    for (let i = 0; i < n; i++) s += TOK[Math.floor(rng() * TOK.length)];
    return s;
}
function chunk(rng, s) {
    const mode = Math.floor(rng() * 5);
    if (mode === 0) return s === '' ? [] : [s];
    const p = [1, 0.1, 0.3, 0.6][mode - 1];   // mode 1 = one char per chunk
    const out = []; let cur = '';
    for (const ch of s) { cur += ch; if (rng() < p) { out.push(cur); cur = ''; } }
    if (cur) out.push(cur);
    return out;
}

async function run(mod, chunks) {
    const events = []; const out = [];
    async function* src() { for (const c of chunks) yield c; }
    for await (const piece of mod.stripCueBlock(src(), (x) => events.push({ report: x }))) { out.push(piece); events.push({ yielded: piece }); }
    return { prose: out.join(''), events };
}
const eqArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

async function check(mod, text, chunks) {
    const want = extractCues(text);
    const { prose, events } = await run(mod, chunks);
    const reports = events.filter((e) => 'report' in e);
    if (reports.length !== 1) return 'reports=' + reports.length;
    if (!eqArr(reports[0].report, want.cues)) return 'cues differ: got ' + JSON.stringify(reports[0].report) + ' want ' + JSON.stringify(want.cues);
    if (prose !== want.prose) return 'prose differs: got ' + JSON.stringify(prose) + ' want ' + JSON.stringify(want.prose);
    const firstYield = events.findIndex((e) => 'yielded' in e);
    const reportAt = events.findIndex((e) => 'report' in e);
    if (firstYield !== -1 && reportAt > firstYield) return 'a prose piece was yielded before the report';
    return null;
}

const rng = rngFrom(SEED);
const stats = {}; const first = {};
for (const k of Object.keys(mods)) { stats[k] = 0; first[k] = []; }
let cases = 0, withBlock = 0, closedEarly = 0;
for (let i = 0; i < N; i++) {
    const text = gen(rng);
    const chunks = chunk(rng, text);
    cases++;
    if (/^\s*__CUES__/.test(text)) withBlock++;
    for (const k of Object.keys(mods)) {
        const why = await check(mods[k], text, chunks);
        if (why) { stats[k]++; if (first[k].length < 2) first[k].push({ text, chunks, why }); }
    }
}
console.log(JSON.stringify({ cases, withBlock, seed: SEED }));
for (const k of Object.keys(mods)) {
    console.log(k.padEnd(5) + ' mismatches vs extractCues: ' + stats[k]);
    for (const f of first[k]) console.log('   e.g. ' + JSON.stringify(f.chunks) + '  ->  ' + f.why);
}
// the new parser (and the old one) must agree; the mutants must not
const ok = stats.cur === 0 && stats.old === 0 && stats.mutA > 0 && stats.mutB > 0;
console.log(ok ? 'FUZZ CALIBRATED AND CLEAN: cur=0, old=0, mutA>0, mutB>0' : 'FUZZ RESULT NOT AS EXPECTED (see counts)');
process.exit(ok ? 0 : 2);
