// THROWAWAY: re-run the CURRENT gate over the stored after7/after8/after9 runs and print
// the counting rows the reviewer flagged, with the raw numbers the bars are derived from.
// This is the "before" picture for the denominator fix; run again after it for "after".
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = PROJ + '/electron/test/golden/interview60.runs';
const { computeRun, GATE } = await import(`file:///${PROJ}/electron/test/golden/interview60.metrics.mjs`);

const row = (key) => GATE.find((r) => r.key === key);
for (const name of ['2026-09-06T08-14-21-after7', '2026-09-07T08-14-12-after8', '2026-09-08T08-44-56-after9']) {
    const dir = path.join(RUNS, name);
    const m = computeRun(dir);
    const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
    const items = tl.items ?? tl;
    const spoken = items.filter((i) => (i.kind ?? 'spoken') === 'spoken');
    const levels = new Map();
    for (const i of spoken) levels.set(i.level ?? '(none)', (levels.get(i.level ?? '(none)') ?? 0) + 1);
    const withChain = spoken.filter((i) => i.chain).length;
    console.log(`\n${name}`);
    console.log(`  timeline: ${items.length} items, ${spoken.length} spoken, ${withChain} with chain; levels ${JSON.stringify(Object.fromEntries(levels))}`);
    console.log(`  m.items.length=${m.items.length} delivered=${m.delivered} heard=${m.heard} judge.n=${m.judge?.n} acceptable=${m.judge?.acceptable} wrong=${m.judge?.wrong}`);
    const jp = path.join(dir, 'interview60.judge.json');
    if (fs.existsSync(jp)) {
        const j = JSON.parse(fs.readFileSync(jp, 'utf8'));
        const arr = Object.values(j.items ?? {});
        const jl = new Map();
        for (const v of arr) jl.set(`${v.kind}/${v.level ?? '-'}`, (jl.get(`${v.kind}/${v.level ?? '-'}`) ?? 0) + 1);
        const ids = new Set(arr.filter((v) => v.kind === 'spoken').map((v) => v.id));
        console.log(`  judge file: ${arr.length} entries over ${ids.size} distinct spoken ids; kind/level ${JSON.stringify(Object.fromEntries(jl))}`);
    }
    for (const key of ['answered', 'heard', 'quality', 'coding', 'long']) {
        const r = row(key);
        console.log(`  ${key.padEnd(9)} ${r.pass(m) ? 'PASS' : 'FAIL'}  ${r.show(m)}`);
    }
}
