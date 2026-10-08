// Re-check (read-only): how often does a 3.5-lite HIGH captured twin record have EMPTY PROSE (no transientError,
// empty `spoken`)? Revision 2 counts empty prose as WRONG in 3c, including on the 40 gated ids where the no-cue
// control has historically had 0 wrong. Prints counts, ids, lengths and flags only: never a prompt, never answer text.
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const GATED_OUT = new Set(['R02F', 'R04F', 'R09F', 'R11F', 'R13F']);
const fam = /^interview60\.answers\.gemini-3\.5-flash-lite_captured-high(-r2|-r3)?\.json$/;
let reps = 0, answers = 0, empties = 0, repsWithEmpty = 0;
const rows = [];
for (const d of fs.readdirSync(RUNS).sort()) {
    const dir = path.join(RUNS, d);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => fam.test(x))) {
        let store;
        try { store = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
        const vals = Object.values(store).filter((v) => v && typeof v === 'object' && v.id);
        const nonHole = vals.filter((v) => !v.transientError);
        const empty = nonHole.filter((v) => !v.spoken);
        reps++; answers += nonHole.length; empties += empty.length; if (empty.length) repsWithEmpty++;
        for (const v of empty) rows.push(`${d} ${f.replace('interview60.answers.gemini-3.5-flash-lite_', '')} ${v.id}${GATED_OUT.has(v.id) ? ' (excluded follow-up)' : ''}: rawLen ${v.rawLen ?? '?'} finish ${v.finish ?? 'null'} words ${v.words ?? '?'} offers ${Array.isArray(v.offers) ? v.offers.length : v.offers == null ? 'null' : typeof v.offers} cues ${Array.isArray(v.cues) ? v.cues.length : 'n/a'} thoughts ${v.thoughts ?? 'null'} ttft ${v.ttft ?? 'null'} failedChecks [${Object.entries(v.checks ?? {}).filter(([, ok]) => !ok).map(([n]) => n).join(',')}]`);
    }
}
console.log(`3.5-lite captured-high reps found: ${reps}; non-hole answers ${answers}; empty prose ${empties}; reps with >= 1 empty prose ${repsWithEmpty}`);
for (const r of rows) console.log('  ' + r);
const perAnswer = answers ? empties / answers : 0;
const perRep44 = 1 - Math.pow(1 - perAnswer, 44);
const nullStop = (p) => (1 - Math.pow(1 - p, 3)) * Math.pow(1 - p, 3);
console.log(`per-answer rate ${(perAnswer * 100).toFixed(2)}%; P(>=1 empty in a 44-id rep) ${(perRep44 * 100).toFixed(1)}%`);
console.log(`null P(some cue rep > worst control rep), empties alone, both sides at that rate, iid reps, control otherwise 0: ${(nullStop(perRep44) * 100).toFixed(1)}%`);
for (const p of [0.02, 0.05, 0.1, 0.2]) console.log(`  if the per-rep chance of >= 1 gated wrong were ${p}: null STOP ${(nullStop(p) * 100).toFixed(1)}%`);
