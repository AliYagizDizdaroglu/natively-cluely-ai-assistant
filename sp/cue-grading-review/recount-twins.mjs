// Recount twin cue blocks (ids and counts only; never cue text, answers or prompts).
import fs from 'node:fs'; import path from 'node:path';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d';
const words = (s) => (String(s).trim().match(/\S+/g) ?? []).length;
const files = ['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3',
  'gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r3',
  'gemini-3.5-flash-lite_captured-no-cues-high', 'gemini-3.5-flash-lite_high', 'gemini-3.1-flash-lite_low'];
let shownShape = false;
for (const f of files) {
  const p = path.join(RUN, `interview60.answers.${f}.json`);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const arr = Array.isArray(j) ? j : (j.items ?? j.answers ?? Object.values(j));
  const list = Array.isArray(arr) ? arr : Object.values(arr);
  if (!shownShape) { console.log('top keys', Array.isArray(j) ? 'array' : Object.keys(j)); console.log('item keys', Object.keys(list[0])); console.log('cues type', typeof list[0].cues, Array.isArray(list[0].cues)); shownShape = true; }
  const withCues = list.filter((x) => x.cues != null && (Array.isArray(x.cues) ? x.cues.length > 0 : String(x.cues).trim() !== ''));
  const absent = list.filter((x) => !withCues.includes(x)).map((x) => x.id);
  const emptySpoken = list.filter((x) => x.spoken != null && !String(x.spoken).trim()).map((x) => x.id);
  let over3 = 0, overW = 0, notation = 0, notationIds = [], linesTot = 0;
  for (const x of withCues) {
    const ls = Array.isArray(x.cues) ? x.cues : String(x.cues).split(/\r?\n/).filter(Boolean);
    linesTot += ls.length;
    if (ls.length > 3) over3++;
    const capped = ls.slice(0, 3);
    if (capped.some((l) => words(l) > 5)) overW++;
    if (capped.some((l) => /[$\\^_{}]|\\frac|\\log/.test(l))) { notation++; notationIds.push(x.id); }
  }
  console.log(`${f}: items ${list.length}, blocks ${withCues.length}, absent [${absent.join(',')}], empty spoken [${emptySpoken.join(',')}], lines ${linesTot}, >3 lines ${over3}, a capped line >5 words ${overW}, notation-char blocks ${notation} [${notationIds.join(',')}]`);
}
