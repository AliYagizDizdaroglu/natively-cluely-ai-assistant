/** Diffs a before/after pair of attrib-check.mjs outputs for one run, prints a 10-line-style summary. */
import fs from 'node:fs';

function diffRun(label, beforeFile, afterFile) {
    const before = JSON.parse(fs.readFileSync(beforeFile, 'utf8'));
    const after = JSON.parse(fs.readFileSync(afterFile, 'utf8'));
    const lines = [`== ${label} ==`];

    if (JSON.stringify(before) === JSON.stringify(after)) {
        lines.push('identical (byte-for-byte JSON.stringify equal)');
        return lines;
    }

    lines.push(`answersToNobody: ${before.answersToNobody} -> ${after.answersToNobody}`);

    const byDispatch = (arr) => new Map(arr.map((p) => [p.dispatchedAt, p]));
    const bMap = byDispatch(before.pairs), aMap = byDispatch(after.pairs);
    for (const [at, bp] of bMap) {
        const ap = aMap.get(at);
        if (!ap) { lines.push(`pair removed: dispatchedAt=${at} was id=${bp.id}`); continue; }
        if (bp.id !== ap.id) lines.push(`pair changed: dispatchedAt=${at} id ${bp.id} -> ${ap.id}`);
    }
    for (const [at, ap] of aMap) if (!bMap.has(at)) lines.push(`pair added: dispatchedAt=${at} id=${ap.id}`);

    const byId = (arr) => new Map(arr.map((i) => [i.id, i]));
    const bItems = byId(before.items), aItems = byId(after.items);
    const allIds = new Set([...bItems.keys(), ...aItems.keys()]);
    for (const id of allIds) {
        const bi = bItems.get(id), ai = aItems.get(id);
        if (!bi || !ai) { lines.push(`item id set changed at ${id}`); continue; }
        // Widened per review M1: every numeric/boolean field, not just the four the first pass named.
        const keys = ['answered', 'answeredAt', 'dispatches', 'heardBy', 'extended', 'supersedes', 'coverage', 'raceLoss', 'verdict'];
        const changed = keys.filter((k) => JSON.stringify(bi[k]) !== JSON.stringify(ai[k]));
        if (changed.length) lines.push(`item ${id}: ${changed.map((k) => `${k} ${JSON.stringify(bi[k])} -> ${JSON.stringify(ai[k])}`).join(', ')}`);
    }
    return lines;
}

// argv: <scratchpad-dir> [after-suffix] [out-file] — after-suffix lets a later round point at a
// differently-named after-snapshot (e.g. "-round1") without overwriting the first round's proof.
const [, , sp, afterSuffix = '', outName = 'attrib-diff.txt'] = process.argv;
const out = [
    ...diffRun('h40a', `${sp}/attrib-before-h40a.json`, `${sp}/attrib-after-h40a${afterSuffix}.json`),
    '',
    ...diffRun('h40b', `${sp}/attrib-before-h40b.json`, `${sp}/attrib-after-h40b${afterSuffix}.json`),
];
console.log(out.join('\n'));
fs.writeFileSync(`${sp}/${outName}`, out.join('\n') + '\n');
