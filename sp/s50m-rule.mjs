// s50m-rule.mjs — apply the four pre-registered conditions EXACTLY as committed in
// electron/test/golden/passes/PREREGISTER-s50m.md (plus its pre-flight amendment).
// Scored on the MAINS among the ids shared by the live hour and all six captured arms.
import fs from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';

const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
const V = (t) => JSON.parse(fs.readFileSync(`${S}/s50m-verdicts-${t}.json`, 'utf8'));

const LOWS = ['captured-low', 'captured-low-r2', 'captured-low-r3'];
const HIGHS = ['captured-high', 'captured-high-r2', 'captured-high-r3'];
const ALL = [...LOWS, ...HIGHS, 'captured-minimal', 'inapp'];
const data = Object.fromEntries(ALL.map((t) => [t, V(t)]));

// "the ids shared by the live hour and all six captured arms"
let shared = null;
for (const t of [...LOWS, ...HIGHS, 'inapp']) {
    const ks = new Set(Object.keys(data[t]));
    shared = shared === null ? ks : new Set([...shared].filter((k) => ks.has(k)));
}
const mains = [...shared].filter((k) => !/F$/.test(k)).sort();
console.log(`shared ids ${shared.size}; MAINS scored ${mains.length}: ${mains.join(' ')}\n`);

const repScore = (t) => mains.filter((k) => verdictOf(data[t][k]) === 'acceptable').length;
const lowReps = LOWS.map(repScore), highReps = HIGHS.map(repScore);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const lowMean = mean(lowReps), highMean = mean(highReps);

// per-question: how many of its 3 reps were acceptable on each side
let up = 0, down = 0, tie = 0;
const movers = [];
for (const k of mains) {
    const l = LOWS.filter((t) => verdictOf(data[t][k]) === 'acceptable').length;
    const h = HIGHS.filter((t) => verdictOf(data[t][k]) === 'acceptable').length;
    if (h > l) { up++; movers.push(`  3.5 up   ${k}  ${l}->${h}`); }
    else if (l > h) { down++; movers.push(`  3.1 up   ${k}  ${h}<-${l}`); }
    else tie++;
}

// safety, scoped by the amendment to the live hour + the three 3.5 HIGH captured arms
const wrongIn = (t) => Object.values(data[t]).filter((v) => verdictOf(v) === 'wrong').length;
const safetyArms = ['inapp', ...HIGHS];
const wrongTotal = safetyArms.reduce((n, t) => n + wrongIn(t), 0);

const ttftOver = (file, key) => {
    const a = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Object.values(a).filter((r) => typeof r.ttft === 'number' && r.ttft > 10000).length;
};
const diag = fs.readFileSync(`${D}/verbal-diag.log`, 'utf8');
const A = Date.parse('2026-09-22T07:14:07.873Z'), B = Date.parse('2026-09-22T08:22:50.638Z');
const liveTtft = [...diag.matchAll(/^\[(\S+)\] first token (\d+)ms/gm)]
    .filter((m) => { const t = Date.parse(m[1]); return t >= A && t <= B; }).map((m) => Number(m[2]));
const liveOver = liveTtft.filter((x) => x > 10000);
const highOver = HIGHS.reduce((n, t) => n + ttftOver(`${D}/interview60.answers.gemini-3.5-flash-lite_${t}.json`), 0);

const P = (b) => (b ? 'PASS' : 'FAIL');
console.log(`3.1 LOW  reps ${lowReps.join(' / ')}   mean ${lowMean.toFixed(2)}   worst ${Math.min(...lowReps)}`);
console.log(`3.5 HIGH reps ${highReps.join(' / ')}   mean ${highMean.toFixed(2)}   worst ${Math.min(...highReps)}\n`);
console.log(movers.join('\n'));
console.log(`  ties: ${tie}\n`);

const c1 = highMean - lowMean >= 1.0;
const c2 = down === 0 ? up > 0 : up / down >= 2;
const c3 = Math.min(...highReps) >= Math.min(...lowReps);
const c4 = wrongTotal === 0 && liveOver.length === 0 && highOver === 0;
console.log(`CONDITION 1  mean gain ${(highMean - lowMean).toFixed(2)} >= 1.0                    ${P(c1)}`);
console.log(`CONDITION 2  up:down ${up}:${down} >= 2:1                              ${P(c2)}`);
console.log(`CONDITION 3  3.5 worst ${Math.min(...highReps)} >= 3.1 worst ${Math.min(...lowReps)}                     ${P(c3)}`);
console.log(`CONDITION 4  wrong ${wrongTotal}; over 10 s: live ${liveOver.length}, 3.5 arms ${highOver}   ${P(c4)}`);
console.log(`             live over-budget values: ${liveOver.join(', ') || 'none'}`);
console.log(`\nVERDICT: ${[c1, c2, c3, c4].every(Boolean) ? 'SWAP to gemini-3.5-flash-lite' : '3.1-lite LOW STAYS, PERMANENTLY — the model question closes'}`);
