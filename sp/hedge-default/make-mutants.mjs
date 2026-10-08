// Throwaway (scratchpad only): rule 8 calibration. Builds mutants of the staged verbalHedge.ts, each in its own
// scratch project beside a copy of the staged unit test, so vitest can be pointed at it with --root.
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
    // A: the opt-out is broken: '0' reads as on.
    'zero-is-on': (t) => once(t, "if (raw === '0') return false;", "if (raw === '0') return true;"),
    // B: a typo no longer refuses: junk reads as on.
    'junk-is-on': (t) => once(t, /throw new Error\(`\$\{VERBAL_HEDGE_ENV\}="\$\{raw\}" is not[^\n]*\n/.exec(t)[0], 'return true;\n'),
    // C: the trigger is not read while the flag is unset (the pre-flip behaviour of a junk trigger).
    'trigger-unread-when-unset': (t) => once(t, "    const triggerMs = verbalHedgeTriggerMs(env);\n", "    if (!env[VERBAL_HEDGE_ENV]) return `[Main] verbal hedge: on trigger=${DEFAULT_HEDGE_TRIGGER_MS}ms`;\n    const triggerMs = verbalHedgeTriggerMs(env);\n"),
    // D: an empty value is refused instead of meaning the default.
    'empty-is-refused': (t) => once(t, "if (!raw || raw === '1') return true;", "if (raw === undefined || raw === '1') return true;"),
    // E: the old default: unset reads as off.
    'unset-is-off': (t) => once(once(t, "if (!raw || raw === '1') return true;", "if (!raw || raw === '0') return false;\n    if (raw === '1') return true;"), "    if (raw === '0') return false;\n    throw", "    throw"),
};

for (const [name, mutate] of Object.entries(mutants)) {
    const dir = path.join(HERE, 'mut', name);
    fs.mkdirSync(dir, { recursive: true });
    const m = mutate(src);
    if (m === src) throw new Error(`mutant ${name} is identical to the source`);
    fs.writeFileSync(path.join(dir, 'verbalHedge.ts'), m);
    fs.writeFileSync(path.join(dir, 'verbalHedge.test.ts'), test);
    console.log(`built ${name}`);
}
