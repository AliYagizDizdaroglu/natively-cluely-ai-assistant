// Ids, times, kinds, lengths, overlaps only — never prints question text.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-context/';
const ref = await import(pathToFileURL(SP + 'earlierQuestions.ref.mjs').href);
const { idsForDispatches } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.prompts.mjs')).href);
const { SCENARIO50 } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/scenario50.questions.mjs')).href);
const RE = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|supersede) source=(\w+) .*?question=("(?:[^"\\]|\\.)*")\s*$/gm;
for (const run of ['2026-09-22T08-22-50-s50m', '2026-09-21T08-22-34-s50l']) {
  const RUN = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs', run);
  const dbg = fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8');
  const TL = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.timeline.json'), 'utf8'));
  const ans = [...dbg.matchAll(RE)].map((m) => ({ at: m[1], kind: m[2], src: m[3], q: JSON.parse(m[4]) }));
  const ids = idsForDispatches(ans.map((d) => ({ at: d.at, question: d.q })), TL);
  console.log(`\n${run}`);
  ans.forEach((d, i) => {
    const id = ids[i]?.id ?? ids[i];
    const prev = ans[i - 1];
    const dt = prev ? ((Date.parse(d.at) - Date.parse(prev.at)) / 1000).toFixed(1) : '-';
    // best roster match by overlap
    let best = null, bs = -1; for (const it of SCENARIO50) { const s = ref.overlap(it.q, d.q); if (s > bs) { bs = s; best = it.id; } }
    const sa = prev ? ref.sameAnchor(prev.q, d.q) : false;
    if (i < 12 || sa || d.kind === 'supersede' || best !== id) console.log(`  #${i} ${d.at.slice(11, 19)} ${d.kind} src=${d.src} window=${id} bestRoster=${best}(${bs.toFixed(2)}) chars=${d.q.length} dtPrev=${dt}s sameAnchorPrev=${sa}`);
  });
}
