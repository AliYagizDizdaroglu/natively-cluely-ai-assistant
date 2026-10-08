// Fix round 1 re-review: mirrors of MAIN's CURRENT test + module (read-only copies).
//   pt/r1   no interview60.runs/ (a clean checkout)      pt/r1p  with the two runs' log + timeline and the fixtures
//   pt/r1w  the current test with T3's orphan case changed to a stray line between a final and its repair (proposal)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = path.join(MAIN, 'electron/test/golden');
const NAMES = ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9'];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 8);
const test = fs.readFileSync(path.join(G, 'interview60.turns-finals.test.ts'));
const mod = fs.readFileSync(path.join(G, 'interview60.turns-finals.mjs'));
console.log(`MAIN test ${test.length} B ${sha(test)}, module ${mod.length} B ${sha(mod)}`);
const cur0 = fs.readFileSync(path.join(HERE, 'pt/cur/interview60.turns-finals.mjs'));
console.log(`round-0 module kept in pt/cur: ${cur0.length} B ${sha(cur0)}`);
const edit = (s, from, to) => { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`edit hits ${n} places: ${from}`); return s.replace(from, to); };
let w = edit(test.toString('utf8'), "        const [, f1, f2, rep] = LOG.split('\\n');", "        const [iv, f1, f2, rep] = LOG.split('\\n');");
w = edit(w, "finalsFrom([f2, rep, rep].join('\\n'), 0)", "finalsFrom([f2, iv, rep].join('\\n'), 0)");
for (const [dir, t, withRuns] of [['r1', test, false], ['r1p', test, true], ['r1w', w, true]]) {
    const d = path.join(HERE, 'pt', dir);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'interview60.turns-finals.test.ts'), t);
    fs.writeFileSync(path.join(d, 'interview60.turns-finals.mjs'), mod);
    if (withRuns) for (const name of NAMES) {
        fs.mkdirSync(path.join(d, 'interview60.runs', name), { recursive: true });
        fs.mkdirSync(path.join(d, 'fixtures'), { recursive: true });
        for (const f of ['natively_debug.log', 'interview60.timeline.json']) fs.copyFileSync(path.join(G, 'interview60.runs', name, f), path.join(d, 'interview60.runs', name, f));
        fs.copyFileSync(path.join(G, 'fixtures', `${name}-turns.json`), path.join(d, 'fixtures', `${name}-turns.json`));
    }
    console.log(`pt/${dir}: runs ${fs.existsSync(path.join(d, 'interview60.runs'))}`);
}
