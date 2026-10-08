// Throwaway: unspeakable text that survives the SHIPPED filter, counted on the filtered `spoken`
// string. Fences are already stripped by the filter, so the real risk is bare code read aloud
// (a SELECT ... FROM statement), snake_case identifiers, and LaTeX dollar math — all three were
// named by graders on the 3.5 arms. Counted per arm over the same 117 answers.
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'bench');
const TESTS = {
    'bare SQL': (s) => /\bSELECT\b[\s\S]{0,400}\bFROM\b/i.test(s),
    'LaTeX math': (s) => /\$[\d\\]|\\frac|\\times|\\%|\\\(/.test(s),
    'snake_case id': (s) => /\b[a-z]+_[a-z_]+\b/.test(s),
};
const names = Object.keys(TESTS);
console.log(`arm              answers  ${names.map((n) => n.padStart(14)).join('')}   any`);
for (const arm of ['control', 'think-low', 'think35-medium', 'think35-high']) {
    let n = 0, any = 0;
    const hits = Object.fromEntries(names.map((k) => [k, 0]));
    const examples = {};
    for (const rep of [1, 2, 3]) {
        const f = path.join(OUT, `${arm}.rep${rep}.json`);
        if (!fs.existsSync(f)) continue;
        for (const [id, v] of Object.entries(JSON.parse(fs.readFileSync(f, 'utf8')))) {
            if (!v.spoken) continue;
            n++;
            let hit = false;
            for (const k of names) if (TESTS[k](v.spoken)) { hits[k]++; hit = true; examples[k] ??= `${id} r${rep}`; }
            if (hit) any++;
        }
    }
    console.log(`${arm.padEnd(16)} ${String(n).padStart(6)}  ${names.map((k) => String(hits[k]).padStart(14)).join('')} ${String(any).padStart(5)}` +
        `    ${names.filter((k) => examples[k]).map((k) => `${k}: ${examples[k]}`).join('; ')}`);
}
