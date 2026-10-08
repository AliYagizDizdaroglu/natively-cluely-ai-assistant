// THROWAWAY: what made the s50a answers weak or wrong? Every non-acceptable verdict's reason
// from the in-app judge file and the four arms, tagged by the failure it describes, so the
// "model vs pipeline" question rests on counts rather than on the five examples I happened
// to read. Tags are keyword heuristics — the raw reasons are printed too.
import fs from 'node:fs';
import path from 'node:path';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a';
const files = fs.readdirSync(RUN).filter((f) => /^interview60\.judge(\..+)?\.json$/.test(f) && !/pairs|verdicts/.test(f));
const TAGS = [
    ['incomplete — named parts missing', /\b(never|missing|skips?|leaves|omits?|not addressed|barely|no [a-z-]+ (filter|count|reasoning|mechanism)|generic|only|without the requested|stays generic)\b/i],
    ['factual / arithmetic error', /\b(wrong|incorrect|inverted|invented|miscast|ten times|not a real|aborts on first|swaps|too large|ignored|misstates|is the wrong)\b/i],
    ['unspeakable delivery (code, LaTeX, lists)', /\b(raw|code block|bare (python|sql)|latex|unspeakable|numbered list|markup|fenced|telegraphic|broken sentence)\b/i],
    ['off-topic / wrong question', /\b(instead of|rather than|re-answering|not the question|different question)\b/i],
    ['no answer delivered', /\b(no answer|error blob|503)\b/i],
];
for (const f of files.sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(RUN, f), 'utf8'));
    const arm = f.replace(/^interview60\.judge\.?/, '').replace(/\.json$/, '') || 'in-app';
    const bad = Object.entries(j.items).filter(([, v]) => v.kind === 'spoken' && v.verdict !== 'acceptable');
    const counts = new Map();
    for (const [, v] of bad) {
        const hit = TAGS.filter(([, re]) => re.test(v.reason)).map(([t]) => t);
        const tag = hit[0] ?? 'other';
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    console.log(`\n=== ${arm}: ${bad.length} not acceptable of ${Object.values(j.items).filter((v) => v.kind === 'spoken').length} ===`);
    for (const [t, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${t}`);
    if (process.argv[2] === '--raw') for (const [k, v] of bad) console.log(`   ${k.padEnd(9)} ${v.verdict.padEnd(6)} ${v.reason.slice(0, 150)}`);
}
