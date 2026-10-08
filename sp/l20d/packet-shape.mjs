// Prints the SHAPE of grading packets (top-level fields, item fields, counts, the rubric's hash), never an answer.
// Used to confirm that an L20d packet has the shape the L20c grader prompt describes.
//   node packet-shape.mjs <packet.json> [<packet.json> ...]
import fs from 'node:fs';
import crypto from 'node:crypto';
for (const f of process.argv.slice(2)) {
    const p = JSON.parse(fs.readFileSync(f, 'utf8'));
    const items = p.items ?? [];
    const fields = [...new Set(items.flatMap((x) => Object.keys(x)))];
    const rub = typeof p.rubric === 'string' ? p.rubric : JSON.stringify(p.rubric);
    console.log(f.split(/[\\/]/).slice(-3).join('/'));
    console.log(`  top-level: ${Object.keys(p).join(', ')}${p.model !== undefined ? `   model=${JSON.stringify(p.model)}` : ''}`);
    console.log(`  rubric: ${typeof p.rubric}, ${rub.length} chars, sha256/12 ${crypto.createHash('sha256').update(rub).digest('hex').slice(0, 12)}`);
    console.log(`  items: ${items.length}; fields: ${fields.join(', ')}`);
    console.log(`  questions with a bracketed suffix: ${items.filter((x) => /\[[^\]]+\]\s*$/.test(x.question ?? '')).length}; distinct ids: ${new Set(items.map((x) => x.id ?? x.key.split('#')[0])).size}`);
}
