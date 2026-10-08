// Re-review probe (throwaway): more fixture copies, written ONLY under rr-task4-fix1/fx-*.
//   fx-full       the complete fixture (own blind/ rebuilt by the probe) — for scorer-mutation runs
//   fx-transient  gemini-3.6-flash_def.json exists but holds only transientError records (all 11 ids 503'd)
//   fx-zero       gemini-3.5-flash_def.json exists but is 0 bytes (a runner killed mid-write)
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const FIX = `${SP}/flash-h40b-fixture`;
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix1`;
const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
        if (e.isDirectory()) { if (e.name === 'blind') continue; copyDir(`${from}/${e.name}`, `${to}/${e.name}`); }
        else fs.copyFileSync(`${from}/${e.name}`, `${to}/${e.name}`);
    }
};
for (const name of ['fx-full', 'fx-transient', 'fx-zero']) {
    const to = `${HERE}/${name}`;
    fs.rmSync(to, { recursive: true, force: true });
    copyDir(`${FIX}/run`, `${to}/run`);
    copyDir(`${FIX}/flash`, `${to}/flash`);
}
const f36 = `${HERE}/fx-transient/flash/interview60.answers.gemini-3.6-flash_def.json`;
const s36 = JSON.parse(fs.readFileSync(f36, 'utf8'));
fs.writeFileSync(f36, JSON.stringify(Object.fromEntries(Object.entries(s36).map(([id, v]) => [id, { id, q: v.q, model: 'gemini-3.6-flash_def', transientError: 'HTTP 503' }])), null, 1));
fs.writeFileSync(`${HERE}/fx-zero/flash/interview60.answers.gemini-3.5-flash_def.json`, '');
for (const name of ['fx-full', 'fx-transient', 'fx-zero']) console.log(name, fs.readdirSync(`${HERE}/${name}/flash`).length, 'files');
