// The roster texts behind the map: every follow-up flown in the graded hours, with its parent's text, the median gap,
// in-app and twin acceptance, how often the parent was absent, and the answer-preview length the prompt carried.
// Roster texts only (the interviewer's scripted questions); no prompt, answer or profile text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const S50 = (await import(pathToFileURL(`${G}/scenario50.questions.mjs`).href)).SCENARIO50;
const H40 = (await import(pathToFileURL(`${G}/holdout40.questions.mjs`).href)).HOLDOUT40;
const rows = JSON.parse(fs.readFileSync(path.join(HERE, 'followup-map.json'), 'utf8'));
const med = (a) => { const x = a.filter((v) => v !== null).sort((p, q) => p - q); return x.length ? x[Math.floor(x.length / 2)] : null; };
const out = [];
for (const id of [...new Set(rows.map((r) => r.id))].sort()) {
    const rs = rows.filter((r) => r.id === id);
    const roster = id.startsWith('R') ? H40 : S50;
    const f = roster.find((x) => x.id === id), p = roster.find((x) => x.id === f.chain);
    const ans = rs.filter((r) => r.grade !== '-');
    out.push(`${id} (parent ${f.chain}; gap ~${med(rs.map((r) => r.gap))?.toFixed(0)} s; in-app ${ans.filter((r) => r.grade === 'A').length}/${ans.length}; twins ${rs.reduce((n, r) => n + r.twinsA, 0)}/${rs.reduce((n, r) => n + r.twinsN, 0)}; parent absent ${ans.filter((r) => r.parentCoverInTranscript < 0.5).length}/${ans.length}; preview chars ~${med(rs.map((r) => r.prevPreviewChars))})`);
    out.push(`   PARENT  : ${p.q}`);
    out.push(`   FOLLOWUP: ${f.q}`);
}
fs.writeFileSync(path.join(HERE, 'followup-texts.out.txt'), out.join('\n') + '\n');
console.log(`wrote ${out.length / 3} follow-ups`);
