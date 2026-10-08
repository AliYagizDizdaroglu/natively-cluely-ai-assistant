// Throwaway (2026-09-29), Task 1 fix-round-1 re-review: the six new tests' inputs, restated from the
// r1 test file, run on the reference (rule-v3.mjs), on the r1 module (package copy, sha 4653b898 = MAIN),
// on the round-0 module, and on each of the implementer's seven mutants. Read-only: imports only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRepair as refCreate } from '../../rule-v3.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BR = path.resolve(HERE, '../..');
const fx = JSON.parse(fs.readFileSync(path.join(BR, 'fixtures-v3.json'), 'utf8'));
const [I, F1, F2] = fx.symptom.events;

const TESTS = [
    ['#1 Traw spelling + alignment', [
        { text: "How'd you cut RAG hallucinations in a rag answer without just making", isFinal: false, atMs: 0 },
        { ...F1, text: "How'd you cut" },
        { ...F2, text: 'hallucinations in a rag answer without just making it refuse?' }],
        'RAG hallucinations in a rag answer without just making it refuse?'],
    ['#2 punctuation-only final', [I, { ...F1, text: '?' }, { ...F2, text: 'you cut hallucinations in a rag answer without just making it refuse?' }],
        'you cut hallucinations in a rag answer without just making it refuse?'],
    ['#3 one-word final, tolerant', [I, { ...F1, text: 'Wow.' }, { ...F2, text: 'you cut hallucinations in a rag answer without just making it refuse?' }],
        'you cut hallucinations in a rag answer without just making it refuse?'],
    ['#4 stale interim', [I, F1, { text: 'How do you', isFinal: true, atMs: 500 }, F2], F2.text],
    ['#5 three-word loss', [I, F1, { ...F2, text: 'rag answer without just making it refuse?' }], 'rag answer without just making it refuse?'],
    ['#6 repeated first tail word', [
        { text: 'How do you cut hallucinations in in a rag answer without just making', isFinal: false, atMs: 0 },
        { ...F1, text: 'How do you cut hallucinations' }, F2], F2.text],
];

const play = (factory, events) => { const r = factory(); let out = ''; for (const e of events) { const res = r.onTranscript(e.text, e.isFinal, e.atMs); if (e.isFinal) out = res.text; } return out; };

const variants = [['reference rule-v3', refCreate]];
const load = async (label, p) => variants.push([label, (await import(pathToFileURL(p).href)).createBoundaryRepair]);
await load('r1 module (4653b898)', path.join(BR, 'sdd/r1/electron/audio/deepgramBoundaryRepair.ts'));
await load('r0 module (7b684f16)', path.join(BR, 'sdd/r0/electron/audio/deepgramBoundaryRepair.ts'));
for (const f of fs.readdirSync(path.join(BR, 't1/mut')).filter((f) => f.endsWith('.ts')).sort()) await load(f, path.join(BR, 't1/mut', f));

// Calibration of this harness: the reference must meet every expected value (or the restatement is wrong).
for (const [label, factory] of variants) {
    const cells = TESTS.map(([name, events, expected]) => {
        const got = play(factory, events);
        return got === expected ? 'pass' : `FAIL(${JSON.stringify(got)})`;
    });
    console.log(label.padEnd(36), cells.map((c, i) => `${TESTS[i][0].slice(0, 2)}:${c}`).join('  '));
}
