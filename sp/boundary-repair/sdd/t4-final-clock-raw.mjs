// Task 4 final fix round (throwaway): vitest's unedited failure text for the E1 mutant (the adapter passes a constant 0 as atMs), on a MIRROR tree
// (MAIN only READ), against MAIN's final adapter test. Saved to sdd\t4-final-mutant-clock0.raw.txt; prints the failure block.
//   node t4-final-clock-raw.mjs
import fs from 'node:fs';
import path from 'node:path';
import { makeMirror, rdMain, sub, HERE, sha16 } from './t4-final-lib.mjs';
const A = 'electron/audio/';
const adp = rdMain(A + 'DeepgramStreamingSTT.ts').toString('utf8');
const test = rdMain(A + 'DeepgramStreamingSTT.boundaryRepair.test.ts');
const mutant = sub(adp, 'boundaryRepair?.onTranscript(transcript, isFinal, Date.now(), data.speech_final === true)', 'boundaryRepair?.onTranscript(transcript, isFinal, 0, data.speech_final === true)');
console.log(`MAIN adapter test ${test.length} B ${sha16(test)}; mutant = MAIN adapter with Date.now() -> 0 in the onTranscript call`);
const m = makeMirror('t4-mirror-final-c');
try {
    for (const rel of [A + 'deepgramBoundaryRepair.ts', A + 'deepgramKeyterms.ts', A + 'deepgramBoundaryRepair.fixtures.json', 'electron/config/languages.ts']) m.put(rel, rdMain(rel));
    m.put(A + 'DeepgramStreamingSTT.boundaryRepair.test.ts', test);
    m.put(A + 'DeepgramStreamingSTT.ts', mutant);
    const r = m.runRaw(A + 'DeepgramStreamingSTT.boundaryRepair.test.ts');
    fs.writeFileSync(path.join(HERE, 't4-final-mutant-clock0.raw.txt'), r.text);
    const L = r.text.split('\n');
    console.log(`exit ${r.status}`);
    console.log(L.filter((l) => /^\s*(Test Files|Tests)\s/.test(l)).map((l) => l.replace(/\s+$/, '')).join('\n'));
    const i = L.findIndex((l) => /^\s*FAIL\s/.test(l));
    let j = i + 1; while (j < L.length && !/^⎯/.test(L[j])) j++;
    L.slice(i, j).filter((l) => l.trim()).slice(0, 26).forEach((l) => console.log('| ' + l));
} finally { console.log(m.dispose()); }
