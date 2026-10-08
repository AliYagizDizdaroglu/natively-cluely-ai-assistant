// Throwaway (task 1, rule 8 calibration): do the unit tests have teeth?
// Re-states the test file's assertions over the same fixtures JSON, runs them against (a) the module as it is in MAIN
// (must pass everything: the harness itself is calibrated), (b) one-line MUTATIONS of the module source, built in
// memory with esbuild (MAIN is never written), and (c) the design's v2 rule. A mutation that fails no check is a
// SURVIVOR: either an equivalent mutant or a guard the suite does not pin.
//   node t1-mutate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const src = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'), 'utf8');
const fixtures = JSON.parse(fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.fixtures.json'), 'utf8'));

const build = (source) => {
    const code = esbuild.transformSync(source, { loader: 'ts', format: 'cjs' }).code;
    const m = { exports: {} };
    new Function('module', 'exports', code)(m, m.exports);
    return m.exports.createBoundaryRepair;
};

// ---- the test file's assertions, restated (same helpers, same expectations) ----
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
    return res;
}
const fails = (create) => checks(create).filter(([, ok]) => !ok).map(([n]) => n);
const show = (label, list) => console.log(`${label.padEnd(34)} ${String(list.length).padStart(2)} failing${list.length ? ': ' + list.slice(0, 7).join(' | ') + (list.length > 7 ? ` | ... (+${list.length - 7})` : '') : '  <-- SURVIVES'}`);

// ---- (a) calibration of the harness: MAIN's module must pass every check ----
const total = checks(build(src)).length;
const base = fails(build(src));
console.log(`checks: ${total} (symptom, seam, ${fixtures.positives.length} positives, ${fixtures.negatives.length} negatives, 5 edges)`);
show('MAIN module (unmutated)', base);
if (base.length) { console.log('HARNESS NOT CALIBRATED: the unmutated module fails checks'); process.exit(1); }

// ---- (b) mutations ----
const M = [
    ['window: <= becomes <', 'atMs - remembered.atMs <= REPAIR_WINDOW_MS', 'atMs - remembered.atMs < REPAIR_WINDOW_MS'],
    ['window 4999', 'const REPAIR_WINDOW_MS = 5000;', 'const REPAIR_WINDOW_MS = 4999;'],
    ['window 6000', 'const REPAIR_WINDOW_MS = 5000;', 'const REPAIR_WINDOW_MS = 6000;'],
    ['no tolerant cut', 'const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);', 'const tolerant = false;'],
    ['tolerant on 1-token finals', '!strict && fw.length >= 2 && ', '!strict && '],
    ['strict/tolerant swapped to tolerant only', 'if (strict || tolerant) cut =', 'if (tolerant) cut ='],
    ['final does not clear the cut', '            cut = null;\n            if (lastInterim) {', '            if (lastInterim) {'],
    ['final does not clear lastInterim', '            lastInterim = null;\n            return { text: out, restored };', '            return { text: out, restored };'],
    ['no F2[0] != T[0] guard', 'if (f.length && f[0] !== T[0]) {', 'if (f.length) {'],
    ['max skip 1', 'const MAX_SKIPPED_WORDS = 2;', 'const MAX_SKIPPED_WORDS = 1;'],
    ['max skip 3', 'const MAX_SKIPPED_WORDS = 2;', 'const MAX_SKIPPED_WORDS = 3;'],
    ['match 1 token', 'const RESUME_MATCH_WORDS = 2;', 'const RESUME_MATCH_WORDS = 1;'],
    ['match 3 tokens', 'const RESUME_MATCH_WORDS = 2;', 'const RESUME_MATCH_WORDS = 3;'],
    ['Traw lowercased', 'Traw: rawTok(lastInterim).slice(fw.length)', 'Traw: iw.slice(fw.length)'],
    ['no thousands-comma strip', "s.replace(/(\\d),(\\d)/g, '$1$2')", 's'],
    ['restored after the text', "out = `${restored.join(' ')} ${text}`;", "out = `${text} ${restored.join(' ')}`;"],
    ['restore one word too many', 'restored = remembered.Traw.slice(0, k)', 'restored = remembered.Traw.slice(0, k + 1)'],
    ['drop k < |T|', 'k <= MAX_SKIPPED_WORDS && k < T.length && !restored', 'k <= MAX_SKIPPED_WORDS && !restored'],
    ['cut on a token-less final', 'if (fw.length > 0 && fw.length < iw.length) {', 'if (fw.length < iw.length) {'],
    ['cut when final as long as interim', 'if (fw.length > 0 && fw.length < iw.length) {', 'if (fw.length > 0 && fw.length <= iw.length) {'],
    ['pass-through (the skeleton)', src.slice(src.indexOf('export function createBoundaryRepair')), 'export function createBoundaryRepair(): BoundaryRepair {\n    return { onTranscript(text, isFinal, atMs) { return { text, restored: null }; } };\n}\n'],
];
console.log('\n--- mutations of the port ---');
for (const [name, find, repl] of M) {
    const parts = src.split(find);
    if (parts.length !== 2) { console.log(`REFUSED ${name}: find string occurs ${parts.length - 1} times`); process.exit(2); }
    show(name, fails(build(parts.join(repl))));
}

// ---- (c) the design's v2 (two wider branches) through the same checks ----
const v2 = await import(pathToFileURL(path.join(SP, 'rule-v2.mjs')).href);
console.log('\n--- the design\'s v2 rule (its two wider branches) ---');
show('rule-v2.mjs', fails(() => v2.createRepair()));
