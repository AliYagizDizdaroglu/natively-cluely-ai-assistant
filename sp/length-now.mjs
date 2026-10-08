// Where the length problem actually stands, and what the new gate row would have said about
// s50j. Doubles as the row's calibration against real data rather than a fixture.
import { readFileSync, existsSync } from 'node:fs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);

// In-app length, flight by flight, straight from each hour's own budget lines.
const HOURS = [
    ['s50e', '2026-09-14'], ['s50f', '2026-09-15'], ['s50g', '2026-09-16'],
    ['s50h', '2026-09-17'], ['s50i', '2026-09-18'], ['s50j', '2026-09-19'],
];
console.log('in-app answer length, flight by flight (the app\'s own [Answer] budget lines)\n');
console.log('flight  n   p50  p90  max   >85        >150       cut');
for (const [label] of HOURS) {
    const fs_ = await import('node:fs');
    const dir = fs_.readdirSync(RUNS).filter((d) => d.endsWith('-' + label)).sort().pop();
    if (!dir) continue;
    const log = `${RUNS}/${dir}/natively_debug.log`;
    if (!existsSync(log)) continue;
    const lines = [...readFileSync(log, 'utf8').matchAll(/\[Answer\] budget: words=(\d+) cut=(yes|no)/g)]
        .map((m) => ({ w: Number(m[1]), cut: m[2] === 'yes' }));
    if (!lines.length) continue;
    const w = lines.map((x) => x.w).sort((a, b) => a - b);
    const o85 = lines.filter((x) => x.w > 85).length, o150 = lines.filter((x) => x.w > 150).length;
    const cut = lines.filter((x) => x.cut).length;
    console.log(`${label}   ${String(w.length).padStart(2)}  ${String(pct(w, .5)).padStart(4)} ${String(pct(w, .9)).padStart(4)} ${String(w.at(-1)).padStart(4)}   ${String(o85 + '/' + w.length).padEnd(10)} ${String(o150 + '/' + w.length).padEnd(10)} ${cut}`);
}

// What the new row would print for s50j, and whether it passes.
const dirJ = (await import('node:fs')).readdirSync(RUNS).filter((d) => d.endsWith('-s50j')).sort().pop();
const lj = [...readFileSync(`${RUNS}/${dirJ}/natively_debug.log`, 'utf8').matchAll(/\[Answer\] budget: words=(\d+) cut=(yes|no)/g)].map((m) => Number(m[1]));
const wj = [...lj].sort((a, b) => a - b);
const length = { n: lj.length, p90: pct(wj, .9), over85: lj.filter((x) => x > 85).length, over150: lj.filter((x) => x > 150).length };
console.log(`\nnew gate row on s50j: words p90 ${length.p90}, over 85: ${length.over85}/${length.n}, over 150: ${length.over150}/${length.n}`);
console.log(`row passes? ${length.n > 0 && length.over150 === 0}   (expected: false)`);

// Does length actually cost anything under the frozen grader? Check every s50j verdict.
const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';
let d0 = 0, d1 = 0, d2 = 0, weakFromDeliveryAlone = 0, tot = 0;
for (const f of (await import('node:fs')).readdirSync(S).filter((x) => /^s50j-verdicts-.*\.json$/.test(x))) {
    for (const v of Object.values(JSON.parse(readFileSync(`${S}/${f}`, 'utf8')))) {
        tot++;
        if (v.delivery === 0) d0++; else if (v.delivery === 1) d1++; else d2++;
        // would it have been acceptable but for delivery?
        if (v.correctness === 2 && v.on_topic === 2 && v.delivery === 0) weakFromDeliveryAlone++;
    }
}
console.log(`\nacross all ${tot} s50j verdicts: delivery 0 ${d0}, delivery 1 ${d1}, delivery 2 ${d2}`);
console.log(`answers demoted to weak by delivery ALONE: ${weakFromDeliveryAlone}`);
console.log(`=> ${d1} answers were marked long enough to lose a delivery point and it cost the score nothing.`);
