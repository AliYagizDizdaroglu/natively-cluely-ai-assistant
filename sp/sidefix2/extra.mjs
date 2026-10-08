// (1) how many saved replies contain the shapes the fix targets; (2) calibrate the "$$" guard test: a mutant without the (?=\$) alternative.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CG = path.join(HERE, '..', 'cue-group');
const files = fs.readdirSync(CG).filter((f) => /^(spike\d*|repro-blockonly)-.*\.json$/.test(f));
let n = 0, dollar = 0, pairDollar = 0, frac = 0, backslash = 0;
for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(CG, f), 'utf8'));
    for (const x of (Array.isArray(data) ? data : Object.values(data))) {
        if (typeof x?.raw !== 'string' || !x.raw.trim()) continue;
        n++;
        if (x.raw.includes('$')) dollar++;
        if (/\$[^$\n]*\$/.test(x.raw)) pairDollar++;
        if (x.raw.includes('\\frac')) frac++;
        if (x.raw.includes('\\')) backslash++;
    }
}
console.log(`replies ${n}; with "$" ${dollar}; with a $...$ pair ${pairDollar}; with \\frac ${frac}; with any backslash ${backslash}`);

const src = fs.readFileSync(path.join(HERE, 'build/new/verbalStreamFilter.ts'), 'utf8');
const mut = src.replace('|(?=\\$))', ')');
if (mut === src) throw new Error('mutation anchor not found');
fs.mkdirSync(path.join(HERE, 'build/mut'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'build/mut/verbalStreamFilter.ts'), mut);
const M = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant';
const { build } = createRequire(M + '/package.json')('esbuild');
await build({ entryPoints: [path.join(HERE, 'build/mut/verbalStreamFilter.ts')], outfile: path.join(HERE, 'build/mut/verbalStreamFilter.cjs'), platform: 'node', target: 'node20', format: 'cjs', absWorkingDir: HERE });
const require = createRequire(import.meta.url);
const run = async (F, text, size) => { let o = ''; const g = (async function* () { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); })(); for await (const c of F.stripSpokenNotation(g)) o += c; return o; };
const text = 'it was $\\sim$$$5 more.';
for (const [name, F] of [['old', require('./build/old/verbalStreamFilter.cjs')], ['new', require('./build/new/verbalStreamFilter.cjs')], ['mutant(no (?=$))', require('./build/mut/verbalStreamFilter.cjs')]]) {
    const whole = await run(F, text, text.length);
    const sizes = {};
    for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]) sizes[s] = (await run(F, text, s)) === whole ? 'same' : 'DIFF';
    console.log(`${name}: whole ${JSON.stringify(whole)}; chunk sizes ${JSON.stringify(sizes)}`);
}
