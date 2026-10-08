// THROWAWAY: hand-off preparation for the frozen grader. For every pairs file the flight
// exported into the run dir, write a copy of interview60.grader-prompt.md with
// <PAIRS_FILE> / <VERDICTS_FILE> substituted (the prompt says: hand it over verbatim with
// those two substituted — nothing else changes), and print the mapping. The verdicts file
// name follows judge.mjs: interview60.judge.verdicts[.<tag>].json beside the pairs file.
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = process.argv[2] ?? path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a');
const OUT = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const prompt = fs.readFileSync(path.join(PROJ, 'electron/test/golden/interview60.grader-prompt.md'), 'utf8');
const pairs = fs.readdirSync(RUN).filter((f) => /^interview60\.judge\.pairs(\..+)?\.json$/.test(f));
if (!pairs.length) { console.log('no pairs files in the run dir yet — the flight exports them after the arms and chains'); process.exit(1); }
for (const f of pairs) {
    const tag = f.replace(/^interview60\.judge\.pairs/, '').replace(/\.json$/, ''); // '' or '.<model>'
    const pairsPath = path.join(RUN, f);
    const verdictsPath = path.join(RUN, `interview60.judge.verdicts${tag}.json`);
    const n = Object.keys(JSON.parse(fs.readFileSync(pairsPath, 'utf8')).items ?? {}).length;
    const text = prompt.split('<PAIRS_FILE>').join(pairsPath).split('<VERDICTS_FILE>').join(verdictsPath);
    const dest = path.join(OUT, `grade${tag || '.in-app'}.md`);
    fs.writeFileSync(dest, text);
    console.log(`${(tag || '.in-app').slice(1).padEnd(24)} items ${String(n).padStart(3)}   prompt ${dest}\n${''.padEnd(29)}verdicts -> ${verdictsPath}${fs.existsSync(verdictsPath) ? '   (EXISTS — already graded)' : ''}`);
}
