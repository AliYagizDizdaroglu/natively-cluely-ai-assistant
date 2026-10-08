// Throwaway (user asked to SEE examples, chat only, nothing committed): per id, roster tags, Live-all answer, r1 in-app answer + its cue block.
import fs from 'fs';
const ids = process.argv.slice(2);
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
const LAB = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/';
const { LIVE40 } = await import('file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/live40.questions.mjs');
const la = JSON.parse(fs.readFileSync(LAB + 'router-default/liveall/runs/liveall-r1.merged.answers.json', 'utf8'));
const laArr = Array.isArray(la) ? la : (la.answers || la.items || Object.values(la));
const pairs = JSON.parse(fs.readFileSync(MAIN + 'interview60.runs/2026-10-07T00-22-47-router-default-r1/interview60.judge.pairs.json', 'utf8')).items;
const key = JSON.parse(fs.readFileSync(LAB + 'cue-grader/keyhold/key.r1-inapp.json', 'utf8')).items;
const pf = fs.readdirSync(LAB + 'cue-grader/pairs').map((f) => JSON.parse(fs.readFileSync(LAB + 'cue-grader/pairs/' + f, 'utf8')));
const cueOf = (id) => { const q = Object.keys(key).find((k) => key[k].id === id); if (!q) return null;
  for (const p of pf) { const items = p.items || p; if (items[q] && (p.base === 'r1-inapp' || JSON.stringify(items[q]).length)) return items[q]; } return null; };
for (const id of ids) {
  const r = LIVE40.find((i) => i.id === id); const l = laArr.find((x) => x.id === id); const p = pairs.find((x) => x.id === id);
  console.log(`\n=== ${id} | ${r.class === 'H' || id.startsWith('RH') ? 'hard' : 'easy'} | ${r.level === 'followup' ? 'follow-up of ' + r.parent : 'main'} | topic ${r.topic}`);
  console.log('Q:', r.q || r.question || r.text);
  console.log('LIVE-ALONE:', l ? (l.spoken || l.text || l.answer) : '(none)');
  console.log('APP ANSWER:', p ? p.answer : '(none)');
  const c = cueOf(id); console.log('APP CUES:', c ? JSON.stringify(c.cues || c.block || c.lines || c) : '(none: Live-shown or unjoined)');
}
