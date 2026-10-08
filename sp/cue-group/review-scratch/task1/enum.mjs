// Reviewer's exhaustive check of stripCueBlock's early close (task 1), on type-stripped COPIES of the real file.
// Properties per run: (1) exactly one report, before the first yielded piece; (2) cues and joined prose equal
// extractCues(whole); (3) TIMING: the report fires on exactly the first chunk after which the answer is decided,
// computed by an oracle that never uses CUE_LINE_PREFIX (CUE_LINE + three trial completions).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const WT = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COPIES = path.join(HERE, 'copies');
fs.mkdirSync(COPIES, { recursive: true });

const newSrc = fs.readFileSync(path.join(WT, 'electron', 'llm', 'verbalStreamFilter.ts'), 'utf8');
const oldSrc = execFileSync('git', ['--no-optional-locks', '-C', WT, 'show', 'e49886ca8f77e3c94a5ebddd7e45c0c4519e3d40:electron/llm/verbalStreamFilter.ts']).toString('utf8');

const PREFIX_LINE = String.raw`const CUE_LINE_PREFIX = /^\d+\s*(\|\s*.*)?$/;`;
const mutate = (from, to) => { if (!newSrc.includes(from)) throw new Error('mutant anchor missing: ' + from); return newSrc.replace(from, to); };
const variants = {
    old: oldSrc,
    new: newSrc,
    'm-a trimStart': mutate('const head = pending.trim();', 'const head = pending.trimStart();'),
    'm-b (\\|.*)?': mutate(PREFIX_LINE, String.raw`const CUE_LINE_PREFIX = /^\d+\s*(\|.*)?$/;`),
    'm-c no \\s* before bar': mutate(PREFIX_LINE, String.raw`const CUE_LINE_PREFIX = /^\d+(\|\s*.*)?$/;`),
    'm-d yield head': mutate('yield pending;   // the partial line, intact', 'yield head;   // the partial line, intact'),
    'm-e no $': mutate(PREFIX_LINE, String.raw`const CUE_LINE_PREFIX = /^\d+\s*(\|\s*.*)?/;`),
};
const mods = {};
for (const [name, src] of Object.entries(variants)) {
    const file = path.join(COPIES, name.replace(/[^a-z0-9]+/gi, '_') + '.mts');
    fs.writeFileSync(file, src);
    mods[name] = await import(pathToFileURL(file).href);
}
const { extractCues } = mods.new;   // the reference (unchanged by the task; checked equal to old below)
if (mods.old.extractCues.toString() !== mods.new.extractCues.toString()) throw new Error('extractCues differs between old and new');

// ---- oracle: is the answer decided after this much text? (never uses CUE_LINE_PREFIX)
const CUE_LINE = /^(\d+)\s*\|\s*(.+)$/;
const SENT = '__CUES__';
const canComplete = (p) => p.trim() === '' || ['', 'a', '|a'].some((s) => CUE_LINE.test((p + s).trim()));
function decided(text, partialRule) {
    const lead = text.replace(/^\s+/, '');
    if (!lead.startsWith(SENT)) return !SENT.startsWith(lead);
    const lines = lead.slice(SENT.length).split('\n');
    const partial = lines.pop();
    for (const l of lines) {
        const t = l.trim();
        if (t === '' || CUE_LINE.test(t)) continue;
        return true;                        // a complete non-cue line closes the block
    }
    return partialRule && !canComplete(partial);
}
function expectedReportAt(chunks, partialRule) {
    let text = '';
    for (let k = 0; k < chunks.length; k++) { text += chunks[k]; if (decided(text, partialRule)) return k + 1; }
    return chunks.length;                   // end of stream: the flush reports after the last chunk
}

async function runOnce(mod, chunks) {
    let seen = 0, reportedAt = -1, calls = 0, cues = null, yieldedBeforeReport = false;
    async function* source() { for (const c of chunks) { seen++; yield c; } }
    const out = [];
    for await (const p of mod.stripCueBlock(source(), (x) => { cues = x; calls++; reportedAt = seen; })) {
        if (calls === 0) yieldedBeforeReport = true;
        out.push(p);
    }
    return { out, cues, calls, reportedAt, yieldedBeforeReport };
}

const ALPHA = ['1', '|', ' ', '\r', '\n', 'a', '\u2028'];
const HEADS = ['__CUES__\n1| a\n', '__CUES__'];
function* suffixes(maxLen) {
    yield '';
    let frontier = [''];
    for (let len = 1; len <= maxLen; len++) {
        const next = [];
        for (const s of frontier) for (const c of ALPHA) { next.push(s + c); }
        for (const s of next) yield s;
        frontier = next;
    }
}
const chunkings = (head, suf) => [
    { name: 'whole', chunks: [head + suf] },
    { name: 'head+chars', chunks: [head, ...suf] },
    { name: 'all chars', chunks: [...(head + suf)] },
];

async function sweep(name, maxLen, timing) {
    const mod = mods[name];
    const fails = { calls: 0, order: 0, cues: 0, prose: 0, timing: 0 };
    const examples = [];
    let runs = 0;
    for (const head of HEADS) for (const suf of suffixes(maxLen)) {
        const whole = head + suf;
        const ref = extractCues(whole);
        for (const { name: cn, chunks } of chunkings(head, suf)) {
            runs++;
            const r = await runOnce(mod, chunks);
            const bad = [];
            if (r.calls !== 1) { fails.calls++; bad.push('calls ' + r.calls); }
            if (r.yieldedBeforeReport) { fails.order++; bad.push('yield before report'); }
            if (JSON.stringify(r.cues) !== JSON.stringify(ref.cues)) { fails.cues++; bad.push(`cues ${JSON.stringify(r.cues)} want ${JSON.stringify(ref.cues)}`); }
            if (r.out.join('') !== ref.prose) { fails.prose++; bad.push(`prose ${JSON.stringify(r.out.join(''))} want ${JSON.stringify(ref.prose)}`); }
            if (timing) {
                const want = expectedReportAt(chunks, timing === 'early');
                if (r.reportedAt !== want) { fails.timing++; bad.push(`reportedAt ${r.reportedAt} want ${want}`); }
            }
            if (bad.length && examples.length < 3) examples.push(`${JSON.stringify(whole)} [${cn}]: ${bad.join('; ')}`);
        }
    }
    const total = Object.values(fails).reduce((a, b) => a + b, 0);
    console.log(`${name.padEnd(24)} maxLen ${maxLen}  runs ${String(runs).padStart(7)}  failures ${JSON.stringify(fails)}${total ? '' : '  CLEAN'}`);
    for (const e of examples) console.log('    e.g. ' + e);
}

const t0 = Date.now();
const MAX = Number(process.env.MAXLEN ?? 6);
await sweep('old', MAX, 'late');          // calibrates the oracle's line/prefix handling: old code = oracle without the partial rule
await sweep('new', MAX, 'early');         // the task: equality AND exact early timing
for (const m of ['m-a trimStart', 'm-b (\\|.*)?', 'm-c no \\s* before bar', 'm-d yield head', 'm-e no $']) await sweep(m, Math.min(MAX, 5), 'early');
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
