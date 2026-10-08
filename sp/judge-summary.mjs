// THROWAWAY: one line per judge file in a run dir — acceptable / weak / wrong over the base
// mains, plus the long and follow-up side counts — using the same summarizeJudge the gate uses.
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = process.argv[2] ?? path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a');
const { summarizeJudge } = await import(`file:///${PROJ}/electron/test/golden/interview60.metrics.mjs`);
const files = fs.readdirSync(RUN).filter((f) => /^interview60\.judge(\..+)?\.json$/.test(f) && !/pairs|verdicts/.test(f));
console.log(path.basename(RUN));
for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(RUN, f), 'utf8'));
    const s = summarizeJudge(j);
    const extra = [s.long?.n ? `long ${s.long.acceptable}/${s.long.n}` : '', s.followup?.n ? `follow-ups ${s.followup.acceptable}/${s.followup.n}` : ''].filter(Boolean).join(', ');
    const arm = f.replace(/^interview60\.judge\.?/, '').replace(/\.json$/, '') || 'in-app (the hour)';
    console.log(`  ${arm.padEnd(26)} grader ${j.graderPrompt ?? '?'}  mains ${String(s.n).padStart(3)}: acceptable ${String(s.acceptable).padStart(3)}  weak ${String(s.weak).padStart(2)}  wrong ${s.wrong}${s.errors ? `  errors ${s.errors}` : ''}${extra ? '   ' + extra : ''}`);
}
