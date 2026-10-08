// Scratch, read-only: graderModel / graderPrompt / item counts / verdict-class counts of the merged in-app judge files of h40a-h40c. Ids and counts only.
import fs from 'node:fs';
import path from 'node:path';
const RUNS = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
for (const r of ['2026-09-24T08-20-12-h40a', '2026-09-26T11-39-51-h40b', '2026-09-29T11-42-00-h40c']) {
    const j = JSON.parse(fs.readFileSync(path.join(RUNS, r, 'interview60.judge.json'), 'utf8'));
    const cls = {};
    const kinds = {};
    for (const v of Object.values(j.items)) { cls[v.verdict] = (cls[v.verdict] ?? 0) + 1; kinds[v.kind] = (kinds[v.kind] ?? 0) + 1; }
    const keys = Object.keys(j.items);
    console.log(`${r.slice(-4)}: graderModel ${j.graderModel} stamp ${j.graderPrompt} model ${j.model} items ${keys.length} verdicts ${JSON.stringify(cls)} kinds ${JSON.stringify(kinds)} dup-keys ${keys.filter((k) => k.includes('#')).join(',') || '-'}`);
}
