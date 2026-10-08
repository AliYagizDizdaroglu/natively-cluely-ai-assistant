// L20c: the acceptable / weak / wrong table per sample (the judge's own verdictOf), and the graders' reasons for
// every grade that is not acceptable. Prints grader notes (about the answers), ids and counts: never an answer's text.
//   node verdict-table.mjs [--reasons live|app|all]
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/l20c`;
const { key, packets, arms, holes = [] } = JSON.parse(fs.readFileSync(`${SP}/l20c-key/key.json`, 'utf8'));
const slots = [{}, {}];
for (const p of Object.keys(packets)) for (const [i, g] of ['g1', 'g2'].entries()) Object.assign(slots[i], JSON.parse(fs.readFileSync(`${HERE}/blind/verdicts-${p}-${g}.json`, 'utf8')));
// interview60.judge.mjs verdictOf, verbatim
const verdictOf = ({ correctness, on_topic, delivery }) => (correctness === 0 || on_topic === 0 ? 'wrong' : correctness === 2 && on_topic === 2 && delivery >= 1 ? 'acceptable' : 'weak');
const keys = Object.keys(key);
const ORDER = ['app35-inapp', 'app35-twin1', 'app35-twin2', 'app35-twin3', 'br1-inapp', 'live38-r1', 'live38-r2', 'live38-r3'];
if (ORDER.some((a) => !arms.includes(a)) || arms.length !== ORDER.length) throw new Error(`arms differ: ${arms.join(',')}`);

console.log('per sample, counted per ANSWER as the mean of its two graders (so halves are one grader each):');
console.log('sample        answered  acceptable   weak  wrong   holes');
const tot = {};
for (const a of ORDER) {
    const ks = keys.filter((k) => key[k] === a);
    const n = (v) => ks.reduce((x, k) => x + slots.filter((s) => verdictOf(s[k]) === v).length, 0) / 2;
    const h = holes.filter((x) => x.startsWith(`${a} `)).length;
    tot[a] = { answered: ks.length, acceptable: n('acceptable'), weak: n('weak'), wrong: n('wrong'), holes: h };
    console.log(`${a.padEnd(13)} ${String(ks.length).padStart(8)} ${n('acceptable').toFixed(1).padStart(11)} ${n('weak').toFixed(1).padStart(6)} ${n('wrong').toFixed(1).padStart(6)} ${String(h).padStart(7)}`);
}
const sum = (as, f) => as.reduce((x, a) => x + tot[a][f], 0);
for (const [name, as] of [['app, 4 samples', ORDER.slice(0, 4)], ['Live, 3 reps', ORDER.slice(5)]]) {
    const ans = sum(as, 'answered');
    console.log(`${name.padEnd(15)} answered ${ans}: acceptable ${sum(as, 'acceptable').toFixed(1)} (${(100 * sum(as, 'acceptable') / ans).toFixed(1)}%), weak ${sum(as, 'weak').toFixed(1)} (${(100 * sum(as, 'weak') / ans).toFixed(1)}%), wrong ${sum(as, 'wrong').toFixed(1)} (${(100 * sum(as, 'wrong') / ans).toFixed(1)}%), holes ${sum(as, 'holes')}`);
}

console.log('\nwhy a grade is weak or wrong, per sample group (each grade counted once, by the FIRST axis that fails):');
for (const [name, as] of [['app, 4 samples', ORDER.slice(0, 4)], ['Live, 3 reps', ORDER.slice(5)]]) {
    const g = keys.filter((k) => as.includes(key[k])).flatMap((k) => slots.map((s) => s[k]));
    const bad = g.filter((x) => verdictOf(x) !== 'acceptable');
    const c0 = bad.filter((x) => x.correctness === 0).length, c1 = bad.filter((x) => x.correctness === 1).length;
    const t = bad.filter((x) => x.correctness === 2 && x.on_topic < 2).length, d = bad.filter((x) => x.correctness === 2 && x.on_topic === 2 && x.delivery === 0).length;
    console.log(`  ${name.padEnd(15)} grades ${g.length}, not acceptable ${bad.length}: correctness 0: ${c0}, correctness 1: ${c1}, correct but off the question: ${t}, correct and on topic but delivery 0: ${d}`);
}

const want = (() => { const i = process.argv.indexOf('--reasons'); return i > 0 ? process.argv[i + 1] : null; })();
if (want) {
    const pickArm = (a) => (want === 'all' ? true : want === 'live' ? a.startsWith('live38') : a.startsWith('app35'));
    const ids = [...new Set(keys.map((k) => k.split('#')[0]))];
    for (const id of ids) {
        const rows = keys.filter((k) => k.startsWith(`${id}#`) && pickArm(key[k])).flatMap((k) => slots.map((s, i) => ({ arm: key[k], g: i + 1, v: s[k] }))).filter((r) => verdictOf(r.v) !== 'acceptable');
        if (!rows.length) continue;
        console.log(`\n${id}`);
        for (const r of rows.sort((x, y) => x.arm.localeCompare(y.arm) || x.g - y.g)) console.log(`  ${r.arm.padEnd(12)} g${r.g} ${r.v.correctness}/${r.v.on_topic}/${r.v.delivery} ${verdictOf(r.v).padEnd(5)} ${String(r.v.reason ?? '').slice(0, 230)}`);
    }
}
