// Known-answer cases of P1 (l38base-dispatch.txt + grade/check-classify-r40.mjs), A3.6: the dispatch text is the registration's Appendix B byte for byte; the calibration reader scores
// a classifier output over the 22 calibration turns (22/22 required) and flags every kind of invalid output. No model call: the real 22/22-per-classifier check (c3, c4) is tomorrow's.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { calRun } from './cal-util.mjs';
import { R40, SP, readJson, sha256 } from './r40-common.mjs';
import { scoreClassifier, loadRefs, consensus } from './grade/check-classify-r40.mjs';

const C = calRun('p1');
const reg = fs.readFileSync(`${R40}/PREREGISTER-router40.md`, 'utf8').replace(/\r\n/g, '\n');
const i = reg.indexOf('## Appendix B'), open = reg.indexOf('```\n', i) + 4, close = reg.indexOf('\n```', open);
const appB = reg.slice(open, close);
const p1 = fs.readFileSync(`${R40}/l38base-dispatch.txt`, 'utf8');
C.check('P1-1', 'l38base-dispatch.txt vs the registration\'s Appendix B block', 'byte-equal (18 lines)', `${p1 === appB ? 'byte-equal' : 'DIFFERENT'} (${p1.split('\n').length} lines, sha12 ${sha256(p1).slice(0, 12)})`, p1 === appB && p1.split('\n').length === 18);
const seal = reg.indexOf('\nsha256 (of every byte above this line)');
const above = reg.slice(0, seal + 1);
C.check('P1-1b', "the registration itself is the sealed text (every byte above its seal line)", '2d38dd89a1bc0fd4e97943cbda07291939afd555db85c31472462bd51860c16f', sha256(above), sha256(above) === '2d38dd89a1bc0fd4e97943cbda07291939afd555db85c31472462bd51860c16f');
const once = (s) => p1.split(s).length - 1;
C.check('P1-2', 'placeholders <TURNS>, <CAL>, <OUT> each appear exactly once; the task counts 47 and 22', '1,1,1; "47 interviewer turns", "22 more turns"', `${once('<TURNS>')},${once('<CAL>')},${once('<OUT>')}; ${/47 interviewer turns/.test(p1)}, ${/22 more turns/.test(p1)}`, once('<TURNS>') === 1 && once('<CAL>') === 1 && once('<OUT>') === 1 && /47 interviewer turns/.test(p1) && /22 more turns/.test(p1));
C.check('P1-2b', "the definition's clauses are l38base's (the 'When in doubt, HARD' sentence and the follow-up rule are present)", 'both present', `${/When in doubt, HARD/.test(p1)}, ${/Follow-ups are classified on their own text/.test(p1)}`, /When in doubt, HARD/.test(p1) && /Follow-ups are classified on their own text/.test(p1));

// the calibration reader
const refs = loadRefs();
const perfect = Object.fromEntries([...refs.turnIds.map((t) => [t, { route: 'HARD', reason: 'a turn' }]), ...Object.entries(refs.calKey).map(([k, m]) => [k, { route: m.cls === 'simple' ? 'EASY' : 'HARD', reason: 'known answer' }])]);
let r = scoreClassifier(perfect, refs);
C.check('P1-3', 'a perfect synthetic classifier output (12 simple -> EASY, 10 hard -> HARD, all 69 keys)', 'valid, 22/22', `${r.valid ? 'valid' : `invalid ${r.problems[0]}`}, ${r.calCorrect}/${r.calN}`, r.valid && r.calCorrect === 22 && r.calN === 22 && Object.values(refs.calKey).filter((m) => m.cls === 'simple').length === 12);
const flip = (k) => ({ ...perfect, [k]: { ...perfect[k], route: perfect[k].route === 'EASY' ? 'HARD' : 'EASY' } });
const simpleKey = Object.entries(refs.calKey).find(([, m]) => m.cls === 'simple')[0], hardKey = Object.entries(refs.calKey).find(([, m]) => m.cls === 'hard')[0];
r = scoreClassifier(flip(simpleKey), refs);
C.check('P1-4', 'one simple turn called HARD', '21/22, miss named', `${r.calCorrect}/${r.calN}, misses [${r.misses.join(',')}]`, r.calCorrect === 21 && r.misses.join() === simpleKey);
r = scoreClassifier(flip(hardKey), refs);
C.check('P1-4b', 'one hard turn called EASY', '21/22, miss named', `${r.calCorrect}/${r.calN}, misses [${r.misses.join(',')}]`, r.calCorrect === 21 && r.misses.join() === hardKey);
const drop = { ...perfect }; delete drop.T47;
r = scoreClassifier(drop, refs);
C.check('P1-5', 'a missing turn key (T47)', 'invalid', r.valid ? 'valid' : `invalid: ${r.problems[0]}`, !r.valid && /T47/.test(r.problems[0]));
r = scoreClassifier({ ...perfect, T01: { route: 'MEDIUM', reason: 'x' } }, refs);
C.check('P1-5b', 'a route that is not EASY|HARD', 'invalid', r.valid ? 'valid' : `invalid: ${r.problems[0]}`, !r.valid);
r = scoreClassifier({ ...perfect, T02: { route: 'HARD', reason: 'one two three four five six seven eight nine ten eleven twelve thirteen' } }, refs);
C.check('P1-5c', 'a reason longer than 12 words', 'invalid', r.valid ? 'valid' : `invalid: ${r.problems[0]}`, !r.valid);
r = scoreClassifier({ ...perfect, ZZ: { route: 'HARD', reason: 'x' } }, refs);
C.check('P1-5d', 'a key that was not asked for', 'invalid', r.valid ? 'valid' : `invalid: ${r.problems[0]}`, !r.valid);
// the independent known answer: l38base's own classifiers' calibration output, scored by the old cal-read.mjs and by this reader
const oldV = readJson(`${SP}/l38base/blind/cal-verdicts.json`);
const adapted = Object.fromEntries(Object.entries(oldV).map(([k, v]) => [k, { route: v.v, reason: 'adapted' }]));
r = scoreClassifier(adapted, { turnIds: [], calKey: refs.calKey });
const old = spawnSync(process.execPath, [`${SP}/l38base/cal-read.mjs`], { encoding: 'utf8' });
const oldCounts = /simple called EASY (\d+)\/12 .*; hard called HARD (\d+)\/10/.exec(old.stdout) ?? [];
C.check('P1-6', "cross-check against l38base's own cal-read.mjs on its recorded calibration output", `old reader: ${oldCounts[1]}+${oldCounts[2]} = ${Number(oldCounts[1]) + Number(oldCounts[2])}/22; this reader the same`, `this reader ${r.calCorrect}/22`, r.calCorrect === Number(oldCounts[1]) + Number(oldCounts[2]) && r.calCorrect === 22);
// consensus labels: both agree -> the label, else split
const o2 = JSON.parse(JSON.stringify(perfect)); o2.T01 = { route: 'EASY', reason: 'x' }; const o1 = JSON.parse(JSON.stringify(perfect)); o1.T01 = { route: 'HARD', reason: 'x' };
const cons = consensus(o1, o2, refs.tMap);
C.check('P1-7', 'consensus map: classifiers disagreeing on T01 -> that item `split`, an agreement keeps its label', 'RE01 split; RH01 HARD', `${refs.tMap.T01.item} ${cons[refs.tMap.T01.item]}; ${refs.tMap.T02.item} ${cons[refs.tMap.T02.item]}`, cons[refs.tMap.T01.item] === 'split' && cons[refs.tMap.T02.item] === 'HARD' && Object.keys(cons).length === 47);
C.finish();
