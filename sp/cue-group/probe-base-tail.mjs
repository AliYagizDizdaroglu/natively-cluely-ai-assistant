// The base user turn's tail only (from the "USER QUESTION:" header on; the profile above it is never printed):
// first 5 words of each line, so the structure after the interviewer lines can be compared between two bases.
//   node probe-base-tail.mjs <prompts.json> [baseId]
import fs from 'node:fs';
const [file, baseId = 'S1Q08F'] = process.argv.slice(2);
const user = JSON.parse(fs.readFileSync(file, 'utf8'))[baseId]?.user;
if (!user) { console.log(`no user turn for ${baseId}`); process.exit(2); }
const lines = user.split('\n');
const start = lines.findIndex((l) => /^USER QUESTION:/.test(l));
if (start < 0) { console.log('no USER QUESTION: header; printing nothing'); process.exit(2); }
for (let i = start; i < lines.length; i++) {
    const w = lines[i].trim().split(/\s+/).filter(Boolean);
    console.log(`${String(i).padStart(3)}  ${w.slice(0, 5).join(' ')}${w.length > 5 ? ' …' : ''}  (${w.length} words)`);
}
