// Throwaway (scratchpad only): rule 8 calibration of the two whitespace tests added in fix round 2 (M1). Builds mutants of the
// STAGED verbalHedge.ts (its final, round-2 text), each in its own scratch project beside the STAGED unit test.
// Every replacement must match exactly once or this script stops (a mutant that did not apply proves nothing).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, 'stage/electron/llm/verbalHedge.ts'), 'utf8');
const test = fs.readFileSync(path.join(HERE, 'stage/electron/llm/verbalHedge.test.ts'), 'utf8');

const once = (text, from, to) => {
    const n = text.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor matched ${n} times, not 1: ${from}`);
    return text.replace(from, to);
};

const mutants = {
    // the control: no mutation at all
    'm1-control-unmutated': (t) => t,
    // .trim() removed: a padded or blank value is no longer trimmed
    'm1-trim-removed': (t) => once(t, 'const raw = env[VERBAL_HEDGE_ENV]?.trim();', 'const raw = env[VERBAL_HEDGE_ENV];'),
    // a value of blanks only (non-empty before the trim) reads as off
    'm1-blank-reads-as-off': (t) => once(t, "    if (!raw || raw === '1') return true;", "    if (raw === '' && (env[VERBAL_HEDGE_ENV] ?? '') !== '') return false;\n    if (!raw || raw === '1') return true;"),
    // only the trailing blank is trimmed: ' 0 ' -> ' 0' (a leading blank now refuses), blanks-only still reads as unset
    'm1-trim-end-only': (t) => once(t, 'const raw = env[VERBAL_HEDGE_ENV]?.trim();', 'const raw = env[VERBAL_HEDGE_ENV]?.trimEnd();'),
    // only the leading blank is trimmed
    'm1-trim-start-only': (t) => once(t, 'const raw = env[VERBAL_HEDGE_ENV]?.trim();', 'const raw = env[VERBAL_HEDGE_ENV]?.trimStart();'),
};

for (const [name, mutate] of Object.entries(mutants)) {
    const dir = path.join(HERE, 'mut2', name);
    fs.mkdirSync(dir, { recursive: true });
    const m = mutate(src);
    if (name !== 'm1-control-unmutated' && m === src) throw new Error(`mutant ${name} is identical to the source`);
    fs.writeFileSync(path.join(dir, 'verbalHedge.ts'), m);
    fs.writeFileSync(path.join(dir, 'verbalHedge.test.ts'), test);
    console.log(`built ${name}`);
}
