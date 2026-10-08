import fs from 'node:fs';
const B = process.argv[2];
const vOf = ({ correctness: c, on_topic: t, delivery: d }) => c === 0 || t === 0 ? 'X' : c === 2 && t === 2 && d >= 1 ? 'A' : 'w';
const per = {};
for (const f of fs.readdirSync(B).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
    const n = f.match(/\d+/)[0], K = JSON.parse(fs.readFileSync(`${B}/${f}`, 'utf8')), V = JSON.parse(fs.readFileSync(`${B}/verdicts.blind-${n}.json`, 'utf8'));
    for (const [k, { arm, rep, id }] of Object.entries(K)) ((per[arm] ??= {})[id] ??= ['?', '?', '?'])[rep - 1] = vOf(V[k]);
}
for (const [arm, ids] of Object.entries(per)) {
    const m = Object.entries(ids).filter(([, r]) => r.some((x) => x !== 'A')).map(([id, r]) => `${id} ${r.join('')}`);
    console.log(`${arm} (${m.length} questions): ${m.join(' · ')}`);
}