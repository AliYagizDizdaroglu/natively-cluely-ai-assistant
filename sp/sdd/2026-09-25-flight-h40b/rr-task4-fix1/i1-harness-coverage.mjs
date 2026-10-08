// Re-review probe (throwaway): runs the implementer's OWN two loop functions (sliced out of
// i1-retry-trace.mjs, not retyped) on sequences its cross-check never scripted. If they disagree there,
// the harness's paraphrase is faithful and its "all MATCH" was a coverage gap, not a fidelity gap.
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const t = fs.readFileSync(`${SP}/i1-retry-trace.mjs`, 'utf8');
const a = t.indexOf('async function runLoop(');
const b = t.indexOf('const CLEAN =');
if (a < 0 || b < 0) throw new Error('cannot slice');
const { runLoop, runLoopOriginal } = new Function(`const sleep = () => Promise.resolve();\n${t.slice(a, b)}\nreturn { runLoop, runLoopOriginal };`)();
const CLEAN = { transient: null, finish: 'STOP' }, T = { transient: 'HTTP 429', finish: null }, CUT = { transient: null, finish: null };
const name = (s) => s.map((x) => (x.transient ? '429' : x.finish === null ? 'CUT' : 'CLEAN')).join(',');
for (const s of [[T, T, T, CUT, CLEAN], [T, T, T, CUT, T]]) {
    const n = await runLoop(4, s), o = await runLoopOriginal(s);
    const kind = (r) => (r.transient ? 'transient' : r.finish === null ? 'cut' : 'clean');
    console.log(`[${name(s)}]  harness NEW@4: ${n.calls} calls, final ${kind(n.r)}  |  harness OLD: ${o.calls} calls, final ${kind(o.r)}  -> ${n.calls === o.calls && kind(n.r) === kind(o.r) ? 'MATCH' : 'DIFFER'}`);
}
