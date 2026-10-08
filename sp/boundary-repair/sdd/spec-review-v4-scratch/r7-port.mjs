// Spec-review v4 scratch: the PLAN's TypeScript module (Task 3 Step 3, as placed in the mirror tree by r4-tree.mjs),
// transpiled in memory with MAIN's esbuild, replayed against rule-v4.mjs on every stream with the v4 adapter
// semantics (empty FINAL / UtteranceEnd -> clear, speech_final passed). Calibration: the CURRENT MAIN (v3) module
// under the same feed must differ (it has no clear()/speechFinal, so the feed falls back to skipping them).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as v4 from '../../rule-v4.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
async function load(tsFile, tag) {
    const js = esbuild.transformSync(fs.readFileSync(tsFile, 'utf8'), { loader: 'ts', format: 'esm' }).code;
    const out = path.join(HERE, `port-${tag}.mjs`);
    fs.writeFileSync(out, js);
    return import(pathToFileURL(out).href);
}
const plan = await load(path.join(HERE, 'tree/electron/audio/deepgramBoundaryRepair.ts'), 'plan');
const cur = await load(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'), 'main-v3');
const RUNS = path.join(MAIN, 'electron/test/golden/interview60.runs');
const SEAM = path.resolve(HERE, '../../seam-probe');
const unq = (s) => JSON.parse(`"${s}"`);
const streams = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log')))) {
    const ev = [];
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (m) { ev.push({ text: m[3] === '(empty)' ? '' : unq(m[3]), isFinal: m[2] === 'true', at: Date.parse(m[1]), sf: false }); continue; }
        if (/ \[LOG\] \[Main\] turn: deepgram utterance-end /.test(l)) ev.push({ ue: true });
    }
    streams.push({ kind: /h40/.test(dir) ? 'holdout' : 'other', ev });
}
for (const f of fs.readdirSync(SEAM).filter((f) => /^events-.*\.jsonl$/.test(f))) {
    const ev = [];
    for (const l of fs.readFileSync(path.join(SEAM, f), 'utf8').split('\n').filter(Boolean)) {
        const e = JSON.parse(l);
        if (e.kind === 'transcript') ev.push({ text: e.text, isFinal: e.isFinal, at: e.at, sf: e.speechFinal === true });
        if (e.kind === 'utterance-end') ev.push({ ue: true });
    }
    streams.push({ kind: 'seam', ev });
}
const feed = (make, ev) => {
    const r = make();
    return ev.map((e) => {
        if (e.ue) { r.clear?.(); return null; }
        if (!e.text) { if (e.isFinal) r.clear?.(); return null; }
        return r.onTranscript(e.text, e.isFinal, e.at, e.sf).text;
    });
};
const synth = [
    ['R22 speech_final on F1', [['How do you cut hallucinations in a rag answer without just making', false, 0, false], ['How do you cut', true, 17, true], ['in a rag answer without just making it refuse?', true, 1564, false]]],
    ['R22 empty final between', [['How do you cut hallucinations in a rag answer without just making', false, 0, false], ['How do you cut', true, 17, false], ['', true, 500, false], ['in a rag answer without just making it refuse?', true, 1564, false]]],
];
for (const [label, make] of [['PLAN module', plan.createBoundaryRepair], ['calibration: MAIN v3 module', cur.createBoundaryRepair]]) {
    let diff = 0, events = 0; const reps = { other: 0, holdout: 0, seam: 0 };
    for (const s of streams) {
        const a = feed(v4.createRepair, s.ev), b = feed(make, s.ev);
        a.forEach((x, i) => { if (x !== null) events++; if (x !== b[i]) diff++; if (b[i] !== null && s.ev[i].text && b[i] !== s.ev[i].text) reps[s.kind]++; });
    }
    let sdiff = 0;
    for (const [, evs] of synth) { const ev = evs.map(([text, isFinal, at, sf]) => ({ text, isFinal, at, sf })); const a = feed(v4.createRepair, ev), b = feed(make, ev); if (JSON.stringify(a) !== JSON.stringify(b)) sdiff++; }
    console.log(`${label}: ${events} non-empty events compared with rule-v4, ${diff} differ; repairs non-holdout ${reps.other} / holdout ${reps.holdout} / seam ${reps.seam}; synthetic pause cases differing ${sdiff}/2`);
}
