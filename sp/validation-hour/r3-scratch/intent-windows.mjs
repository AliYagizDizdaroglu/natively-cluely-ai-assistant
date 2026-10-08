// r3 scratch (N1): per dispatch window of a debug log, does a `[KnowledgeOrchestrator] Intent classified` line fall
// inside it? Prints window index, kind, dispatch timestamp, and the count of Intent-classified / knowledge lines in
// the window — never a question or an answer. Windows are the clocks script's: a `[Main] dispatch: answer` or
// `dispatch: supersede` line to the next such line (the last window runs to the end of the log).
import fs from 'node:fs';
const log = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const TS = /^\[?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/;
const stamp = (l) => (l.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/) || [])[1] ?? '-';
const starts = [];
log.forEach((l, i) => { const m = l.match(/\[Main\] dispatch: (answer|supersede)/); if (m) starts.push({ i, kind: m[1], at: stamp(l) }); });
let missing = 0;
starts.forEach((w, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].i : log.length;
    const slice = log.slice(w.i, end);
    const n = (re) => slice.filter((l) => re.test(l)).length;
    const intent = n(/\[KnowledgeOrchestrator\] Intent classified/);
    const know = n(/\[LLMHelper\] Knowledge mode \(stream\)/);
    const front = n(/verbal hedge: front=/);
    const won = n(/verbal hedge: won by/);
    const stream = n(/_what_to_say stream aborted by new generation/);
    if (!intent) missing++;
    console.log(`#${String(k + 1).padStart(2)} ${w.kind.padEnd(9)} ${w.at}  intent-classified ${intent}  knowledge-stream-lines ${know}  front= ${front}  won-by ${won}  aborted ${stream}${intent ? '' : '   <-- NO Intent classified line'}`);
});
console.log(`windows ${starts.length}, without an Intent classified line ${missing}`);
