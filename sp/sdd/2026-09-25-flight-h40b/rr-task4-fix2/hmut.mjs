// Re-review 2 probe (throwaway): is i1-retry-trace.mjs itself calibrated? Mutated COPIES of the harness
// (its runNew without M1's guard; its runNew without N2's field) must FAIL; and a runner copy without N2
// must NOT change the harness's verdict (it never reads the runner).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix2`;
const H = fs.readFileSync(`${SP}/i1-retry-trace.mjs`, 'utf8');
const rep1 = (t, from, to) => { const n = t.split(from).length - 1; if (n !== 1) throw new Error(`expected 1 match, found ${n}: ${from.slice(0, 80)}`); return t.replace(from, () => to); };
const variants = {
    'harness runNew without M1 guard': rep1(H, '                if (MAX_TRIES > 1 && attempts >= MAX_TRIES) break;\n', ''),
    'harness runNew without N2 field': rep1(H, '? { transientError: lastErr, cutRetried: dropRetried }', '? { transientError: lastErr }'),
};
for (const [label, text] of Object.entries(variants)) {
    const f = `${HERE}/h.${label.includes('M1') ? 'm1' : 'n2'}.mjs`;
    fs.writeFileSync(f, text);
    const r = spawnSync(process.execPath, [f], { encoding: 'utf8' });
    const keep = r.stdout.split('\n').filter((l) => /^FAIL|mismatches of|correct$|OVERALL|named case/.test(l));
    console.log(`${label}: EXIT ${r.status}`); for (const l of keep) console.log(`    ${l}`);
}
