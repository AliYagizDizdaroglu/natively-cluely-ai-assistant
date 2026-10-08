// Throwaway: why did C5's selector pick S2Q04F and not S2Q04?
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { termsOf, sharedRareTerms, sameAnchor } from './earlierQuestions.ref.mjs';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const RUN = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs', '2026-09-22T08-22-50-s50m');
const { readDispatches } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.prompts.mjs')).href);
const dbg = fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8');
const dispatches = readDispatches(dbg).map((d) => ({ at: Date.parse(d.at), iso: d.at, text: d.question }));
const current = 'Going back to reciprocal rank fusion, how would you tune the constant c?';
console.log('current terms:', [...termsOf(current)]);
for (const d of dispatches) {
    if (!/rank fusion/i.test(d.text)) continue;
    console.log(`\n${d.iso}  ${d.text.slice(0, 120)}`);
    console.log('  terms:', [...termsOf(d.text)].filter((t) => termsOf(current).has(t)));
    const texts = dispatches.filter((x) => x.at < d.at + 1).map((x) => x.text);
    console.log('  sharedRare (df over all dispatches):', sharedRareTerms(current, d.text, dispatches.map((x) => x.text)));
    for (const t of ['reciprocal', 'fusion', 'constant']) console.log(`  df(${t}) =`, dispatches.filter((x) => termsOf(x.text).has(t)).length, dispatches.filter((x) => termsOf(x.text).has(t)).map((x) => x.text.slice(0, 40)));
}
console.log('\nall dispatch texts (first 60):');
dispatches.forEach((d, i) => console.log(i, d.iso.slice(11, 19), d.text.slice(0, 60)));
