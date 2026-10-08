// REVIEW THROWAWAY (read-only): how the spec's classify->call pairing rule (§6.1.1: first `detect issued` within 3 s after
// the classify whose previous line is not `debounce elapsed`) behaves on the eight fixtures' logs. Flags classifies that
// waited, classifies with a `coalesced` (queued) trigger between the ask and the picked call, and picks whose previous
// line is a fast-path line. Counts only.
import fs from 'node:fs';
const LOGS = {
  br1: 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-30T11-45-30-br1/natively_debug.log',
  cuesmoke: 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-30T13-46-52-cuesmoke/natively_debug.log',
};
for (const [n, d] of [['s50b', '2026-09-11T08-22-32-s50b'], ['s50c', '2026-09-12T08-22-49-s50c'], ['s50d', '2026-09-13T08-22-36-s50d'], ['s50f', '2026-09-15T08-22-29-s50f'], ['s50i', '2026-09-18T08-22-57-s50i'], ['s50j', '2026-09-19T08-22-41-s50j']]) LOGS[n] = `C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/${d}/natively_debug.log`;
const T = (l) => Date.parse(l.slice(0, 24));
const iso = (t) => new Date(t).toISOString().slice(11, 23);
let total = 0, adjacent = 0, waited = 0, coalescedBetween = 0, fastPrev = 0, none = 0; const odd = [];
for (const [name, file] of Object.entries(LOGS)) {
  const L = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => /^\S+Z /.test(l));
  L.forEach((l, i) => {
    if (!/\[Main\] turn: classify finals=/.test(l)) return;
    total++;
    const t = T(l);
    let j = i + 1; let pick = -1;
    for (; j < L.length && T(L[j]) - t <= 3000; j++) if (/\[QD-timing\] detect issued/.test(L[j]) && !/debounce elapsed/.test(L[j - 1])) { pick = j; break; }
    if (pick < 0) { none++; odd.push(`${name} ${iso(t)} no call picked`); return; }
    if (pick === i + 1) adjacent++; else waited++;
    const between = L.slice(i + 1, pick);
    if (between.some((x) => /coalesced/.test(x))) { coalescedBetween++; odd.push(`${name} ${iso(t)} a coalesced trigger sits between the ask and the picked call (picked ${iso(T(L[pick]))}, prev line: ${L[pick - 1].slice(25, 90)})`); }
    if (/fast-path/.test(L[pick - 1])) { fastPrev++; odd.push(`${name} ${iso(t)} picked call follows a fast-path line`); }
  });
}
console.log(`classifies ${total}: call adjacent ${adjacent}, waited ${waited}, none within 3 s ${none}, coalesced trigger between ${coalescedBetween}, picked call right after a fast-path line ${fastPrev}`);
console.log(odd.join('\n'));
