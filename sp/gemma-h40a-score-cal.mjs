// Calibration for gemma-h40a-score-blind.mjs: synthetic verdicts over the REAL key files, with known
// answers. Gemma acceptable everywhere; 3.1 acceptable only on rep 1 at even id positions (weak
// otherwise); 3.5 acceptable on reps 1-2 and WRONG on rep 3. Expected, from 44 ids:
//   Gemma 44/44/44 · 3.1 22/0/0 · 3.5 44/44/0 with 44 wrong
//   Gemma vs 3.1 +110 (110/0) · Gemma vs 3.5 +44 (44/0) · 3.5 vs 3.1 +66 (66/0)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const REAL = `${SP}/gemma-h40a/blind`, CAL = `${SP}/gemma-h40a/blind-cal`;
fs.rmSync(CAL, { recursive: true, force: true });
fs.mkdirSync(CAL, { recursive: true });
const ids = [];
for (const f of fs.readdirSync(REAL).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
    const key = JSON.parse(fs.readFileSync(`${REAL}/${f}`, 'utf8'));
    fs.writeFileSync(`${CAL}/${f}`, JSON.stringify(key));
    for (const { id } of Object.values(key)) if (!ids.includes(id)) ids.push(id);
}
const order = JSON.parse(fs.readFileSync(`${REAL}/key.blind-1.json`, 'utf8')); // not used for order; ids from the scorer's IDS
const { IDS } = await import(`file:///${SP}/gemma-h40a-blind-pairs.mjs`);
const even = new Set(IDS.filter((_, i) => i % 2 === 0));
const A = { correctness: 2, on_topic: 2, delivery: 2 }, W = { correctness: 1, on_topic: 2, delivery: 2 }, X = { correctness: 0, on_topic: 2, delivery: 2 };
for (const f of fs.readdirSync(CAL).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
    const key = JSON.parse(fs.readFileSync(`${CAL}/${f}`, 'utf8')), V = {};
    for (const [k, { arm, rep, id }] of Object.entries(key)) {
        V[k] = arm.startsWith('Gemma') ? A : arm === '3.1-lite LOW' ? (rep === 1 && even.has(id) ? A : W) : rep === 3 ? X : A;
    }
    fs.writeFileSync(`${CAL}/${f.replace('key.', 'verdicts.')}`, JSON.stringify(V));
}
const out = execFileSync(process.execPath, [`${SP}/gemma-h40a-score-blind.mjs`], { env: { ...process.env, BLIND_DIR: CAL }, encoding: 'utf8' });
console.log(out);
const rows = JSON.parse(fs.readFileSync(`${CAL}/score.json`, 'utf8')).rows;
const want = { 'Gemma 26B MINIMAL': [44, 44, 44], '3.1-lite LOW': [even.size, 0, 0], '3.5-lite HIGH': [44, 44, 0] };
const bad = [];
for (const [arm, acc] of Object.entries(want)) { const r = rows.find((x) => x.arm === arm); if (JSON.stringify(r?.acc) !== JSON.stringify(acc)) bad.push(`${arm} acc ${JSON.stringify(r?.acc)} want ${JSON.stringify(acc)}`); }
if (rows.find((x) => x.arm === '3.5-lite HIGH')?.wrong !== 44) bad.push('3.5 wrong count');
for (const [re, net] of [[/Gemma 26B MINIMAL\s+vs 3\.1-lite LOW\s+n=132\s+net \+110\s+\(110 up \/ 0 down/, 110], [/Gemma 26B MINIMAL\s+vs 3\.5-lite HIGH\s+n=132\s+net \+44\s+\(44 up \/ 0 down/, 44], [/3\.5-lite HIGH\s+vs 3\.1-lite LOW\s+n=132\s+net \+66\s+\(66 up \/ 0 down/, 66]]) if (!re.test(out)) bad.push(`paired line for net +${net} not as expected`);
console.log(bad.length ? `CALIBRATION FAILED:\n  ${bad.join('\n  ')}` : `CALIBRATION OK: every known count reproduced (3.1 rep-1 even ids = ${even.size})`);
process.exit(bad.length ? 1 : 0);
