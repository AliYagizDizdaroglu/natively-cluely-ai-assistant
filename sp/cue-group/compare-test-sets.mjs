// Compare two per-test listings (from summarize-vitest-json.mjs): what is in A but not B, by status.
// usage: node compare-test-sets.mjs <A.txt> <B.txt> [labelA labelB]
import fs from 'node:fs';

const [, , a, b, la = 'A', lb = 'B'] = process.argv;
const load = (f) => {
    const m = new Map();       // "file :: fullName" -> [statuses]
    for (const line of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
        if (line.includes(' :: SUITE FAILED TO RUN :: ')) continue;
        const i = line.lastIndexOf(' :: ');
        const key = line.slice(0, i), st = line.slice(i + 4);
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(st);
    }
    return m;
};
const A = load(a), B = load(b);
const onlyA = [...A.keys()].filter((k) => !B.has(k));
const onlyB = [...B.keys()].filter((k) => !A.has(k));
const statusChanged = [...A.keys()].filter((k) => B.has(k) && A.get(k).join() !== B.get(k).join());
const dupNamesA = [...A.entries()].filter(([, v]) => v.length > 1).length;
const dupNamesB = [...B.entries()].filter(([, v]) => v.length > 1).length;
console.log(`${la}: ${[...A.values()].reduce((n, v) => n + v.length, 0)} tests (${A.size} distinct names, ${dupNamesA} names repeated)`);
console.log(`${lb}: ${[...B.values()].reduce((n, v) => n + v.length, 0)} tests (${B.size} distinct names, ${dupNamesB} names repeated)`);
console.log(`in ${la} but not in ${lb}: ${onlyA.length}`);
for (const k of onlyA) console.log(`   - ${k}   [${A.get(k).join(',')}]`);
console.log(`in ${lb} but not in ${la}: ${onlyB.length}`);
if (process.argv.includes('--list-new')) for (const k of onlyB) console.log(`   + ${k}   [${B.get(k).join(',')}]`);
console.log(`same name, different status: ${statusChanged.length}`);
for (const k of statusChanged) console.log(`   ~ ${k}   ${A.get(k).join(',')} -> ${B.get(k).join(',')}`);
