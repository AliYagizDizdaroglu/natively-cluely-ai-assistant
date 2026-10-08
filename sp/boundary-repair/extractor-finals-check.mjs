// Throwaway (2026-09-29, v4 authoring): does the Task 5 finals parser reproduce the two committed turns
// fixtures' `finals` arrays from their run logs? (Pre-repair logs hold no `boundary repair:` line, so the
// new parser must equal the old inline one there.) Also: how many such lines do the logs hold today?
import fs from 'node:fs';
import path from 'node:path';
const GOLDEN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const FINAL = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/;
const REPAIR = /^\S+ \[LOG\] \[DeepgramStreaming\] boundary repair: restored "((?:[^"\\]|\\.)*)" before "/;
const unq = (s) => JSON.parse(`"${s}"`);
function finalsFrom(dbg, sinceMs) {
    const lines = dbg.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(FINAL);
        if (!m) continue;
        const rep = lines[i + 1]?.match(REPAIR);
        const text = (rep ? `${unq(rep[1])} ${unq(m[2])}` : unq(m[2])).trim();
        const at = Date.parse(m[1]);
        if (text && at >= sinceMs) out.push({ at, text });
    }
    return out;
}
for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
    const run = path.join(GOLDEN, 'interview60.runs', name);
    const tl = JSON.parse(fs.readFileSync(path.join(run, 'interview60.timeline.json'), 'utf8'));
    const dbg = fs.readFileSync(path.join(run, 'natively_debug.log'), 'utf8');
    const fixture = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'fixtures', `${name}-turns.json`), 'utf8'));
    const mine = finalsFrom(dbg, tl.startedMs - 2000);
    const same = JSON.stringify(mine) === JSON.stringify(fixture.finals);
    console.log(`${name}: parser ${mine.length} finals, fixture ${fixture.finals.length}, identical ${same}, repair lines in log ${(dbg.match(/boundary repair: restored/g) ?? []).length}, offsetMs ${fixture.offsetMs}`);
}
// synthetic: a final directly followed by a repair line
const synth = [
    '2026-09-29T11:19:27.826Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="How do you cut"',
    '2026-09-29T11:19:29.373Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="in a rag answer without just making it refuse?"',
    '2026-09-29T11:19:29.373Z [LOG] [DeepgramStreaming] boundary repair: restored "hallucinations" before "in a rag answer without just making it r"',
].join('\n');
console.log(JSON.stringify(finalsFrom(synth, 0)));
