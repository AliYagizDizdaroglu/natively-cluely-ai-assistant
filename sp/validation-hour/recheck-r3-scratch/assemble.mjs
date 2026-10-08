// Re-check r3: assemble VH\RECHECK-r3.md from recheck-r3-body.md, replacing <<EDITS>> with the verbatim OLD/NEW
// blocks of the three edit files (main, veto6, cap), each with its finding tag and the r3 line its OLD starts on.
// Then parse the written file back and prove: every OLD/NEW pair equals its source byte for byte, every OLD occurs
// exactly once in r3, and the main set applies in order. Writes only VH\RECHECK-r3.md (the one file the brief allows).
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
        if (line.startsWith('=== OLD')) { const t = line.slice(7).trim(); const sp = t.indexOf(' '); cur = { id: t.slice(0, sp), what: t.slice(sp + 1), old: [], new: [] }; mode = 'old'; continue; }
        if (line === '=== NEW') { mode = 'new'; continue; }
        if (line === '=== END') { edits.push({ ...cur, old: cur.old.join('\n'), new: cur.new.join('\n') }); cur = null; mode = null; continue; }
        if (mode === 'old') cur.old.push(line); else if (mode === 'new') cur.new.push(line);
    }
    return edits;
};
const tags = {
    'F1-a': 'finding 1', 'F1-b': 'finding 1', 'F1-c': 'finding 1', 'F1-d': 'finding 1', 'F1-e': 'findings 1 and 8',
    'F1-f': 'findings 1, 3 and 6', 'F1-g': 'findings 1 and 3', 'F1-h': 'findings 1, 2, 3 and 6; the user\'s list', 'F1-l': 'the user\'s list',
    'F1-i': 'finding 2', 'F1-j': 'the user\'s list', 'F1-k': 'the user\'s list', 'M1-a': 'findings 2 and 8', 'M1-b': 'finding 2',
    'M1-c': 'finding 2', 'M3-a': 'finding 4', 'M3-b': 'finding 4', 'M4-a': 'finding 5', 'M5-a': 'finding 7', 'M6-a': 'finding 8',
    'M6-b': 'finding 8', 'M7-a': 'finding 9', 'M2-a': 'finding 3, only if the user vetoes ruling 6', 'M2-b': 'finding 3, only if the user vetoes ruling 6',
    'M2-c': 'finding 3, only if the user vetoes ruling 6', 'M2-d': 'finding 3, only if the user vetoes ruling 6', 'M2-e': 'finding 3, only if the user vetoes ruling 6',
    'M8-cap': 'finding 6, only if the user chooses the cap',
};
const lineOf = (s) => r3.slice(0, r3.indexOf(s)).split('\n').length;
const sets = [['The main set (apply in this order)', parse('recheck-r3-edits.txt')], ['Only if the user vetoes ruling 6 (decision item 7)', parse('recheck-r3-edits-veto6.txt')], ['Only if the user chooses the cap (decision item 8)', parse('recheck-r3-edits-cap.txt')]];
const fence = '````';
let out = '';
for (const [title, set] of sets) {
    out += `### ${title}\n\n`;
    for (const e of set) {
        if (!tags[e.id]) throw new Error(`no tag for ${e.id}`);
        const what = e.what.replace(/\s*\((only if[^)]*)\)\s*$/, '');
        out += `**${e.id}** (${tags[e.id]}): ${what}. Revision 3, line ${lineOf(e.old)}.\n\nOLD:\n${fence}text\n${e.old}\n${fence}\nNEW:\n${fence}text\n${e.new}\n${fence}\n\n`;
    }
}
const body = fs.readFileSync(path.join(HERE, 'recheck-r3-body.md'), 'utf8');
if (body.split('<<EDITS>>').length !== 2) throw new Error('the body must hold exactly one <<EDITS>>');
const doc = body.replace('<<EDITS>>', () => out.trimEnd());
const target = path.join(VH, 'RECHECK-r3.md');
fs.writeFileSync(target, doc);

// Parse back and prove.
const written = fs.readFileSync(target, 'utf8');
const re = /\*\*([A-Z0-9]+-[a-z0-9]+)\*\* \([^\n]*\n\nOLD:\n````text\n([\s\S]*?)\n````\nNEW:\n````text\n([\s\S]*?)\n````/g;
const blocks = [...written.matchAll(re)].map((m) => ({ id: m[1], old: m[2], new: m[3] }));
const all = sets.flatMap(([, s]) => s);
let bad = 0;
if (blocks.length !== all.length) { console.log(`parsed ${blocks.length} blocks, expected ${all.length}`); bad++; }
for (const e of all) {
    const b = blocks.find((x) => x.id === e.id);
    if (!b) { console.log(`${e.id}: not found in RECHECK-r3.md`); bad++; continue; }
    if (b.old !== e.old || b.new !== e.new) { console.log(`${e.id}: differs from its source`); bad++; }
    const n = r3.split(b.old).length - 1;
    if (n !== 1) { console.log(`${e.id}: OLD occurs ${n} times in r3`); bad++; }
}
let t = r3;
for (const b of blocks.filter((x) => !/^M2-|^M8-cap/.test(x.id))) { if (t.split(b.old).length - 1 !== 1) { console.log(`${b.id}: not unique when applied in order`); bad++; } else t = t.replace(b.old, () => b.new); }
console.log(`wrote ${target} (${written.split('\n').length} lines, ${Buffer.byteLength(written)} bytes); parsed back ${blocks.length} OLD/NEW blocks; ${bad ? `${bad} PROBLEM(S)` : 'every block equals its source, every OLD unique in r3, the main set applies in order'}`);
process.exit(bad ? 1 : 0);
