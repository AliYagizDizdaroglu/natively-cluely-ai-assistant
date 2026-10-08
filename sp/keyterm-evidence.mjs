// Which words does Deepgram actually lose? Diff each scripted question against the text the
// app heard for it, across every flight run we still have. Evidence for the keyterm list.
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(Boolean);
// words the roster uses that are worth protecting; everything else is filler
const STOP = new Set(('a an the and or but if then of to in on for with as at by from is are was were be been ' +
    'you your we our i me my it its this that these those what how why when where which who do does did done ' +
    'can could would should will shall may might must have has had not no yes so than there their them they ' +
    'he she his her us also into out up down over under about after before between each any all some one two ' +
    'three more most other such only just very much many like get got make made use used using way ways take ' +
    'give tell walk me through say saying talk through').split(/\s+/));

const missesByWord = new Map();   // word -> Map(heardPhrase -> count)
let compared = 0;

for (const dir of readdirSync(RUNS).filter((d) => /^\d{4}-\d{2}-\d{2}T/.test(d))) {
    const tl = `${RUNS}/${dir}/interview60.timeline.json`;
    const pr = `${RUNS}/${dir}/interview60.prompts.json`;
    if (!existsSync(tl) || !existsSync(pr)) continue;
    const timeline = JSON.parse(readFileSync(tl, 'utf8'));
    const prompts = JSON.parse(readFileSync(pr, 'utf8'));
    for (const item of timeline.items ?? []) {
        const cap = prompts[item.id];
        if (!cap?.user || !item.q) continue;
        compared++;
        const heardWords = new Set(norm(cap.user));
        const heardText = cap.user.toLowerCase();
        for (const w of new Set(norm(item.q))) {
            if (STOP.has(w) || w.length < 3) continue;
            if (heardWords.has(w)) continue;
            // record the word and a little of what was heard around where it should be
            if (!missesByWord.has(w)) missesByWord.set(w, { n: 0, runs: new Set(), ids: new Set() });
            const m = missesByWord.get(w);
            m.n++; m.runs.add(dir.slice(0, 10)); m.ids.add(item.id);
            void heardText;
        }
    }
}

const rows = [...missesByWord.entries()]
    .filter(([, m]) => m.runs.size >= 2)            // lost in more than one flight = systematic
    .sort((a, b) => b[1].n - a[1].n);
console.log(`compared ${compared} scripted-vs-heard question pairs across runs\n`);
console.log('word'.padEnd(22), 'lost'.padStart(4), ' flights  ids');
for (const [w, m] of rows.slice(0, 45)) {
    console.log(w.padEnd(22), String(m.n).padStart(4), '  ' + String(m.runs.size).padStart(2) + '     ', [...m.ids].slice(0, 5).join(','));
}
