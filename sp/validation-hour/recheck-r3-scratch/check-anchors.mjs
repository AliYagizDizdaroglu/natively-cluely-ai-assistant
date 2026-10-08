// Re-check r3: every proposed OLD must occur exactly once in r3 (as RECHECK-r3.md says), and the edits must apply in
// order to an in-memory copy (each OLD unique at the moment it is applied). The optional ruling-6 set is checked on r3
// alone and after the main set. Two deliberately wrong anchors must FAIL (the check's own calibration). Writes the
// edited copies into this folder only (never VH's r3), for reading.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.dirname(HERE);
const r3 = fs.readFileSync(path.join(VH, 'PREREGISTER-h40d.r3.md'), 'utf8');
const parse = (file) => {
    const spec = fs.readFileSync(path.join(HERE, file), 'utf8').replace(/\r\n/g, '\n');
    const edits = []; let cur = null, mode = null;
    for (const line of spec.split('\n')) {
        if (line.startsWith('=== OLD')) { cur = { name: line.slice(7).trim(), old: [], new: [] }; mode = 'old'; continue; }
        if (line === '=== NEW') { mode = 'new'; continue; }
        if (line === '=== END') { edits.push({ name: cur.name, old: cur.old.join('\n'), new: cur.new.join('\n') }); cur = null; mode = null; continue; }
        if (mode === 'old') cur.old.push(line); else if (mode === 'new') cur.new.push(line);
        else if (line.trim()) throw new Error(`stray text: ${line.slice(0, 60)}`);
    }
    return edits;
};
const count = (t, s) => t.split(s).length - 1;
const lineOf = (t, s) => t.slice(0, t.indexOf(s)).split('\n').length;
const apply = (text, edits, label) => {
    let ok = true;
    for (const e of edits) {
        const n = count(text, e.old);
        if (n !== 1) { console.log(`  ${label}: ${e.name}: OLD occurs ${n} times at application — FAIL`); ok = false; continue; }
        text = text.replace(e.old, () => e.new);
    }
    return { text, ok };
};
const main = parse('recheck-r3-edits.txt'), veto = parse('recheck-r3-edits-veto6.txt'), cap = parse('recheck-r3-edits-cap.txt');
let bad = 0;
for (const [label, set] of [['main', main], ['veto6', veto], ['cap', cap]]) {
    for (const e of set) {
        const n = count(r3, e.old);
        console.log(`${label.padEnd(6)} ${e.name.padEnd(55)} occurrences in r3: ${n}${n === 1 ? `  (line ${lineOf(r3, e.old)})` : '  <-- FAIL'}`);
        if (n !== 1) bad++;
    }
}
const a = apply(r3, main, 'main on r3');
const b = apply(a.text, veto, 'veto6 after main');
const c = apply(r3, veto, 'veto6 on r3 alone');
const d = apply(b.text, cap, 'cap after main and veto6');
const e = apply(a.text, cap, 'cap after main alone');
console.log(`apply main in order: ${a.ok ? 'OK' : 'FAIL'}; veto6 after main: ${b.ok ? 'OK' : 'FAIL'}; veto6 on r3 alone: ${c.ok ? 'OK' : 'FAIL'}; cap after main+veto6: ${d.ok ? 'OK' : 'FAIL'}; cap after main alone: ${e.ok ? 'OK' : 'FAIL'}`);
if (!d.ok || !e.ok) bad++;
fs.writeFileSync(path.join(HERE, 'r3-with-recheck-edits.md'), a.text);
fs.writeFileSync(path.join(HERE, 'r3-with-recheck-edits-and-veto6.md'), b.text);
// calibration: two anchors that must not be found once
for (const wrong of ['A 3a miss without both is an "other FAIL"', 'the cue reps’ TOTAL gated wrong']) console.log(`calibration (must not be 1): "${wrong.slice(0, 40)}…" occurs ${count(r3, wrong)} times -> ${count(r3, wrong) === 1 ? 'UNEXPECTED' : 'fails as it should'}`);
const total = main.length + veto.length + cap.length;
console.log(bad || !a.ok || !b.ok || !c.ok ? `ANCHORS: ${bad} problem(s); see above` : `ANCHORS OK: ${total} of ${total} unique in r3, all applied in order (main ${main.length}, veto6 ${veto.length}, cap ${cap.length})`);
