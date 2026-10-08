// Throwaway, read-only: the shape of an empty answer record, never its text. Prints rawLen, whether the raw holds a
// fenced code block, how much of the raw sits inside fences, the spoken word count, the cue count and the finish.
//   node empty-shape.mjs <answers.json> <id> [<answers.json> <id> ...]
import fs from 'node:fs';
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i += 2) {
    const rec = JSON.parse(fs.readFileSync(a[i], 'utf8'))[a[i + 1]];
    if (!rec) { console.log(`${a[i + 1]}: no record in ${a[i]}`); continue; }
    const raw = String(rec.raw ?? '');
    const fenced = [...raw.matchAll(/```[\s\S]*?(```|$)/g)].reduce((n, m) => n + m[0].length, 0);
    console.log(`${a[i + 1]} (${a[i].split(/[\\/]/).pop()}): rawLen ${raw.length}, fences ${(raw.match(/```/g) ?? []).length}, chars inside fences ${fenced}, spoken words ${rec.words}, cues ${Array.isArray(rec.cues) ? rec.cues.length : 'none'}, finish ${rec.finish}`);
}
