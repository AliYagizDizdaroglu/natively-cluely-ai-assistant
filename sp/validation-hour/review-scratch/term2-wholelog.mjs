// Review scratch (read-only): h40d-clocks.mjs's rule-2d second term, applied to the WHOLE debug log (no timeline
// slice), to see whether it catches the one real block-only answer (the 16:12 run's readiness-probe answer at
// 13:12:08Z). Same regexes and markers as h40d-clocks.mjs. Prints window numbers, times and flags only.
//   node term2-wholelog.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';
const dbg = fs.readFileSync(path.join(process.argv[2], 'natively_debug.log'), 'utf8');
const LVL = '\\[(?:LOG|WARN|ERROR)\\]';
const disp = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|supersede) /gm)].map((m) => ({ index: m.index, t: m[1] }));
const full = [...dbg.matchAll(new RegExp(`^(\\S+) ${LVL} \\[Answer\\] full: (.+)$`, 'gm'))];
const won = [...dbg.matchAll(new RegExp(`^(\\S+) ${LVL} \\[LLMHelper\\] verbal hedge: won by`, 'gm'))];
const fail = [...dbg.matchAll(new RegExp(`^(\\S+) ${LVL} \\[WhatToAnswerLLM\\] Stream failed`, 'gm'))];
const MARK = ['[No answer —', 'Could you repeat that? I want to make sure I address your question properly.'];
let n = 0;
for (let i = 0; i < disp.length; i++) {
    const s = disp[i].index, e = i + 1 < disp.length ? disp[i + 1].index : dbg.length;
    const af = full.filter((m) => m.index >= s && m.index < e);
    const last = af.at(-1);
    const flagged = last && MARK.some((k) => last[2].includes(k));
    if (flagged) { n++; console.log(`window #${i + 1} dispatched ${disp[i].t}: last full line is failure text; won-by lines ${won.filter((m) => m.index >= s && m.index < e).length}, Stream-failed lines ${fail.filter((m) => m.index >= s && m.index < e).length}`); }
}
console.log(`whole-log windows ${disp.length}; flagged by the second term: ${n}`);
