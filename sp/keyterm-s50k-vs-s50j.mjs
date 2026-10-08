// Did the shipped keyterm list make anything WORSE? Compare, per question id, the content
// words the scripted text has that the heard text lost — s50j (no keyterms) vs s50k (keyterms).
// Same normaliser as keyterm-evidence2: hyphens split both sides, numerals dropped.
import { readFileSync, readdirSync } from 'node:fs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const norm = (s) => s.toLowerCase().replace(/[-_/]/g, ' ').replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);
const STOP = new Set(('a an the and or but if then of to in on for with as at by from is are was were be been being ' +
    'you your we our us i me my it its this that these those what how why when where which who whom do does did done ' +
    'can could would should will shall may might must have has had not no nor yes so than there their them they ' +
    'he she his her also into out up down over under about after before between each any all some one two three four five ' +
    'more most other such only just very much many like get got make made use used using way ways take taking give given ' +
    'tell walk through say saying talk want need see look go come know think first second third then next now here ' +
    'percent per cent number numbers time times case cases work works working set sets').split(/\s+/));

function lossesFor(tag) {
    const dir = readdirSync(RUNS).filter((d) => d.endsWith('-' + tag)).sort().pop();
    const timeline = JSON.parse(readFileSync(`${RUNS}/${dir}/interview60.timeline.json`, 'utf8'));
    const prompts = JSON.parse(readFileSync(`${RUNS}/${dir}/interview60.prompts.json`, 'utf8'));
    const out = new Map();                       // id -> Set(lost content words)
    for (const item of timeline.items ?? []) {
        const cap = prompts[item.id];
        if (!cap?.user || !item.q) continue;
        const heardSet = new Set(norm(cap.user));
        const lost = new Set();
        for (const w of norm(item.q)) {
            if (STOP.has(w) || w.length < 3 || /^\d+$/.test(w)) continue;
            if (!heardSet.has(w)) lost.add(w);
        }
        out.set(item.id, lost);
    }
    return out;
}

const j = lossesFor('s50j'), k = lossesFor('s50k');
const ids = [...new Set([...j.keys(), ...k.keys()])].sort();

let fixedTotal = 0, newTotal = 0;
const fixedRows = [], newRows = [];
for (const id of ids) {
    const a = j.get(id) ?? new Set(), b = k.get(id) ?? new Set();
    const fixed = [...a].filter((w) => !b.has(w));
    const broke = [...b].filter((w) => !a.has(w));
    fixedTotal += fixed.length; newTotal += broke.length;
    if (fixed.length) fixedRows.push(`  ${id.padEnd(8)} ${fixed.join(', ')}`);
    if (broke.length) newRows.push(`  ${id.padEnd(8)} ${broke.join(', ')}`);
}
console.log(`questions compared: ${ids.length}`);
console.log(`\nNOW HEARD in s50k that s50j lost (${fixedTotal} words):`);
console.log(fixedRows.join('\n') || '  (none)');
console.log(`\nNEWLY LOST in s50k that s50j heard (${newTotal} words):`);
console.log(newRows.join('\n') || '  (none)');
console.log(`\ntotal words lost: s50j ${[...j.values()].reduce((n, s) => n + s.size, 0)}  ->  s50k ${[...k.values()].reduce((n, s) => n + s.size, 0)}`);
