// Verify BOTH fixes against the real s50k answers that exposed them, through the freshly
// built dist the flight will actually load — not through the TypeScript source.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const R = `${PROJ}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k`;
const require = createRequire(import.meta.url);
const F = require(`${PROJ}/dist-electron/electron/llm/verbalStreamFilter.js`);

const has = (n) => typeof F[n] === 'function';
console.log(`dist exports: filterCodeFences ${has('filterCodeFences')}  stripSpokenNotation ${has('stripSpokenNotation')}`);
if (!has('filterCodeFences')) { console.error('FAIL: dist was not rebuilt'); process.exit(1); }

// Char-by-char, exactly as the arm feeds it.
async function run(raw, withFences) {
    async function* gen() { for (const ch of raw) yield ch; }
    const inner = withFences ? F.filterCodeFences(gen()) : gen();
    let out = '';
    for await (const p of F.stripSpokenNotation(F.stripSuggestionBlock(F.filterVerbalLines(inner), () => {}))) out += p;
    return out.trim();
}

const ARMS = [
    ['3.1 LOW r1', 'gemini-3.1-flash-lite_captured-low'],
    ['3.1 LOW r2', 'gemini-3.1-flash-lite_captured-low-r2'],
    ['3.1 LOW r3', 'gemini-3.1-flash-lite_captured-low-r3'],
    ['3.5 HIGH r1', 'gemini-3.5-flash-lite_captured-high'],
    ['3.5 HIGH r2', 'gemini-3.5-flash-lite_captured-high-r2'],
    ['3.5 HIGH r3', 'gemini-3.5-flash-lite_captured-high-r3'],
];

console.log('\nBEFORE is what the flight recorded; AFTER is the rebuilt chain on the same raw bytes.\n');
console.log('arm          notation leaks before -> after     fenced answers before -> after');
let totalLeakAfter = 0, totalFenceAfter = 0;
for (const [tag, f] of ARMS) {
    const j = JSON.parse(readFileSync(`${R}/interview60.answers.${f}.json`, 'utf8'));
    let leakBefore = 0, leakAfter = 0, fenceBefore = 0, fenceAfter = 0;
    for (const r of Object.values(j)) {
        if (!r || typeof r.raw !== 'string') continue;
        if (/[$\\]/.test(r.spoken ?? '')) leakBefore++;
        if (/```/.test(r.spoken ?? '')) fenceBefore++;
        const after = await run(r.raw, true);
        if (/[$\\]/.test(after)) { leakAfter++; console.log(`    still leaking: ${tag} ${JSON.stringify(after.match(/\S*[\\$]\S*/g))}`); }
        if (/```/.test(after)) fenceAfter++;
    }
    totalLeakAfter += leakAfter; totalFenceAfter += fenceAfter;
    console.log(`${tag.padEnd(12)} ${String(leakBefore).padStart(5)} -> ${String(leakAfter).padEnd(24)} ${String(fenceBefore).padStart(5)} -> ${fenceAfter}`);
}

// The exact answer that spoke "dollar one hundred thousand".
const j35 = JSON.parse(readFileSync(`${R}/interview60.answers.gemini-3.5-flash-lite_captured-high-r3.json`, 'utf8'));
console.log('\nthe S1Q02 answer that failed, through the rebuilt chain:');
console.log('  ' + (await run(j35['S1Q02'].raw, true)).slice(0, 320));

console.log(`\nRESULT: notation leaks remaining ${totalLeakAfter}, fenced blocks remaining ${totalFenceAfter}`);
process.exit(totalLeakAfter === 0 && totalFenceAfter === 0 ? 0 : 1);
