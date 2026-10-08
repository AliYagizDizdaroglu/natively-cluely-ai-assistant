// Ids, kinds, ages and booleans only — never prints question text.
// Checks the spec's ledger rules (supersede replace-by-turn, 60 s sameAnchor dedup) against the
// real s50m / s50l dispatch sequences, and how often a follow-up shares >= 50% content words with
// its parent (the lax direction sameAnchor accepts).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-context/';
const ref = await import(pathToFileURL(SP + 'earlierQuestions.ref.mjs').href);
const { idsForDispatches } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.prompts.mjs')).href);
const { SCENARIO50 } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/scenario50.questions.mjs')).href);
const DISPATCH_ANY = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|supersede|drop|hold|mark) .*?question=("(?:[^"\\]|\\.)*")\s*$/gm;
const TURN = /^(\S+) \[LOG\] \[Main\] turn: (close reason=\S+|gate=\S+)/gm;
for (const run of ['2026-09-22T08-22-50-s50m', '2026-09-21T08-22-34-s50l']) {
  const RUN = path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs', run);
  const dbg = fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8');
  const TL = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.timeline.json'), 'utf8'));
  const all = [...dbg.matchAll(DISPATCH_ANY)].map((m) => ({ at: m[1], kind: m[2], question: JSON.parse(m[3]) }));
  const counts = {}; for (const d of all) counts[d.kind] = (counts[d.kind] ?? 0) + 1;
  const closes = {}; for (const m of dbg.matchAll(TURN)) if (m[2].startsWith('close')) closes[m[2]] = (closes[m[2]] ?? 0) + 1;
  const ans = all.filter((d) => d.kind === 'answer' || d.kind === 'supersede');
  const ids = idsForDispatches(ans.map((d) => ({ at: d.at, question: d.question })), TL);
  console.log(`\n${run}: dispatch kinds ${JSON.stringify(counts)} closes ${JSON.stringify(closes)}`);
  const seq = ans.map((d, i) => `${ids[i]?.id ?? ids[i] ?? '?'}${d.kind === 'supersede' ? '(S)' : ''}`);
  // ids with >1 entry
  const per = {}; ans.forEach((d, i) => { const id = ids[i]?.id ?? String(ids[i]); (per[id] ??= []).push({ ...d, t: Date.parse(d.at) }); });
  for (const [id, es] of Object.entries(per)) if (es.length > 1) console.log(`  multi-entry ${id}: ${es.map((e) => e.kind + '@+' + Math.round((e.t - es[0].t) / 1000) + 's').join(' ')} sameAnchorPairs=${es.slice(1).map((e, k) => ref.sameAnchor(es[k].question, e.question)).join(',')}`);
  // spec dedup: consecutive entries < 60 s apart and sameAnchor, DIFFERENT ids
  for (let i = 1; i < ans.length; i++) {
    const dt = (Date.parse(ans[i].at) - Date.parse(ans[i - 1].at)) / 1000;
    const a = ids[i - 1]?.id ?? ids[i - 1], b = ids[i]?.id ?? ids[i];
    if (dt < 60 && a !== b) console.log(`  <60s different-id consecutive: ${a} -> ${b} dt=${dt.toFixed(1)}s sameAnchor=${ref.sameAnchor(ans[i - 1].question, ans[i].question)}`);
  }
}
// Roster: follow-up vs its parent (the main before it), sameAnchor and the lax overlap direction
let sa = 0, n = 0; const hits = [];
for (let i = 0; i < SCENARIO50.length; i++) {
  const it = SCENARIO50[i]; if (!/F$/.test(it.id)) continue;
  const parent = SCENARIO50.find((x) => x.id === it.id.replace(/F$/, ''));
  if (!parent) continue; n++;
  const s = ref.sameAnchor(parent.q, it.q);
  if (s) { sa++; hits.push(`${it.id}(${ref.overlap(it.q, parent.q).toFixed(2)})`); }
}
console.log(`\nroster follow-ups sameAnchor to their own parent: ${sa}/${n} ${hits.join(' ')}`);
// Short invented follow-ups (plain language) vs a sample main: how sameAnchor treats them
const shorts = ['Why?', 'Why that one?', 'How would that scale?', 'And what about cost?', 'Can you make that faster?', 'What if it fails?', 'Why not use a queue instead?', 'How would you test that design?'];
const mains = SCENARIO50.filter((x) => !/F$/.test(x.id));
for (const s of shorts) {
  const k = mains.filter((m) => ref.sameAnchor(m.q, s)).length;
  console.log(`  short "${s}": sameAnchor to ${k}/${mains.length} scenario50 mains; gate=${ref.gate(s).cue}`);
}
