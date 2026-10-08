// Throwaway (fix round 1): a sequence that would pin the thousands-comma strip (the one round-0 survivor the six new tests do not cover).
// Runs the REFERENCE (rule-v3.mjs), the built module, and the module without the strip on the same events.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const ref = await import(pathToFileURL(path.join(SP, 'rule-v3.mjs')).href);
const esbuild = createRequire(path.join(MAIN, 'package.json'))('esbuild');
const src = fs.readFileSync(path.join(MAIN, 'electron/audio/deepgramBoundaryRepair.ts'), 'utf8');
const build = (s) => { const m = { exports: {} }; new Function('module', 'exports', esbuild.transformSync(s, { loader: 'ts', format: 'cjs' }).code)(m, m.exports); return m.exports.createBoundaryRepair; };
const real = build(src);
const find = "s.replace(/(\\d),(\\d)/g, '$1$2')";
if (src.split(find).length !== 2) { console.log('REFUSED: strip not found exactly once'); process.exit(2); }
const noStrip = build(src.split(find).join('s'));

const events = [
    { text: 'How do you cut 10,000 hallucinations in a rag answer without just making', isFinal: false, atMs: 0 },
    { text: 'How do you cut', isFinal: true, atMs: 17 },
    { text: 'hallucinations in a rag answer without just making it refuse?', isFinal: true, atMs: 1564 },
];
const run = (mk) => { const r = mk(); let out = ''; for (const e of events) { const x = r.onTranscript(e.text, e.isFinal, e.atMs); if (e.isFinal) out = x.text; } return out; };
console.log('reference (rule-v3.mjs):', JSON.stringify(run(() => ref.createRepair())));
console.log('module                 :', JSON.stringify(run(real)));
console.log('module without strip   :', JSON.stringify(run(noStrip)));
