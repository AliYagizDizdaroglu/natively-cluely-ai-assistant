// Does either model leak screen notation PAST the shipped filter? The offline arms already
// run filterVerbalLines + stripSuggestionBlock + stripSpokenNotation char by char, which is
// the adversarial chunking the app sees. They do NOT run filterCodeFences, so a ``` block in
// `raw` is suppressed live but shows here — count those separately.
import { readFileSync } from 'node:fs';

const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k';
const ARMS = [
    ['3.1 LOW r1', 'gemini-3.1-flash-lite_captured-low'],
    ['3.1 LOW r2', 'gemini-3.1-flash-lite_captured-low-r2'],
    ['3.1 LOW r3', 'gemini-3.1-flash-lite_captured-low-r3'],
    ['3.5 HIGH r1', 'gemini-3.5-flash-lite_captured-high'],
    ['3.5 HIGH r2', 'gemini-3.5-flash-lite_captured-high-r2'],
    ['3.5 HIGH r3', 'gemini-3.5-flash-lite_captured-high-r3'],
];

const DOLLAR = /\$/;
const BACKSLASH = /\\/;
const FENCE = /```/;
const LATEXY = /\\frac|\\text|\\times|\\%|\$\d|\$\\/;

console.log('arm          n   raw LaTeX  raw fence | POST-FILTER: $ leak  backslash leak   ids');
for (const [tag, f] of ARMS) {
    const j = JSON.parse(readFileSync(`${R}/interview60.answers.${f}.json`, 'utf8'));
    let n = 0, rawLatex = 0, rawFence = 0, dLeak = 0, bLeak = 0;
    const ids = [];
    for (const [id, r] of Object.entries(j)) {
        if (!r || typeof r.spoken !== 'string') continue;
        n++;
        const raw = typeof r.raw === 'string' ? r.raw : '';
        if (LATEXY.test(raw)) rawLatex++;
        if (FENCE.test(raw)) rawFence++;
        const d = DOLLAR.test(r.spoken), b = BACKSLASH.test(r.spoken);
        if (d) dLeak++;
        if (b) bLeak++;
        if (d || b) ids.push(id);
    }
    console.log(`${tag.padEnd(12)} ${String(n).padStart(2)}  ${String(rawLatex).padStart(8)}  ${String(rawFence).padStart(9)} | ${String(dLeak).padStart(18)}  ${String(bLeak).padStart(14)}   ${ids.join(',')}`);
}

// Show every leaked span so the fix can be written against real text, not a guess.
console.log('\nleaked spans, post-filter:');
for (const [tag, f] of ARMS) {
    const j = JSON.parse(readFileSync(`${R}/interview60.answers.${f}.json`, 'utf8'));
    for (const [id, r] of Object.entries(j)) {
        if (!r || typeof r.spoken !== 'string') continue;
        for (const m of r.spoken.matchAll(/\S*[\\$]\S*/g)) {
            console.log(`  ${tag.padEnd(12)} ${id.padEnd(8)} ${JSON.stringify(m[0])}`);
        }
    }
}
