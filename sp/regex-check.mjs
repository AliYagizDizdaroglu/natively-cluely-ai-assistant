import fs from 'node:fs';

const src = fs.readFileSync(
    'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.metrics.mjs',
    'utf8'
);
const m = src.match(/const dispatches = \[\.\.\.dbg\.matchAll\((\/.*\/gm)\)\]/);
if (!m) throw new Error('regex literal not found in source file');
// eslint-disable-next-line no-eval
const re = eval(m[1]);
console.log('Extracted regex source:', re.source);

const lines = [
    ['supersede (main.ts:1011)', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: supersede source=whisper anchor="A" verdict=match replaces="R" question="Q"'],
    ['drop fragment (2063)', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: drop source=live anchor="A" verdict=fragment question="Q"'],
    ['mark (2078)', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: mark source=whisper anchor="A" verdict=match question="Q"'],
    ['drop unverifiable (2092)', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: drop source=live anchor="A" verdict=unverifiable duplicateOf=live answered=false question="Q"'],
    ['drop dup (2104)', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: drop source=whisper anchor="A" verdict=match duplicateOf=live answered=false question="Q"'],
    ['hold (2107) -- REAL SHAPE', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: hold source=whisper anchor="A" verdict=match reason=fragmentary question="Q"'],
    ['drop verdict.dupOf (2114)', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: drop source=whisper anchor="A" verdict=match duplicateOf=none answered=true question="Q"'],
    ['answer (2117)', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: answer source=live anchor="A" verdict=match question="Q"'],
    ['chip (2117)', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: chip source=whisper anchor="A" verdict=match question="Q"'],
    ['extend (OLD historical log)', '2026-01-01T00:00:00.000Z [LOG] [Main] dispatch: extend source=live anchor="A" verdict=match extends="E" question="Q"'],
];

for (const [name, line] of lines) {
    re.lastIndex = 0;
    const mm = re.exec(line);
    if (!mm) { console.log(name, '=> NO MATCH'); continue; }
    console.log(name, '=> action=' + mm[2], 'source=' + mm[3], 'anchor=' + mm[4], 'verdict=' + mm[5], 'dupOf=' + mm[6], 'answered=' + mm[7], 'question=' + mm[8]);
}
