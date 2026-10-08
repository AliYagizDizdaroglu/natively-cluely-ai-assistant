// Throwaway (fix round 1): the round-0 mutation matrix again, now with the six new edge tests restated as checks.
// Harness calibration: the MAIN module (must fail 0 of 56 checks). Then every round-0 mutant plus the round-1 ones.
//   node t1-mutate2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const src = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'), 'utf8');
const fixtures = JSON.parse(fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json'), 'utf8'));
const build = (source) => {
    const code = esbuild.transformSync(source, { loader: 'ts', format: 'cjs' }).code;
    const m = { exports: {} };
    new Function('module', 'exports', code)(m, m.exports);
    return m.exports.createBoundaryRepair;
};
const lastFinal = (create, events) => {
    const r = create();
    let out = '';
    for (const e of events) { const res = r.onTranscript(e.text, e.isFinal, e.atMs); if (e.isFinal) out = res.text; }
    return out;
};
const lastRaw = (f) => f.events[f.events.length - 1].text;
const J = JSON.stringify;
function checks(create) {
    const res = [];
    const add = (name, ok) => res.push([name, !!ok]);
    add('symptom', lastFinal(create, fixtures.symptom.events) === fixtures.symptom.expectedF2);
    add('seam', lastFinal(create, fixtures.seam.events) === fixtures.seam.expectedF2);
    fixtures.positives.forEach((f, i) => add(`positive #${i + 1}`, lastFinal(create, f.events) === f.expectedF2));
    fixtures.negatives.forEach((f, i) => add(`negative #${i + 1} ${f.cls}`, lastFinal(create, f.events) === lastRaw(f)));
    const [I, F1, F2] = fixtures.symptom.events;
    const play = (events) => lastFinal(create, events);
    add('edge window 5000/5001', play([I, F1, { ...F2, atMs: F1.atMs + 5000 }]) === fixtures.symptom.expectedF2 && play([I, F1, { ...F2, atMs: F1.atMs + 5001 }]) === F2.text);
    add('edge not-a-prefix / tolerant', play([I, { ...F1, text: 'How do we cut' }, F2]) === F2.text && play([I, { ...F1, text: 'How do you cat' }, F2]) === fixtures.symptom.expectedF2);
    {
        const r = create();
        add('edge interim-only', J(r.onTranscript('How do', false, 0)) === J({ text: 'How do', restored: null })
            && J(r.onTranscript(I.text, false, 500)) === J({ text: I.text, restored: null })
            && J(r.onTranscript(I.text, true, 1000)) === J({ text: I.text, restored: null })
            && J(r.onTranscript(F2.text, true, 2000)) === J({ text: F2.text, restored: null }));
    }
    add('edge any-final-clears', play([I, F1, { text: 'Okay.', isFinal: true, atMs: 500 }, F2]) === F2.text);
    {
        const m13 = fixtures.positives[2];
        const [i, f1, f2] = m13.events;
        add('edge interim-between (M13)', play([i, f1, { text: 'as code without', isFinal: false, atMs: f1.atMs + 2 }, f2]) === m13.expectedF2);
    }
    // ---- fix round 1: the six new edge tests, restated ----
    {
        const I2 = { text: "How'd you cut RAG hallucinations in a rag answer without just making", isFinal: false, atMs: 0 };
        add('NEW1 own spelling past an apostrophe', play([I2, { ...F1, text: "How'd you cut" }, { ...F2, text: 'hallucinations in a rag answer without just making it refuse?' }]) === 'RAG hallucinations in a rag answer without just making it refuse?');
        add('NEW2 punctuation-only final', play([I, { ...F1, text: '?' }, { ...F2, text: 'you cut hallucinations in a rag answer without just making it refuse?' }]) === 'you cut hallucinations in a rag answer without just making it refuse?');
        add('NEW3 one-word final', play([I, { ...F1, text: 'Wow.' }, { ...F2, text: 'you cut hallucinations in a rag answer without just making it refuse?' }]) === 'you cut hallucinations in a rag answer without just making it refuse?');
        add('NEW4 no interim before a final', play([I, F1, { text: 'How do you', isFinal: true, atMs: 500 }, F2]) === F2.text);
        add('NEW5 three-word loss', play([I, F1, { ...F2, text: 'rag answer without just making it refuse?' }]) === 'rag answer without just making it refuse?');
        const I3 = { text: 'How do you cut hallucinations in in a rag answer without just making', isFinal: false, atMs: 0 };
        add('NEW6 repeated first tail word', play([I3, { ...F1, text: 'How do you cut hallucinations' }, F2]) === F2.text);
    }
    return res;
}
const fails = (create) => checks(create).filter(([, ok]) => !ok).map(([n]) => n);
const show = (label, list, want0) => console.log(`${label.padEnd(40)} ${String(list.length).padStart(2)} failing${list.length ? ': ' + list.slice(0, 6).join(' | ') + (list.length > 6 ? ` | ... (+${list.length - 6})` : '') : (want0 ? '  (as required)' : '  <-- SURVIVES')}`);

const total = checks(build(src)).length;
const base = fails(build(src));
console.log(`checks: ${total} (the round-0 50 + 6 new)`);
show('MAIN module (unmutated)', base, true);
if (base.length) { console.log('HARNESS NOT CALIBRATED'); process.exit(1); }

const RAW = "const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];";
const M = [
    ['window: <= becomes <', 'atMs - remembered.atMs <= REPAIR_WINDOW_MS', 'atMs - remembered.atMs < REPAIR_WINDOW_MS'],
    ['window 4999', 'const REPAIR_WINDOW_MS = 5000;', 'const REPAIR_WINDOW_MS = 4999;'],
    ['window 6000', 'const REPAIR_WINDOW_MS = 5000;', 'const REPAIR_WINDOW_MS = 6000;'],
    ['no tolerant cut', 'const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);', 'const tolerant = false;'],
    ['tolerant on 1-token finals (d)', '!strict && fw.length >= 2 && ', '!strict && '],
    ['tolerant only, no strict', 'if (strict || tolerant) cut =', 'if (tolerant) cut ='],
    ['final does not clear the cut', '            cut = null;\n            if (lastInterim) {', '            if (lastInterim) {'],
    ['final does not clear lastInterim (e)', '            lastInterim = null;\n            return { text: out, restored };', '            return { text: out, restored };'],
    ['no F2[0] != T[0] guard (g)', 'if (f.length && f[0] !== T[0]) {', 'if (f.length) {'],
    ['max skip 1', 'const MAX_SKIPPED_WORDS = 2;', 'const MAX_SKIPPED_WORDS = 1;'],
    ['max skip 3 (f)', 'const MAX_SKIPPED_WORDS = 2;', 'const MAX_SKIPPED_WORDS = 3;'],
    ['match 1 token', 'const RESUME_MATCH_WORDS = 2;', 'const RESUME_MATCH_WORDS = 1;'],
    ['match 3 tokens', 'const RESUME_MATCH_WORDS = 2;', 'const RESUME_MATCH_WORDS = 3;'],
    ['Traw lowercased (a)', RAW, 'const rawTok = (s: string): string[] => tok(s);'],
    ['rawTok regex without apostrophe (b)', RAW, "const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9]+/g) ?? [];"],
    ['tok regex without apostrophe', "stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];", 'stripThousands(s).toLowerCase().match(/[a-z0-9]+/g) ?? [];'],
    ['no thousands-comma strip', "s.replace(/(\\d),(\\d)/g, '$1$2')", 's'],
    ['restored after the text', "out = `${restored.join(' ')} ${text}`;", "out = `${text} ${restored.join(' ')}`;"],
    ['restore one word too many', 'restored = remembered.Traw.slice(0, k)', 'restored = remembered.Traw.slice(0, k + 1)'],
    ['drop k < |T|', 'k <= MAX_SKIPPED_WORDS && k < T.length && !restored', 'k <= MAX_SKIPPED_WORDS && !restored'],
    ['cut on a token-less final (c)', 'if (fw.length > 0 && fw.length < iw.length) {', 'if (fw.length < iw.length) {'],
    ['cut when final as long as interim', 'if (fw.length > 0 && fw.length < iw.length) {', 'if (fw.length > 0 && fw.length <= iw.length) {'],
    ['pass-through (the skeleton)', src.slice(src.indexOf('export function createBoundaryRepair')), 'export function createBoundaryRepair(): BoundaryRepair {\n    return { onTranscript(text, isFinal, atMs) { return { text, restored: null }; } };\n}\n'],
];
console.log('\n--- mutants of the port ---');
const survivors = [];
for (const [name, find, repl] of M) {
    const parts = src.split(find);
    if (parts.length !== 2) { console.log(`REFUSED ${name}: find string occurs ${parts.length - 1} times`); process.exit(2); }
    const f = fails(build(parts.join(repl)));
    show(name, f, false);
    if (!f.length) survivors.push(name);
}
console.log(`\nsurvivors: ${survivors.length ? survivors.join(' ; ') : 'none'}`);
