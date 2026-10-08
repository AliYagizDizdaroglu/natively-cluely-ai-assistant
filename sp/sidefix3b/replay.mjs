// Old-vs-new replay of the saved raw replies (spikes 1-6 + the repro; 624 with text) through the app's WHOLE verbal filter chain,
// in WhatToAnswerLLM.generateStream's order, now INCLUDING the outermost cutAtWordBudget(SPOKEN_WORD_GUARD) that sidefix2's replay
// left out (this fix lives there):
//   cutAtWordBudget( stripSpokenNotation( stripSuggestionBlock( filterVerbalLines( filterCodeFences( stripCueBlock(raw) ) ) ) ) )
// OLD = HEAD 801442d's filter, NEW = HEAD + the cutAtWordBudget payload pass-through, both built to scratch.
// Compared per (reply, chunk size): the emitted text AND the onDone record {words, cut, allowance}. Prints ids, counts and short diffs.
//   node replay.mjs [--calibrate]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CG = path.join(HERE, '..', 'sidefix3', '..', 'cue-group');
const require = createRequire(import.meta.url);
const OLD = require(path.join(HERE, 'build/old/verbalStreamFilter.cjs'));
const NEW = require(path.join(HERE, 'build/new/verbalStreamFilter.cjs'));
const SIZES = [1, 2, 3, 7, 90, 1e6];
const WHOLE = 1e6;
const J = JSON.stringify;
const cut = (text, size) => { const o = []; for (let i = 0; i < text.length; i += size) o.push(text.slice(i, i + size)); return o; };
const agen = (chunks) => (async function* () { for (const c of chunks) yield c; })();

async function chain(F, raw, size) {
    let cues = null, offers = null, out = '', done = null;
    const warn = console.warn; console.warn = () => {};
    try {
        const gen = F.cutAtWordBudget(
            F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(F.filterCodeFences(F.stripCueBlock(agen(cut(raw, size)), (c) => { cues = c; }))), (o) => { offers = o; })),
            { ...F.SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } },
        );
        for await (const p of gen) out += p;
    } finally { console.warn = warn; }
    return { out, done: J(done), cues: J(cues), offers: J((offers ?? []).map((o) => o.label)) };
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
    const r = { total: rows.length, wholeDiffer: [], doneDiffer: [], metaDiffer: [], oldBugs: {}, newBugs: {}, changed: [], braceLeading: 0, overBudget: 0, oldCut: 0 };
    for (const s of SIZES) { r.oldBugs[s] = 0; r.newBugs[s] = 0; }
    for (const row of rows) {
        const o = {}, n = {};
        for (const s of SIZES) { o[s] = await chain(oldF, row.raw, s); n[s] = await chain(newF, row.raw, s); }
        if (row.raw.trimStart().startsWith('{')) r.braceLeading++;
        if (/"cut":true/.test(o[WHOLE].done)) r.oldCut++;
        if (JSON.parse(o[WHOLE].done).words >= 120) r.overBudget++;
        if (o[WHOLE].out !== n[WHOLE].out) r.wholeDiffer.push(`${row.key}: ${snip(o[WHOLE].out, n[WHOLE].out)}`);
        if (o[WHOLE].done !== n[WHOLE].done) r.doneDiffer.push(`${row.key}: ${o[WHOLE].done} => ${n[WHOLE].done}`);
        for (const s of SIZES) {
            if (o[s].cues !== n[s].cues || o[s].offers !== n[s].offers) r.metaDiffer.push(`${row.key} @${s}`);
            if (o[s].out !== o[WHOLE].out) r.oldBugs[s]++;
            if (n[s].out !== n[WHOLE].out) r.newBugs[s]++;
            if (o[s].out !== n[s].out || o[s].done !== n[s].done) r.changed.push({ key: row.key, size: s, diff: o[s].out !== n[s].out ? snip(o[s].out, n[s].out) : `done ${o[s].done} => ${n[s].done}` });
        }
    }
    return r;
}

function show(r, label) {
    console.log(`\n== ${label}: ${r.total} replies, sizes ${SIZES.map((s) => (s === WHOLE ? 'whole' : s)).join(',')}`);
    console.log(`replies whose raw text starts with "{": ${r.braceLeading}; replies >= 120 words after the chain (OLD): ${r.overBudget}; replies the OLD chain cut: ${r.oldCut}`);
    console.log(`whole-string output differs old vs new: ${r.wholeDiffer.length}`);
    for (const x of r.wholeDiffer.slice(0, 20)) console.log(`   ${x}`);
    console.log(`whole-string onDone record differs old vs new: ${r.doneDiffer.length}`);
    for (const x of r.doneDiffer.slice(0, 20)) console.log(`   ${x}`);
    console.log(`cue or offers report differs: ${r.metaDiffer.length}`);
    console.log(`replies whose chunked output differs from their own whole-string output, by size:`);
    console.log(`   OLD ${J(r.oldBugs)}`);
    console.log(`   NEW ${J(r.newBugs)}`);
    const byKey = new Map();
    for (const c of r.changed) { if (!byKey.has(c.key)) byKey.set(c.key, []); byKey.get(c.key).push(c); }
    console.log(`(reply, size) pairs where old != new (text or onDone): ${r.changed.length}, over ${byKey.size} replies`);
    for (const [k, v] of byKey) { console.log(`   ${k}: sizes ${v.map((c) => c.size).join(',')}`); console.log(`      e.g. @${v[0].size}: ${v[0].diff}`); }
}

const { rows, files } = loadRows();
console.log(`row files: ${files.length}; rows: ${rows.length}`);
if (process.argv.includes('--calibrate')) {
    // Known answer 1: OLD against OLD changes nothing. Known answer 2: the harness SEES the defect: on a crafted >200-word coaching card
    // the OLD chain cuts it (not valid JSON), the NEW chain emits it whole (valid JSON), at every size, with onDone words=0 cut=false.
    // Known answer 3: a crafted spoken answer with a brace in it is clamped identically by OLD and NEW.
    const same = await run(rows, OLD, OLD);
    console.log(`[cal 1] OLD vs OLD: changed pairs ${same.changed.length}, whole differ ${same.wholeDiffer.length} (expect 0, 0)`);
    const sentence = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
    const card = J({ __negotiationCoaching: { exactScript: [1, 2, 3, 4, 5].map((i) => sentence(46, i)).join(' '), n: '$135,000 "base"\nok' } });
    let oldValid = 0, newValid = 0, newDone = '';
    for (const s of SIZES) {
        const o = await chain(OLD, card, s), n = await chain(NEW, card, s);
        try { J(JSON.parse(o.out)); oldValid++; } catch {}
        try { if (JSON.parse(n.out)) newValid++; } catch {}
        newDone = n.done;
    }
    console.log(`[cal 2] crafted 230-word card, ${SIZES.length} sizes: OLD parses ${oldValid}, NEW parses ${newValid}, NEW onDone ${newDone} (expect 0, ${SIZES.length}, words 0 cut false)`);
    const spoken = [{ key: 'crafted-brace', raw: 'The {} literal is empty. ' + [1, 2, 3, 4, 5].map((i) => sentence(46, i)).join(' ') }];
    const c3 = await run(spoken, OLD, NEW);
    console.log(`[cal 3] crafted spoken answer with a brace: changed pairs ${c3.changed.length} (expect 0)`);
    const ok = same.changed.length === 0 && same.wholeDiffer.length === 0 && oldValid === 0 && newValid === SIZES.length && /"words":0,"cut":false/.test(newDone) && c3.changed.length === 0;
    console.log(ok ? 'REPLAY CALIBRATION OK' : 'REPLAY CALIBRATION FAILED');
    process.exit(ok ? 0 : 1);
}
show(await run(rows, OLD, NEW), 'OLD (HEAD 801442d) vs NEW (+ fix)');
