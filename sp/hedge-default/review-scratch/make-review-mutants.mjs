// Throwaway (reviewer, scratchpad only): independent mutants of MAIN's CURRENT verbalHedge.ts, each beside a
// byte-exact copy of MAIN's CURRENT verbalHedge.test.ts, so vitest can run them with --root. MAIN is only read.
// Every anchor must match exactly once, or the script stops: a mutant that did not apply proves nothing.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const srcPath = path.join(MAIN, 'electron', 'llm', 'verbalHedge.ts');
const testPath = path.join(MAIN, 'electron', 'llm', 'verbalHedge.test.ts');
const src = fs.readFileSync(srcPath, 'utf8');
const test = fs.readFileSync(testPath, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
console.log(`MAIN verbalHedge.ts sha ${sha(src)}  test sha ${sha(test)}`);

const once = (text, from, to) => {
    const n = text.split(from).length - 1;
    if (n !== 1) throw new Error(`anchor matched ${n} times, not 1: ${JSON.stringify(from)}`);
    return text.replace(from, to);
};

const mutants = {
    base: (t) => t,
    // R1: '1' reads as off (the explicit opt-in broken).
    'one-is-off': (t) => once(t, "if (!raw || raw === '1') return true;", "if (!raw) return true;\n    if (raw === '1') return false;"),
    // R2: describe reads the trigger BEFORE the flag, so '0' + junk trigger throws instead of printing off.
    'trigger-read-before-flag': (t) => once(t,
        "    if (!verbalHedgeEnabled(env)) return '[Main] verbal hedge: off';\n    const triggerMs = verbalHedgeTriggerMs(env);\n",
        "    const triggerMs = verbalHedgeTriggerMs(env);\n    if (!verbalHedgeEnabled(env)) return '[Main] verbal hedge: off';\n"),
    // R3: the line always prints the default trigger, ignoring an override (still validates it).
    'line-ignores-override': (t) => once(t, 'return `[Main] verbal hedge: on trigger=${triggerMs}ms`;', 'void triggerMs; return `[Main] verbal hedge: on trigger=${DEFAULT_HEDGE_TRIGGER_MS}ms`;'),
    // R4: the error no longer names the variable.
    'error-unnamed': (t) => once(t, 'throw new Error(`${VERBAL_HEDGE_ENV}="${raw}" is not "1"', 'throw new Error(`"${raw}" is not "1"'),
    // R5: no trim on the flag - EXPECTED TO SURVIVE: no test feeds a padded value (the gap under review).
    'no-trim': (t) => once(t, 'const raw = env[VERBAL_HEDGE_ENV]?.trim();', 'const raw = env[VERBAL_HEDGE_ENV];'),
    // R6: whitespace-only reads as OFF (the pre-flip meaning of a blank value) - EXPECTED TO SURVIVE for the same reason.
    'blank-is-off': (t) => once(t, "if (!raw || raw === '1') return true;", "if (raw === '' && env[VERBAL_HEDGE_ENV] !== '') return false;\n    if (!raw || raw === '1') return true;"),
};

for (const [name, mutate] of Object.entries(mutants)) {
    const dir = path.join(HERE, 'mut', name);
    fs.mkdirSync(dir, { recursive: true });
    const m = mutate(src);
    if (name !== 'base' && m === src) throw new Error(`mutant ${name} is identical to the source`);
    fs.writeFileSync(path.join(dir, 'verbalHedge.ts'), m);
    fs.writeFileSync(path.join(dir, 'verbalHedge.test.ts'), test);
    console.log(`built ${name}  src sha ${sha(m)}`);
}
