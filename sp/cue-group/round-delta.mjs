// The fix-round delta of an uncommitted task: compares the previous review package's diff with the new one, file by
// file, and prints the added and removed lines of the working-tree version that changed between the two rounds (a
// line-multiset delta of the '+' lines, enough for a small fix round). Prints files, counts and the changed lines.
//   node round-delta.mjs <old.diff.txt> <new.diff.txt> [--out <file>]
import fs from 'node:fs';
const [oldF, newF] = process.argv.slice(2);
const oi = process.argv.indexOf('--out');
const byFile = (text) => {
    const files = {};
    let cur = null;
    for (const line of text.split('\n')) {
        const m = line.match(/^diff --git a\/(\S+) /);
        if (m) { cur = m[1]; files[cur] = { plus: [], minus: [] }; continue; }
        if (!cur || line.startsWith('+++') || line.startsWith('---')) continue;
        if (line.startsWith('+')) files[cur].plus.push(line.slice(1));
        else if (line.startsWith('-')) files[cur].minus.push(line.slice(1));
    }
    return files;
};
const O = byFile(fs.readFileSync(oldF, 'utf8')), N = byFile(fs.readFileSync(newF, 'utf8'));
const out = [];
const bag = (a) => a.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
const minusBag = (a, b) => { const mb = bag(b); return a.filter((x) => { const n = mb.get(x) ?? 0; if (n) { mb.set(x, n - 1); return false; } return true; }); };
for (const f of [...new Set([...Object.keys(O), ...Object.keys(N)])].sort()) {
    const o = O[f] ?? { plus: [], minus: [] }, n = N[f] ?? { plus: [], minus: [] };
    const added = minusBag(n.plus, o.plus), removed = minusBag(o.plus, n.plus);
    const baseSame = JSON.stringify(o.minus) === JSON.stringify(n.minus);
    out.push(`${f}: vs the previous round, working-tree lines added ${added.length}, removed ${removed.length}; the base-side lines ${baseSame ? 'unchanged' : 'CHANGED'}`);
    for (const x of removed) out.push(`  - ${x}`);
    for (const x of added) out.push(`  + ${x}`);
}
const text = out.join('\n') + '\n';
if (oi > 0) fs.writeFileSync(process.argv[oi + 1], text);
process.stdout.write(text);
