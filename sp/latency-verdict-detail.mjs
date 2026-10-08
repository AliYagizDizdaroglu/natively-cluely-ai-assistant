// latency-verdict-detail.mjs — explanatory detail for the report, computed with the rule's OWN
// functions (imported from MAIN's committed paired-latency.decide.mjs, never re-implemented):
// per window and pooled, each model's forced-fallback count, how many pairs end with NO answer
// (the charged wait is the 45 s cap: the model in front failed or stalled AND the backup failed),
// and the effective-wait median/p90 per window. It decides nothing; the verdict is decide.mjs's.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const R = await import(pathToFileURL(`${MAIN}/electron/test/golden/paired-latency.decide.mjs`).href);
const DIR = `${MAIN}/electron/test/golden/interview60.runs/latency-probe`;

const all = [];
for (const w of ['W1', 'W2', 'W3']) {
    const pairs = R.pairsOf(JSON.parse(fs.readFileSync(`${DIR}/2026-09-23-${w}.json`, 'utf8')), w);
    all.push(...pairs);
    report(w, pairs);
}
report('pooled', all);
// Sanity: decide() on the pooled pairs must reproduce the CLI's numbers exactly.
const d = R.decide(all);
console.log('\ndecide() re-check:', d.conditions.map((c) => `${c.name}: ${c.cand} vs ${c.inc} ${c.pass ? 'PASS' : 'FAIL'}`).join(' | '), `=> ${d.pass ? 'PASS' : 'FAIL'}`);

function report(label, pairs) {
    const cw = pairs.map((p) => R.effectiveWait(p.cand, p.inc));
    const iw = pairs.map((p) => R.effectiveWait(p.inc, p.cand));
    const fc = pairs.filter((p) => R.forcedFallback(p.cand)).length;
    const fi = pairs.filter((p) => R.forcedFallback(p.inc)).length;
    const both = pairs.filter((p) => R.forcedFallback(p.cand) && R.forcedFallback(p.inc)).length;
    const capC = cw.filter((x) => x >= R.CAP_MS).length;
    const capI = iw.filter((x) => x >= R.CAP_MS).length;
    console.log(`${label.padEnd(7)} n=${pairs.length}  forced: 3.5 ${fc} / 3.1 ${fi}  both forced: ${both}${R.isVoid(pairs) ? ' (VOID)' : ''}  no-answer (cap): 3.5-in-front ${capC} / 3.1-in-front ${capI}  effective wait median 3.5 ${R.pct(cw, 0.5)} / 3.1 ${R.pct(iw, 0.5)}  p90 3.5 ${R.pct(cw, 0.9)} / 3.1 ${R.pct(iw, 0.9)}`);
}
