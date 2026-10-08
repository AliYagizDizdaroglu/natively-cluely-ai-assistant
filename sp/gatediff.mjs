import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = path.join(ROOT, 'electron/test/golden');
const dir = path.join(G, 'interview60.runs/2026-09-04T08-09-38-after4');

const load = async (f) => import(pathToFileURL(path.join(G, f)).href);
const cur = await load('interview60.metrics.mjs');
const head = await load('interview60.metrics.__head.mjs');

const now = cur.evaluateGate(cur.computeRun(dir)).rows;
const was = head.evaluateGate(head.computeRun(dir)).rows;

let diffs = 0;
for (let i = 0; i < Math.max(now.length, was.length); i++) {
    const x = now[i], y = was[i];
    const same = x && y && x.label === y.label && x.value === y.value && x.pass === y.pass;
    if (!same) diffs++;
    const fmt = (r) => (r ? `${r.pass ? 'PASS' : 'FAIL'} | ${r.value}` : '(absent)');
    console.log(`${same ? 'SAME' : 'DIFF'}  ${(x?.label ?? y?.label).padEnd(56)}  HEAD: ${fmt(y)}   NOW: ${fmt(x)}`);
}
console.log(`\nrows differing: ${diffs}`);
