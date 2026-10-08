// Throwaway (2026-09-26): h40b vs h40a from the MERGED judge verdict files (read-only).
// Calibration first: the totals must reproduce numbers already known from the pass records
// (h40a in-app 39/45, mains 29/33; h40b in-app 35, mains 27; h40a twins 41/39/39 and 37/42/38 of 44).
// Then pre-registered leg 2 (live mains vs the captured twins' band) on two id sets, and the
// per-item diffs of the in-app hour and of R09F/R11F across arms.
import fs from 'node:fs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const HOURS = { h40a: `${RUNS}/2026-09-24T08-20-12-h40a`, h40b: `${RUNS}/2026-09-26T11-39-51-h40b` };
const LOW = ['gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r3'];
const HIGH = ['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3'];
const MIN = 'gemini-3.1-flash-lite_captured-minimal';
const isMain = (id) => /^R\d\d$/.test(id);

// The judge's rule (interview60.judge.mjs verdictOf): wrong when correctness or on_topic is 0;
// acceptable when both are 2 AND delivery >= 1; weak otherwise. The first version of this script
// left out the delivery term and read h40a's low-r3 twin as 40 instead of the recorded 39.
const verdictOf = ({ correctness, on_topic, delivery }) =>
    (correctness === 0 || on_topic === 0) ? 'wrong' : (correctness === 2 && on_topic === 2 && delivery >= 1) ? 'ok' : 'weak';
function load(hour, tag) {
    const f = `${HOURS[hour]}/interview60.judge.verdicts${tag ? '.' + tag : ''}.json`;
    const j = `${HOURS[hour]}/interview60.judge${tag ? '.' + tag : ''}.json`;
    for (const p of [f, j]) if (!fs.existsSync(p)) { console.log(`MISSING ${p}`); process.exit(2); }
    const v = JSON.parse(fs.readFileSync(f, 'utf8'));
    const judged = JSON.parse(fs.readFileSync(j, 'utf8')).items ?? {};
    const out = {};
    for (const [id, x] of Object.entries(v)) {
        if (![0, 1, 2].includes(x.correctness) || ![0, 1, 2].includes(x.on_topic) || ![0, 1, 2].includes(x.delivery)) { console.log(`BAD VERDICT ${hour} ${tag} ${id}`); process.exit(3); }
        out[id] = verdictOf(x);
        const jv = judged[id]?.verdict;
        const mapped = jv === 'acceptable' ? 'ok' : jv;
        if (mapped !== out[id]) console.log(`DISAGREE ${hour} ${tag || 'inapp'} ${id}: rule ${out[id]} vs judge.json ${jv}`);
    }
    return out;
}
const count = (cls, ids) => ids.filter((id) => cls[id] === 'ok').length;

const roster = Object.keys(load('h40b', '')).concat(['R05', 'R07F']); // in-app 43 + its 2 unanswered = 45
const all = [...new Set(roster)].sort();
if (all.length !== 45) { console.log(`ROSTER SIZE ${all.length}, expected 45`); process.exit(4); }

const data = {};
for (const h of Object.keys(HOURS)) {
    data[h] = { inapp: load(h, '') };
    for (const t of [...LOW, ...HIGH, MIN]) data[h][t] = load(h, t);
}

console.log('== calibration (known values in brackets)');
for (const h of Object.keys(HOURS)) {
    const ia = data[h].inapp;
    console.log(`${h} in-app total ${count(ia, all)}/45 [h40a 39, h40b 35]; mains ${count(ia, all.filter(isMain))}/33 [h40a 29, h40b 27]; answered ${Object.keys(ia).length}`);
    console.log(`${h} 3.1 LOW twins ${LOW.map((t) => `${count(data[h][t], Object.keys(data[h][t]))}/${Object.keys(data[h][t]).length}`).join(' ')} [h40a 41/39/39, h40b 40/40/38]; 3.5 HIGH ${HIGH.map((t) => `${count(data[h][t], Object.keys(data[h][t]))}/${Object.keys(data[h][t]).length}`).join(' ')} [h40a 37/42/38, h40b 38/36/39]`);
}

const capA = Object.keys(data.h40a[LOW[0]]); const capB = Object.keys(data.h40b[LOW[0]]);
const idSets = {
    'h40b captured mains': capB.filter(isMain).sort(),
    'mains both hours captured': capB.filter((id) => isMain(id) && capA.includes(id)).sort(),
};
console.log('\n== leg 2: live in-app mains vs the captured twins (unanswered counts as not acceptable)');
for (const h of Object.keys(HOURS)) {
    for (const [name, ids] of Object.entries(idSets)) {
        const ia = count(data[h].inapp, ids);
        const lows = LOW.map((t) => count(data[h][t], ids)); const highs = HIGH.map((t) => count(data[h][t], ids));
        const lo = Math.min(...lows, ...highs); const hi = Math.max(...lows, ...highs);
        const verdict = ia >= lo ? (ia > hi ? 'ABOVE the band' : 'INSIDE the band') : 'BELOW the band';
        console.log(`${h} on ${name} (${ids.length}): in-app ${ia}; 3.1 LOW ${lows.join('/')}; 3.5 HIGH ${highs.join('/')}; band ${lo}-${hi} -> ${verdict}`);
    }
}

console.log('\n== in-app items whose class differs between the hours (h40a -> h40b; "-" = unanswered)');
for (const id of all) {
    const a = data.h40a.inapp[id] ?? '-'; const b = data.h40b.inapp[id] ?? '-';
    if (a !== b) console.log(`${id.padEnd(6)} ${a} -> ${b}`);
}

console.log('\n== R09F and R11F in every captured arm (h40a | h40b)');
for (const id of ['R09F', 'R11F']) {
    for (const t of ['inapp', ...LOW, ...HIGH, MIN]) {
        console.log(`${id} ${t.replace('gemini-', '').padEnd(34)} ${(data.h40a[t][id] ?? '-').padEnd(6)} | ${data.h40b[t][id] ?? '-'}`);
    }
}
