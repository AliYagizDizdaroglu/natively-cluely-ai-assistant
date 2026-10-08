// Builds scratch mirrors for the proposed test changes, each derived from MAIN's files by exact single-hit edits:
//   pt/cur  MAIN's test + module, unchanged
//   pt/abc  test: (A) parity tests skip where the gitignored run folder is absent, (B) T2's since = the repaired
//           final's own ms, (C) the empty final moved after the repair line; module unchanged
//   pt/d    abc + (D) the module refuses a repair line not right under its own final; T3 becomes the refusal test
//   node pt.mjs build            -> writes the mirrors (no run data)
//   node pt.mjs present <mirror> -> copies the two runs' log + timeline and the two fixtures into it
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = path.join(MAIN, 'electron/test/golden');
const TEST = fs.readFileSync(path.join(G, 'interview60.turns-finals.test.ts'), 'utf8');
const MOD = fs.readFileSync(path.join(G, 'interview60.turns-finals.mjs'), 'utf8');
const NAMES = ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9'];
const edit = (s, from, to) => { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`edit hits ${n} places: ${from.slice(0, 60)}`); return s.replace(from, to); };
const write = (dir, test, mod) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'interview60.turns-finals.test.ts'), test); fs.writeFileSync(path.join(dir, 'interview60.turns-finals.mjs'), mod); };

if (process.argv[2] === 'build') {
    const EMPTY = "    '2026-09-29T11:19:28.500Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=\"\"',\n";
    const REP = "    '2026-09-29T11:19:29.373Z [LOG] [DeepgramStreaming] boundary repair: restored \"hallucinations\" before \"in a rag answer without just making it r\"',\n";
    let abc = edit(TEST, EMPTY, '');
    abc = edit(abc, REP, REP + EMPTY.replace('28.500Z', '29.900Z'));
    abc = edit(abc, "finalsFrom(LOG, at('2026-09-29T11:19:29.000Z'))", "finalsFrom(LOG, at('2026-09-29T11:19:29.373Z'))");
    abc = edit(abc,
        "        it(`reproduces the committed ${name} fixture's finals from its run log`, () => {\n            const golden = __dirname;\n            const run = path.join(golden, 'interview60.runs', name);\n",
        "        const golden = __dirname;\n        const run = path.join(golden, 'interview60.runs', name);\n        // interview60.runs/ is gitignored (.gitignore:258): a clean checkout has no run logs, so these skip there,\n        // as in interview60.metrics.test.ts and interview60.pass-record.test.ts.\n        it.skipIf(!fs.existsSync(path.join(run, 'natively_debug.log')))(`reproduces the committed ${name} fixture's finals from its run log (skipped where the run folder is absent)`, () => {\n");
    let d = edit(abc, "    '2026-09-29T11:19:31.002Z [LOG] [DeepgramStreaming] boundary repair: restored \"not\" before \"this one\"',\n", '');
    d = edit(d,
        "    it('a repair line that is not the very next line after a final is not applied (one synchronous handler writes both lines)', () => {\n        expect(finalsFrom(LOG, 0).some((f) => f.text.startsWith('not '))).toBe(false);\n    });\n",
        "    it('refuses a boundary-repair line that is not right under its own final (one synchronous handler writes both lines)', () => {\n        const [, f1, f2, rep] = LOG.split('\\n');\n        expect(() => finalsFrom([f2, rep, rep].join('\\n'), 0)).toThrow(/line 3 is a boundary repair with no final directly above it/);\n        expect(() => finalsFrom([f1, rep].join('\\n'), 0)).toThrow(/line 2 is a boundary repair for another final than line 1/);\n    });\n");
    const dMod = edit(MOD,
        "        if (!m) continue;\n        const rep = lines[i + 1]?.match(REPAIR);\n",
        "        if (!m) {\n            if (REPAIR.test(lines[i]) && !FINAL.test(lines[i - 1] ?? '')) throw new Error(`finalsFrom: line ${i + 1} is a boundary repair with no final directly above it`);\n            continue;\n        }\n        const rep = lines[i + 1]?.match(REPAIR);\n        if (rep && !lines[i + 1].includes(`before \"${m[2].slice(0, 40)}\"`)) throw new Error(`finalsFrom: line ${i + 2} is a boundary repair for another final than line ${i + 1}`);\n");
    write(path.join(HERE, 'pt/cur'), TEST, MOD);
    write(path.join(HERE, 'pt/abc'), abc, MOD);
    write(path.join(HERE, 'pt/d'), d, dMod);
    console.log('built pt/cur, pt/abc, pt/d');
} else if (process.argv[2] === 'present') {
    const dir = path.join(HERE, 'pt', process.argv[3]);
    for (const name of NAMES) {
        fs.mkdirSync(path.join(dir, 'interview60.runs', name), { recursive: true });
        fs.mkdirSync(path.join(dir, 'fixtures'), { recursive: true });
        for (const f of ['natively_debug.log', 'interview60.timeline.json']) fs.copyFileSync(path.join(G, 'interview60.runs', name, f), path.join(dir, 'interview60.runs', name, f));
        fs.copyFileSync(path.join(G, 'fixtures', `${name}-turns.json`), path.join(dir, 'fixtures', `${name}-turns.json`));
    }
    console.log(`run data copied into pt/${process.argv[3]}: ${fs.existsSync(path.join(dir, 'interview60.runs', NAMES[1], 'natively_debug.log'))}`);
}
