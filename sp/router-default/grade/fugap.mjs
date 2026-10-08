// Throwaway: gap between each follow-up and its parent in r1 (ids and seconds only).
import fs from 'fs';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-07T00-22-47-router-default-r1/';
const p = JSON.parse(fs.readFileSync(R + 'interview60.judge.pairs.json', 'utf8')).items;
const { LIVE40 } = await import('file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/live40.questions.mjs').catch(() => ({}));
const roster = LIVE40 || [];
const at = Object.fromEntries(p.map((x) => [x.id, Date.parse(x.dispatchedAt) || x.dispatchedAt]));
const fus = roster.filter((i) => i.level === 'followup');
console.log('follow-ups in roster', fus.length);
for (const f of fus) console.log(f.id, 'parent', f.parent, 'gap s', at[f.id] && at[f.parent] ? ((at[f.id] - at[f.parent]) / 1000).toFixed(0) : '?');
