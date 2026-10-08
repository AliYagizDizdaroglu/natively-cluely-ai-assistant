// Throwaway: print an extracted item's turns, raw and filtered answer.  node show-item.mjs <answers.json> <id>...
import fs from 'node:fs';
const [, , file, ...ids] = process.argv;
const A = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const id of ids) {
    const a = A[id];
    console.log(`== ${id}  heard: ${a.heard?.slice(0, 120)}`);
    for (const t of a.turns ?? []) console.log(`   turn at ${t.atMs} -> ${t.endMs} ms, ${t.words} w, ${t.how}${t.premature ? ', PREMATURE' : ''}: "${t.text}"`);
    console.log(`   RAW: ${a.rawAnswer}\n   ANSWER: ${a.answer}\n`);
}
