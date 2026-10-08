// Old-vs-new replay of the saved raw replies (spikes 1-6 + the repro; 624 with text) through the app's filter chain
// (stripCueBlock -> filterCodeFences -> filterVerbalLines -> stripSuggestionBlock -> stripSpokenNotation), OLD = HEAD eed4d7d's
// filter, NEW = HEAD + the notation-chunking fix, both built to scratch. Prints ids, counts and short diffs, never a full reply.
//   node replay.mjs [--calibrate]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CG = path.join(HERE, '..', 'cue-group');
const require = createRequire(import.meta.url);
const OLD = require(path.join(HERE, 'build/old/verbalStreamFilter.cjs'));
const NEW = require(path.join(HERE, 'build/new/verbalStreamFilter.cjs'));
const SIZES = [1, 2, 3, 7, 90, 1e6];
const WHOLE = 1e6;
const J = JSON.stringify;
const cut = (text, size) => { const o = []; for (let i = 0; i < text.length; i += size) o.push(text.slice(i, i + size)); return o; };
const agen = (chunks) => (async function* () { for (const c of chunks) yield c; })();

async function chain(F, raw, size) {
    let cues = null, offers = null, out = '';
    const warn = console.warn; console.warn = () => {};
    try {
        const gen = F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(F.filterCodeFences(F.stripCueBlock(agen(cut(raw, size)), (c) => { cues = c; }))), (o) => { offers = o; }));
        for await (const p of gen) out += p;
    } finally { console.warn = warn; }
    return { out, cues: J(cues), offers: J((offers ?? []).map((o) => o.label)) };
}

function loadRows() {
    const files = fs.readdirSync(CG).filter((f) => /^(spike\d*|repro-blockonly)-.*\.json$/.test(f)).sort();
    const rows = [];
    for (const f of files) {
        const data = JSON.parse(fs.readFileSync(path.join(CG, f), 'utf8'));
        for (const x of (Array.isArray(data) ? data : Object.values(data)))
            if (typeof x?.raw === 'string' && x.raw.trim()) rows.push({ raw: x.raw, key: `${f.slice(0, 6)} ${x.arm ?? '-'} | ${x.model ?? '-'} ${x.id ?? '?'}#${x.rep ?? '?'}` });
    }
    return { rows, files };
}

/** First differing region of a and b, +-24 characters of context, as "...a-side => b-side...". */
function snip(a, b) {
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    let ea = a.length, eb = b.length; while (ea > i && eb > i && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    const c = (s, x, y) => s.slice(Math.max(0, x - 24), y + 24).replace(/\n/g, '\\n');
    return `${J(c(a, i, ea))} => ${J(c(b, i, eb))}`;
}

async function run(rows, oldF, newF) {
    const r = { total: rows.length, wholeDiffer: [], metaDiffer: [], oldBugs: {}, newBugs: {}, changed: [], sentinel: [] };
    for (const s of SIZES) { r.oldBugs[s] = 0; r.newBugs[s] = 0; }
    for (const row of rows) {
        const o = {}, n = {};
        for (const s of SIZES) { o[s] = await chain(oldF, row.raw, s); n[s] = await chain(newF, row.raw, s); }
        if (o[WHOLE].out !== n[WHOLE].out) r.wholeDiffer.push(`${row.key}: ${snip(o[WHOLE].out, n[WHOLE].out)}`);
        for (const s of SIZES) {
            if (o[s].cues !== n[s].cues || o[s].offers !== n[s].offers) r.metaDiffer.push(`${row.key} @${s}`);
            if (o[s].out !== o[WHOLE].out) r.oldBugs[s]++;
            if (n[s].out !== n[WHOLE].out) r.newBugs[s]++;
            if (o[s].out !== n[s].out) r.changed.push({ key: row.key, size: s, oldIsChunkBug: o[s].out !== o[WHOLE].out, newEqWhole: n[s].out === n[WHOLE].out, diff: snip(o[s].out, n[s].out) });
            if (/__MORE__|__CUES__/.test(n[s].out) && !/__MORE__|__CUES__/.test(o[s].out)) r.sentinel.push(`${row.key} @${s}`);
        }
    }
    return r;
}

function show(r, label) {
    console.log(`\n== ${label}: ${r.total} replies, sizes ${SIZES.map((s) => (s === WHOLE ? 'whole' : s)).join(',')}`);
    console.log(`whole-string output differs old vs new: ${r.wholeDiffer.length}`);
    for (const x of r.wholeDiffer.slice(0, 20)) console.log(`   ${x}`);
    console.log(`cue or offers report differs: ${r.metaDiffer.length}; new sentinel leaks: ${r.sentinel.length}`);
    console.log(`replies whose chunked output differs from their own whole-string output, by size:`);
    console.log(`   OLD ${J(r.oldBugs)}`);
    console.log(`   NEW ${J(r.newBugs)}`);
    const byKey = new Map();
    for (const c of r.changed) { if (!byKey.has(c.key)) byKey.set(c.key, []); byKey.get(c.key).push(c); }
    console.log(`(reply, size) pairs where old output != new output: ${r.changed.length}, over ${byKey.size} replies`);
    for (const [k, v] of byKey) {
        console.log(`   ${k}: sizes ${v.map((c) => c.size).join(',')}; old was chunk-dependent at all of them: ${v.every((c) => c.oldIsChunkBug)}; new equals its whole at all of them: ${v.every((c) => c.newEqWhole)}`);
        console.log(`      e.g. @${v[0].size}: ${v[0].diff}`);
    }
}

const { rows, files } = loadRows();
console.log(`row files: ${files.length}; rows: ${rows.length}`);
if (process.argv.includes('--calibrate')) {
    // Known answer 1: OLD against OLD changes nothing. Known answer 2: the unfixed chunk bug IS visible in the harness: on a crafted
    // reply the OLD chain at size 1 differs from its own whole-string output, and the NEW chain does not.
    const same = await run(rows, OLD, OLD);
    console.log(`[cal 1] OLD vs OLD: changed pairs ${same.changed.length}, whole differ ${same.wholeDiffer.length} (expect 0, 0)`);
    const crafted = [{ key: 'crafted', raw: 'About $\\frac{3000}{9500}$ of it, and \\frac{a}{b} grows.' }];
    const c = await run(crafted, OLD, NEW);
    console.log(`[cal 2] crafted reply: OLD chunk-bug @1 ${c.oldBugs[1]}, NEW chunk-bug @1 ${c.newBugs[1]}, changed pairs ${c.changed.length} (expect 1, 0, >0)`);
    const ok = same.changed.length === 0 && same.wholeDiffer.length === 0 && c.oldBugs[1] === 1 && c.newBugs[1] === 0 && c.changed.length > 0;
    console.log(ok ? 'REPLAY CALIBRATION OK' : 'REPLAY CALIBRATION FAILED');
    process.exit(ok ? 0 : 1);
}
show(await run(rows, OLD, NEW), 'OLD (HEAD eed4d7d) vs NEW (+ fix)');
