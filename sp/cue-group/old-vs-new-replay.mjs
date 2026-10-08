// After the build (runbook): every saved raw reply (spikes 1-6 and the repro; 624 with text) through the app's filter
// chain, once with the OLD built filter (a copy of e3fae5f's verbalStreamFilter.js, saved before the build) and once
// with the NEW dist's, at several chunk sizes. The two changes of this build make exact predictions:
//   - the offers fix: exactly the 9 offers-first replies change, each from 0 shown words to its spoken answer; the one
//     reply with no spoken answer stays empty; no reply that shows text with the OLD filter changes at all;
//   - the early close: no joined text, no cue report and no offers report changes (it only moves WHEN things happen).
// Anything else that differs is a finding, printed by id and shape. Prints ids, shapes, counts, cue lines and offer
// labels: never a reply's prose, never a prompt.
//   node old-vs-new-replay.mjs --new <path to the new verbalStreamFilter.js> [--old <path>] [--expect-changed 9]
//   node old-vs-new-replay.mjs --calibrate        the harness on two known answers (see the bottom of this file)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { shape } from './repro-blockonly.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn';
const OLD_PATH = arg('--old', path.join(HERE, 'old-dist/verbalStreamFilter.e3fae5f.cjs'));
const NEW_PATH = arg('--new', `${WT}/dist-electron/electron/llm/verbalStreamFilter.js`);
const words = (s) => (String(s).match(/\S+/g) ?? []).length;
const cut = (text, size) => { const o = []; for (let i = 0; i < text.length; i += size) o.push(text.slice(i, i + size)); return o; };
const agen = (chunks) => (async function* () { for (const c of chunks) yield c; })();
const J = JSON.stringify;

const LEAD_LOG = 'offers block before the spoken answer';   // the offers fix's log line and build marker (offers spec section 4)
/** The app's chain (WhatToAnswerLLM.ts `filtered`), with the raw reply fed in `size`-character chunks. Warnings the filters write are counted, not printed. */
export async function chain(F, raw, size) {
    let cues = null, cueCalls = 0, offers = null, offerCalls = 0, out = '', leadLogs = 0;
    const warn = console.warn;
    console.warn = (...a) => { if (a.some((x) => String(x).includes(LEAD_LOG))) leadLogs++; };
    try {
        const gen = F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(F.filterCodeFences(F.stripCueBlock(agen(cut(raw, size)), (c) => { cues = c; cueCalls++; }))), (o) => { offers = o; offerCalls++; }));
        for await (const p of gen) out += p;
    } finally { console.warn = warn; }
    return { out, cues, cueCalls, offers: (offers ?? []).map((o) => o.label), offerCalls, leadLogs };
}

export async function compare(OLD, NEW, rows, sizes = [1, 7, 90, 1e6]) {
    const r = { total: 0, changed: [], changedShownBefore: [], cuesDiffer: [], offersDiffer: [], callsBad: [], sizeDependent: [], emptyBoth: [], sentinelOut: [], sentinelBoth: [], leadLogged: [], leadLoggedOld: [] };
    for (const row of rows) {
        r.total++;
        let first = null;
        for (const size of sizes) {
            const a = await chain(OLD, row.raw, size), b = await chain(NEW, row.raw, size);
            const d = { textDiffers: a.out !== b.out, cuesDiffer: J(a.cues) !== J(b.cues), offersDiffer: J(a.offers) !== J(b.offers) };
            if (b.cueCalls !== 1 || b.offerCalls !== 1) r.callsBad.push(`${row.key} @${size}: cue reports ${b.cueCalls}, offers reports ${b.offerCalls}`);
            // A sentinel in the shown text. Known with the OLD filter: one saved reply closes its cue block with a second
            // `__CUES__` line, which is prose by the parser's rule and is shown. Only a NEW leak is a failure here.
            const leak = /__MORE__|__CUES__/;
            if (leak.test(b.out) && !leak.test(a.out)) r.sentinelOut.push(`${row.key} @${size}`);
            if (leak.test(a.out) && size === sizes[0]) r.sentinelBoth.push(row.key);
            if (b.leadLogs > 1) r.callsBad.push(`${row.key} @${size}: the offers-first line written ${b.leadLogs} times`);
            if (first == null) {
                first = { a, b, d };
                if (b.leadLogs) r.leadLogged.push(row.key);
                if (a.leadLogs) r.leadLoggedOld.push(row.key);
                if (d.cuesDiffer) r.cuesDiffer.push(`${row.key}: ${J(a.cues)} -> ${J(b.cues)}`);
                if (d.offersDiffer) r.offersDiffer.push(`${row.key}: ${J(a.offers)} -> ${J(b.offers)}`);
                if (d.textDiffers) {
                    const item = { key: row.key, before: words(a.out), after: words(b.out), shape: shape(row.raw).join(' '), offers: b.offers };
                    r.changed.push(item);
                    if (a.out.trim() !== '') r.changedShownBefore.push(item);
                } else if (a.out.trim() === '') r.emptyBoth.push({ key: row.key, shape: shape(row.raw).join(' ') });
            } else if (d.textDiffers !== first.d.textDiffers || b.out !== first.b.out && b.out.trim() !== first.b.out.trim()) r.sizeDependent.push(`${row.key} @${size}`);
        }
    }
    return r;
}

export function loadRows() {
    const files = fs.readdirSync(HERE).filter((f) => /^(spike\d*|repro-blockonly)-.*\.json$/.test(f)).sort();
    const rows = [];
    for (const f of files) {
        const data = JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
        for (const x of (Array.isArray(data) ? data : Object.values(data)))
            if (typeof x?.raw === 'string' && x.raw.trim()) rows.push({ raw: x.raw, key: `${f.slice(0, 6)} ${x.arm ?? '-'} | ${x.model ?? '-'} ${x.id ?? '?'}#${x.rep ?? '?'}` });
    }
    return { rows, files };
}

export function report(r, expectChanged, expectLogged = null) {
    console.log(`replies: ${r.total}`);
    // The offers fix writes one line per stream whose offers block leads: the changed replies and the one with offers and no answer.
    const loggedKeys = new Set(r.leadLogged), wantKeys = new Set([...r.changed.map((c) => c.key), ...r.emptyBoth.filter((e) => /\bMORE\b/.test(e.shape)).map((e) => e.key)]);
    const loggedAsWanted = expectLogged == null || (r.leadLogged.length === expectLogged && [...wantKeys].every((k) => loggedKeys.has(k)) && loggedKeys.size === wantKeys.size);
    console.log(`the NEW chain wrote the offers-first line for ${r.leadLogged.length} replies${expectLogged == null ? ' (not checked here)' : ` (expected ${expectLogged}: the changed replies and the one with offers and no spoken answer) -> ${loggedAsWanted ? 'as expected' : 'NOT as expected'}`}; the OLD chain for ${r.leadLoggedOld.length}`);
    console.log(`joined text differs: ${r.changed.length}; of those, replies that show text with the OLD filter: ${r.changedShownBefore.length}`);
    for (const c of r.changed) console.log(`   ${c.key}: shown words ${c.before} -> ${c.after}; offers ${J(c.offers)}\n      shape: ${c.shape}`);
    console.log(`empty with both filters (no spoken answer in the reply): ${r.emptyBoth.length}`);
    for (const e of r.emptyBoth) console.log(`   ${e.key}\n      shape: ${e.shape}`);
    console.log(`cue reports differ: ${r.cuesDiffer.length}; offers reports differ: ${r.offersDiffer.length}; a report not made exactly once: ${r.callsBad.length}; a sentinel in the NEW output that the OLD output does not have: ${r.sentinelOut.length}; a result that depends on the chunk size: ${r.sizeDependent.length}`);
    console.log(`a sentinel shown with the OLD filter too (known: a reply that closes its cue block with a second __CUES__ line): ${r.sentinelBoth.length}${r.sentinelBoth.length ? ` (${r.sentinelBoth.join('; ')})` : ''}`);
    for (const x of [...r.cuesDiffer, ...r.offersDiffer, ...r.callsBad, ...r.sentinelOut, ...r.sizeDependent].slice(0, 20)) console.log(`   ${x}`);
    const allFromEmpty = r.changed.every((c) => c.before === 0 && c.after > 0);
    const ok = r.changed.length === expectChanged && r.changedShownBefore.length === 0 && allFromEmpty && !r.cuesDiffer.length && !r.offersDiffer.length && !r.callsBad.length && !r.sentinelOut.length && !r.sizeDependent.length && loggedAsWanted && !r.leadLoggedOld.length;
    console.log(ok ? `REPLAY AS PREDICTED (${expectChanged} changed, each from nothing shown to its answer; nothing else moved)` : `REPLAY NOT AS PREDICTED (expected ${expectChanged} changed, each from 0 words)`);
    return ok;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'old-vs-new-replay.mjs') {
    const OLD = require(OLD_PATH);
    const { rows, files } = loadRows();
    console.log(`row files: ${files.length}; OLD ${path.basename(OLD_PATH)}`);
    if (process.argv.includes('--calibrate')) {
        // Known answer 1: OLD against itself changes nothing, and the 10 replies that show nothing are all "empty with both".
        console.log('\n[calibration 1] OLD against OLD: expect 0 changed, 10 empty with both');
        const same = await compare(OLD, OLD, rows);
        const ok1 = report(same, 0) && same.emptyBoth.length === 10;
        // Known answer 2: OLD against OLD with the spike's candidate in the offers stage: the spike counted 9 changed and 1 still empty.
        console.log('\n[calibration 2] OLD against OLD + the spike\'s candidate offers filter: expect 9 changed, 1 empty with both');
        const { stripCandidate } = await import('./offers-candidate.mjs');
        const cand = await compare(OLD, { ...OLD, stripSuggestionBlock: stripCandidate(OLD) }, rows);
        const ok2 = report(cand, 9, 10) && cand.emptyBoth.length === 1;   // the candidate writes the spec's line: 9 changed + the 1 with offers and no answer
        // Known answer 3: a NEW filter that loses a cue must be caught (a broken early close would look like this).
        console.log('\n[calibration 3] OLD against a filter that drops the last cue line: expect "NOT AS PREDICTED" with cue reports that differ');
        const broken = { ...OLD, stripCueBlock: (src, onCues) => OLD.stripCueBlock(src, (c) => onCues(c.slice(0, -1))) };
        const bad = await compare(OLD, broken, rows, [90]);
        const ok3 = !report(bad, 0) && bad.cuesDiffer.length > 0;
        // Known answer 4: a NEW filter that lets the offers block through must be caught as a new sentinel leak.
        console.log('\n[calibration 4] OLD against a filter whose offers stage passes everything through: expect "NOT AS PREDICTED" with new sentinel leaks');
        const leaky = { ...OLD, stripSuggestionBlock: async function* (src, on) { for await (const c of src) yield c; on?.([]); } };
        const lk = await compare(OLD, leaky, rows, [90]);
        const ok4 = !report(lk, 0) && lk.sentinelOut.length > 0;
        console.log(`\nknown with the OLD filter: ${same.sentinelBoth.length} reply shows a sentinel (expected 1)`);
        const all = ok1 && ok2 && ok3 && ok4 && same.sentinelBoth.length === 1;
        console.log(all ? 'REPLAY CALIBRATION OK' : 'REPLAY CALIBRATION FAILED');
        process.exit(all ? 0 : 1);
    }
    const NEW = require(NEW_PATH);
    console.log(`NEW ${NEW_PATH} (written ${fs.statSync(NEW_PATH).mtime.toISOString()})`);
    process.exit(report(await compare(OLD, NEW, rows), Number(arg('--expect-changed', '9')), Number(arg('--expect-logged', '10'))) ? 0 : 1);
}
