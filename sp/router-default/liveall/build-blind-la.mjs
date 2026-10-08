// build-blind-la.mjs: the blind export of the Live-all sample (reported-only comparison, changes no verdict).
// For every roster id with a Live-all answer: TWO entries, [LIVEALL] = the Live-all answer (runs/liveall-r1.merged.answers.json, the et10 extraction) and [INAPP] = the r1 in-app shown answer
// (interview60.judge.pairs.json `answer`, as the task names it). Both carry the SAME `question` (the grader question, follow-ups with their parent text, from the r1 judge pairs) and the SAME
// `heard` (the scripted question, as build-blind-rd.mjs does), so nothing in an entry tells its arm. One packet, shuffled, keyed q001...; the key lives in keyhold\key-liveall.json,
// never inside the packet dir. A roster id whose Live-all answer is missing or blank (a hole) is exported on neither arm and listed in the key.
// Prints counts only, never question or answer text.
//   node build-blind-la.mjs [--answers <file>] [--out-dir <dir>] [--key-dir <dir>] [--allow-partial]     (--allow-partial / --answers / dirs: calibration seams)
import fs from 'node:fs';
import path from 'node:path';
import { sha256, loadRoster, R1, HERE, SP } from './common.mjs';
import { rng, shuffle } from '../build-blind-rd.mjs';

export const SEED = 'blind:router-default:liveall';
const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
const ANS = argOf('--answers') ?? `${HERE}/runs/liveall-r1.merged.answers.json`;
const OUT = path.resolve(argOf('--out-dir') ?? `${HERE}/blind`);
const KEYDIR = path.resolve(argOf('--key-dir') ?? `${SP}/router-default/keyhold`);
const PARTIAL = argv.includes('--allow-partial');
const keyFile = path.join(KEYDIR, 'key-liveall.json'), recFile = path.join(KEYDIR, 'build-record-liveall.json'), packFile = path.join(OUT, 'pairs.la-1.json');
if (fs.existsSync(keyFile) || fs.existsSync(recFile) || fs.existsSync(packFile)) refuse('the key, the build record or the packet already exists; refusing to overwrite');
{ const rel = path.relative(OUT, KEYDIR); if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) refuse('the key dir is inside the packet dir; the key is never shown to a grader'); }

const roster = await loadRoster(), byId = new Map(roster.map((r) => [r.id, r]));
const judgeRaw = fs.readFileSync(`${R1}/interview60.judge.pairs.json`), J = JSON.parse(judgeRaw.toString('utf8'));
const ansRaw = fs.readFileSync(ANS), A = JSON.parse(ansRaw.toString('utf8'));
const jById = new Map(J.items.map((i) => [i.id, i]));
if (J.items.length !== 47 || jById.size !== 47) refuse('r1 judge pairs: not 47 distinct items');
for (const r of roster) if (!jById.has(r.id)) refuse(`${r.id}: no r1 in-app item`);
if (!PARTIAL && Object.keys(A).length !== 47) refuse(`answers file has ${Object.keys(A).length} ids, need 47`);

const flat = [], holes = [], notPlayed = [];
for (const r of roster) {
    if (PARTIAL && !(r.id in A)) continue;
    const a = A[r.id], j = jById.get(r.id);
    if (!a?.played) { notPlayed.push(r.id); continue; }
    if (typeof a.answer !== 'string' || !a.answer.trim()) { holes.push(r.id); continue; }
    if (typeof j.answer !== 'string' || !j.answer.trim()) refuse(`${r.id}: the r1 in-app answer is blank`);
    if (r.level === 'followup' && !j.question.includes(' [Follow-up to: ')) refuse(`${r.id}: a follow-up without its parent text`);
    flat.push({ arm: 'LIVEALL', id: r.id, question: j.question, heard: r.q, answer: a.answer });
    flat.push({ arm: 'INAPP', id: r.id, question: j.question, heard: r.q, answer: j.answer });
}
if (!flat.length) refuse('nothing to export');
shuffle(flat, rng(SEED));
const items = [], km = {};
flat.forEach((x, i) => {
    const k = `q${String(i + 1).padStart(3, '0')}`;
    items.push({ key: k, id: k, kind: 'spoken', level: null, topic: null, question: x.question, heard: x.heard, source: 'answers-pass', answer: x.answer });
    const it = byId.get(x.id);
    km[k] = { arm: x.arm, id: x.id, route: it.route, class: it.class, level: it.level, parent: it.parent ?? null };
});
// the shuffle must not leave a pair adjacent in a way that names it, and nothing in the packet may carry an arm or an id: assert on the written shape
const keys = Object.keys(items[0]).sort().join(',');
if (keys !== 'answer,heard,id,key,kind,level,question,source,topic') refuse(`packet item shape ${keys}`);
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(KEYDIR, { recursive: true });
fs.writeFileSync(packFile, JSON.stringify({ model: J.model, rubric: J.rubric, items }, null, 1));
fs.writeFileSync(keyFile, JSON.stringify({ 'la-1': km, holes, notPlayed }, null, 1));
fs.writeFileSync(recFile, JSON.stringify({ seed: SEED, answersSha256: sha256(ansRaw), judgePairsSha256: sha256(judgeRaw), packetSha256: sha256(fs.readFileSync(packFile)), items: items.length, ids: flat.length / 2, holes, notPlayed }, null, 1));
console.log(`built 1 packet: ${items.length} items (${flat.length / 2} ids x 2 arms); holes ${holes.length} (${holes.join(',') || '-'}); not played ${notPlayed.length}; items without arm field ${items.filter((i) => 'arm' in i).length}`);
