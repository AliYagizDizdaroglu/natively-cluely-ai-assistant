// merge.mjs: the Live-all answers from the two sessions (session 1 = the whole roster until the server closed it with 1011 during RH14; session 2 = the one retry, a fresh session from RH12).
// Rule: an id takes its answer from session 1 when session 1 played it to a generationComplete (RE01..RH13); the rest (RH14 on) come from session 2. Session 2's replays of RH12 and RH13 are kept
// in its own file and are NOT used. Input: the et10 extractions runs/liveall-r1.answers.json (s1) and runs/liveall-r1-s2.answers.json (s2). Output: runs/liveall-r1.merged.answers.json
// (same shape as an et10 answers file + `src`). Prints counts and ids only.
import fs from 'node:fs';
import { HERE, loadRoster } from './common.mjs';
const rd = (f) => JSON.parse(fs.readFileSync(`${HERE}/runs/${f}`, 'utf8'));
const R1 = rd('liveall-r1.json'), A1 = rd('liveall-r1.answers.json'), A2 = rd('liveall-r1-s2.answers.json');
const roster = (await loadRoster()).map((r) => r.id);
const done1 = (id) => A1[id]?.played && R1.events.some((e) => e.item === id && e.kind === 'generationComplete' && e.sinceClipEnd != null);
const out = {}, src = { s1: [], s2: [], none: [] };
for (const id of roster) {
    if (done1(id)) { out[id] = { ...A1[id], src: 's1' }; src.s1.push(id); }
    else if (A2[id]?.played) { out[id] = { ...A2[id], src: 's2' }; src.s2.push(id); }
    else { out[id] = { played: false, src: 'none' }; src.none.push(id); }
}
fs.writeFileSync(`${HERE}/runs/liveall-r1.merged.answers.json`, JSON.stringify(out, null, 1));
console.log(`merged ${roster.length} ids: s1 ${src.s1.length} (${src.s1[0]}..${src.s1.at(-1)}), s2 ${src.s2.length} (${src.s2[0]}..${src.s2.at(-1)}), neither ${src.none.length}${src.none.length ? ': ' + src.none.join(',') : ''}`);
