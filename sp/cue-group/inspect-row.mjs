// Shape of one saved reply and where a sentinel sits in what the built chain shows. Never prints prose: line classes,
// word counts, and for each sentinel in the output the kind of text around it (word counts only).
//   node inspect-row.mjs <rows.json> <arm> <model substring> <id> <rep>
import fs from 'node:fs';
import { shape } from './repro-blockonly.mjs';
import { chain } from './old-vs-new-replay.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const OLD = require('./old-dist/verbalStreamFilter.e3fae5f.cjs');
const [file, arm, model, id, rep] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
const r = rows.find((x) => x.arm === arm && String(x.model).includes(model) && x.id === id && String(x.rep) === String(rep));
if (!r) { console.log('row not found'); process.exit(2); }
const words = (s) => (String(s).match(/\S+/g) ?? []).length;
console.log(`shape: ${shape(r.raw).join(' ')}`);
const rawLines = r.raw.split('\n');
rawLines.forEach((l, i) => { for (const s of ['__CUES__', '__MORE__']) { const at = l.indexOf(s); if (at !== -1) console.log(`raw line ${i + 1}: ${s} at column ${at}; ${words(l.slice(0, at))} word(s) before it on the line, ${words(l.slice(at + s.length))} after`); } });
const c = await chain(OLD, r.raw, 90);
console.log(`shown: ${words(c.out)} words; cues ${JSON.stringify(c.cues)}; offers ${JSON.stringify(c.offers)}`);
c.out.split('\n').forEach((l, i) => { for (const s of ['__CUES__', '__MORE__']) { const at = l.indexOf(s); if (at !== -1) console.log(`shown line ${i + 1}: ${s} at column ${at}; ${words(l.slice(0, at))} word(s) before it on the line, ${words(l.slice(at + s.length))} after`); } });
