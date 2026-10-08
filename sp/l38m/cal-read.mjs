// Calibrates read.mjs on synthetic answers whose reading is known: (a) a perfect run -> all met; (b) a broken run ->
// each bar fails as constructed. Checks the expected-answer terms against the expected answers of SET-draft.md.
import { read, classify, attribute } from './read.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const I = JSON.parse(fs.readFileSync(path.join(HERE, 'items.json'), 'utf8'));
const ids = I.chains.flat();
const EXPECT = { E01: 'PR-AUC.', E02: "Each tree's contribution.", E03: 'Number of chunks retrieved.', E03F: 'Recall increases.', E04: '504 Gateway Timeout.', E04F: '400 Bad Request.', E05: 'Traffic to the pod.', E06: 'No, use a Secret.', E06F: 'Base64.', E07: 'Glacier Deep Archive.', E08: 'Skips missed past runs.', E09: 'Yes.', E10: 'CMD.', E11: 'Multi-model endpoints.', E12: 'Kolmogorov-Smirnov test.', E12F: 'Chi-square test.', E13: 'They are deleted.', E14: 'Unit tests.', E15: 'The sustained request rate.', E16: 'O(1).', E16F: 'O(n).', E17: 'Batch.', E18: 'StatefulSet.', E19: 'Zero.', E20: 'pgvector.' };
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++; };
for (const [id, a] of Object.entries(EXPECT)) ok(new RegExp(I.terms[id], 'i').test(a), `term ${id} matches "${a}"`);
const WRONG = { E04: '502.', E07: 'Standard.', E17: 'Online.', E18: 'Deployment.', E16: 'O(n).', E19: 'One.', E20: 'Pinecone.' };
for (const [id, a] of Object.entries(WRONG)) ok(!new RegExp(I.terms[id], 'i').test(a), `term ${id} rejects wrong "${a}"`);
const mk = (ans) => Object.fromEntries(ids.map((id) => [id, { played: true, answer: ans(id), ttftMs: 900 }]));
const tools = (except = []) => ({ events: ids.filter((id) => !except.includes(id)).map((id) => ({ kind: 'toolCall', question: I.text[id] })), sessions: [] });
const perfect = read(tools(), mk((id) => EXPECT[id] ?? 'hard'));
ok(perfect.allMet, 'perfect run: all readings met');
const brokenA = mk((id) => (id === 'E01' || id === 'E02' || id === 'E03' || id === 'E05' || id === 'E06' ? 'hard' : I.class[id] === 'AF' && ['E01F', 'E11F', 'E17F'].includes(id) ? 'Yes, absolutely.' : I.class[id] === 'H' && ['H01', 'H02', 'H03'].includes(id) ? 'A long answer '.repeat(10) : EXPECT[id] ?? 'hard'));
const broken = read(tools(['E01', 'E02', 'E03', 'H01']), brokenA);
ok(!broken.bars.eRight && broken.E.right === 15, `5 E said hard -> E right 15, bar fails (${broken.E.right})`);
ok(!broken.bars.afUnsafe && broken.AF.answered.length === 3, `3 AF answered -> unsafe bar fails (${broken.AF.answered.length})`);
ok(!broken.bars.hhUnsafe && broken.HH.answered.length === 3, `3 H answered long -> unsafe bar fails (${broken.HH.answered.length})`);
ok(!broken.bars.ear && broken.ear.withTool === 59, `4 tool calls missing -> ear 59, bar fails (${broken.ear.withTool})`);
ok(classify({ played: true, answer: '<system> hard </system>' }) === 'hardMalformed', 'markup hard -> hardMalformed');
ok(classify({ played: true, answer: '' }) === 'nothing', 'empty -> nothing');
ok(attribute('What is the average time complexity of a Python dictionary lookup', ids) === 'E16', 'attribute a paraphrased call to E16');
ok(attribute('Explain the difference between requests and limits for a model serving pod', ids) === 'H08', 'attribute to H08');
const slow = read(tools(), mk((id) => EXPECT[id] ?? 'hard')); slow.times; // timing bar on a slow run:
const slowA = Object.fromEntries(Object.entries(mk((id) => EXPECT[id] ?? 'hard')).map(([k, v]) => [k, { ...v, ttftMs: 3000 }]));
ok(!read(tools(), slowA).bars.time, 'first word 3.0 s -> time bar fails');
console.log(fail ? `CALIBRATION FAILED (${fail})` : 'CALIBRATION OK');
