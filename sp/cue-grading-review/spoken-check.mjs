// Does a twin's `spoken` carry the cue block or markers, and does it equal the judge pairs' `answer`? Counts only.
import fs from 'node:fs'; import path from 'node:path';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d';
const sets = [['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high'], ['gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r2'], ['gemini-3.5-flash-lite_captured-high-r3', 'gemini-3.5-flash-lite_captured-high-r3'], ['gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low']];
for (const [a, p] of sets) {
  const ans = JSON.parse(fs.readFileSync(path.join(RUN, `interview60.answers.${a}.json`), 'utf8'));
  const pairs = JSON.parse(fs.readFileSync(path.join(RUN, `interview60.judge.pairs.${p}.json`), 'utf8')).items;
  const judge = JSON.parse(fs.readFileSync(path.join(RUN, `interview60.judge.${p}.json`), 'utf8')).items;
  let cueMark = 0, numLine = 0, eq = 0, diff = 0, missing = 0, markers = 0, dollar = 0;
  for (const [id, x] of Object.entries(ans)) {
    const s = String(x.spoken ?? '');
    if (/__CUES__/.test(s)) cueMark++;
    if (/^\s*\d+\s*\|/m.test(s)) numLine++;
    if (/__[A-Z ]+__/.test(s)) markers++;
    if (/\$/.test(s)) dollar++;
    const pr = pairs.find((q) => q.id === id);
    if (!pr) { missing++; continue; }
    if (String(pr.answer ?? '').trim() === s.trim()) eq++; else diff++;
  }
  const corr = {}; for (const v of Object.values(judge)) corr[v.correctness] = (corr[v.correctness] || 0) + 1;
  console.log(`${a}: spoken with __CUES__ ${cueMark}, with an 'N|' line ${numLine}, with __X__ markers ${markers}, with '$' ${dollar}; pairs answer == spoken ${eq}, differs ${diff}, no pair ${missing}; judge items ${Object.keys(judge).length}, correctness hist ${JSON.stringify(corr)}`);
}
const inj = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.judge.json'), 'utf8')).items;
const c = {}; for (const v of Object.values(inj)) c[v.correctness] = (c[v.correctness] || 0) + 1;
console.log('in-app judge correctness hist', JSON.stringify(c), 'items', Object.keys(inj).length, '; correctness 0 ids', Object.values(inj).filter((v) => v.correctness === 0).map((v) => v.id).join(','), '; correctness 1 ids', Object.values(inj).filter((v) => v.correctness === 1).map((v) => v.id).join(','));
