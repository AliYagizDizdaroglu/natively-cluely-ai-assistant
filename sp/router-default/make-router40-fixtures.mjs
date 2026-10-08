// Task 4 step 1: router40's 47 real outputs (RH05~a1 excluded) -> stage\task-4 fixtures. Prints ids and counts only, never text.
import fs from 'node:fs'; import path from 'node:path';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router40/runs/';
const OUT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/stage/task-4/electron/services/fixtures/';
const a = JSON.parse(fs.readFileSync(RUNS + 'router40-R.answers.json', 'utf8'));
const r = JSON.parse(fs.readFileSync(RUNS + 'router40-R.json', 'utf8'));
const ids = Object.keys(a.answers).filter((id) => id !== 'RH05~a1');
if (ids.length !== 47) { console.log('FAIL expected 47 items, got', ids.length); process.exit(1); }
const answers = ids.map((id) => ({ id, route: a.answers[id].route, class: a.answers[id].class, text: a.answers[id].text }));
let bad = 0;
const replay = ids.map((id) => {
  const text = a.answers[id].text;
  const m = r.metrics[id];
  let cum = 0; const chunks = [];
  for (const e of r.events) {
    if (e.kind !== 'outputTx' || e.item !== id || !(e.sinceClipEnd >= 0)) continue;
    chunks.push({ atMs: e.sinceClipEnd, text: text.slice(cum, cum + e.chars) }); cum += e.chars;
  }
  if (cum !== text.length) { bad++; console.log('MISMATCH', id, 'chars', cum, 'text', text.length); }
  return { id, route: a.answers[id].route, text, chunks, generationCompleteMs: m.generationCompleteMs, turnCompleteMs: m.turnCompleteMs };
});
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + 'router40-answers.json', JSON.stringify(answers, null, 1));
fs.writeFileSync(OUT + 'router40-replay.json', JSON.stringify(replay, null, 1));
console.log('items', ids.length, 'mismatches', bad, 'routes', JSON.stringify(answers.reduce((o, x) => (o[x.route] = (o[x.route] || 0) + 1, o), {})));
