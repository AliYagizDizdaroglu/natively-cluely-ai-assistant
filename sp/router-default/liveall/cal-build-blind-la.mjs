// cal-build-blind-la.mjs: calibrates build-blind-la.mjs on the 3-item smoke run (temp dirs, --allow-partial): the key must decode every packet item back to the exact answer of its arm,
// both arms of an id must carry identical question/heard, the packet must carry no arm marker; then a BROKEN key (two keys swapped) must be caught by the same decoder.
// Prints counts only.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { HERE, R1 } from './common.mjs';
const T = `${HERE}/cal-tmp`;
fs.rmSync(T, { recursive: true, force: true }); fs.mkdirSync(T, { recursive: true });
fs.copyFileSync(`${HERE}/runs/liveall-r1-smoke.json`, `${T}/smoke.json`);
const x = spawnSync(process.execPath, [`${HERE}/../../et10/et-extract.mjs`, `${T}/smoke.json`], { encoding: 'utf8' });
if (x.status !== 0) { console.log(`extract exit ${x.status}`); process.exit(2); }
const b = spawnSync(process.execPath, [`${HERE}/build-blind-la.mjs`, '--answers', `${T}/smoke.answers.json`, '--out-dir', `${T}/blind`, '--key-dir', `${T}/keyhold`, '--allow-partial'], { encoding: 'utf8' });
console.log(b.stdout.trim());
if (b.status !== 0) process.exit(2);
const A = JSON.parse(fs.readFileSync(`${T}/smoke.answers.json`, 'utf8'));
const J = new Map(JSON.parse(fs.readFileSync(`${R1}/interview60.judge.pairs.json`, 'utf8')).items.map((i) => [i.id, i]));
const P = JSON.parse(fs.readFileSync(`${T}/blind/pairs.la-1.json`, 'utf8')).items;
const K = JSON.parse(fs.readFileSync(`${T}/keyhold/key-liveall.json`, 'utf8'))['la-1'];
function decode(key) {
    const bad = [], byId = {};
    for (const it of P) {
        const k = key[it.key]; if (!k) { bad.push(`${it.key}: no key`); continue; }
        const want = k.arm === 'LIVEALL' ? A[k.id].answer : J.get(k.id).answer;
        if (it.answer !== want) bad.push(`${it.key}: answer is not the ${k.arm} answer of ${k.id}`);
        (byId[k.id] ??= []).push(it);
    }
    for (const [id, two] of Object.entries(byId)) if (two.length !== 2 || two[0].question !== two[1].question || two[0].heard !== two[1].heard) bad.push(`${id}: arms differ in question/heard or not two entries`);
    return bad;
}
const clean = decode(K);
console.log(`decode, true key: ${clean.length} problems over ${P.length} items`);
const ks = Object.keys(K), broken = { ...K }; [broken[ks[0]], broken[ks[1]]] = [broken[ks[1]], broken[ks[0]]];
// swapping two keys of DIFFERENT ids must be caught; of the same id the answers would still differ (arms differ) so it is caught too
const swapped = decode(broken);
console.log(`decode, two keys swapped: ${swapped.length} problems (must be > 0)`);
const armMarkers = P.filter((it) => /LIVEALL|INAPP/.test(JSON.stringify(it))).length;
console.log(`packet items mentioning an arm: ${armMarkers} (must be 0)`);
process.exit(clean.length === 0 && swapped.length > 0 && armMarkers === 0 ? 0 : 1);
