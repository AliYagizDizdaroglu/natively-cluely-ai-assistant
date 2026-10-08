// Throwaway: calibrates flash-h40a-score-blind.mjs on SYNTHETIC verdicts with known answers. Copies the
// real key files into a scratch blind dir, writes verdicts by arm, runs the scorer against that dir, and
// checks the totals it prints. Three cases:
//   A  everything acceptable            → Flash 6/6, 9/9, 33/33; lite 48/48 each
//   B  Flash wrong, lite acceptable     → Flash 0/6, 0/9, 0/33; lite 48/48; 48 "wrong" reasons
//   C  Flash weak, 3.1 wrong, 3.5 fine  → Flash 0/…; 3.1 LOW 0/48, 3.5 HIGH 48/48; 48 "weak" reasons
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const REAL = `${SP}/flash-h40a/blind`, CAL = `${SP}/flash-h40a/blind-cal`;
const keys = fs.readdirSync(REAL).filter((x) => /^key\.blind-\d+\.json$/.test(x));
if (!keys.length) { console.log('no key files yet — build the pairs first'); process.exit(2); }
const V = (c) => ({ correctness: c, on_topic: 2, delivery: 2, reason: c === 2 ? 'fine' : c === 1 ? 'synthetic weak' : 'synthetic wrong' });
const cases = {
    A: { by: () => 2, expect: [/gemini-3\.8-flash: 6\/6 acceptable/, /gemini-3\.7-flash: 9\/9 acceptable/, /gemini-3\.6-flash: 33\/33 acceptable/, /3\.1 LOW 48\/48, 3\.5 HIGH 48\/48/] },
    B: { by: (arm) => (/flash default/.test(arm) ? 0 : 2), expect: [/gemini-3\.8-flash: 0\/6 acceptable/, /gemini-3\.7-flash: 0\/9 acceptable/, /gemini-3\.6-flash: 0\/33 acceptable/, /3\.1 LOW 48\/48, 3\.5 HIGH 48\/48/, (o) => (o.match(/ wrong: synthetic wrong/g) ?? []).length === 48] },
    C: { by: (arm) => (/flash default/.test(arm) ? 1 : arm === '3.1-lite LOW' ? 0 : 2), expect: [/gemini-3\.6-flash: 0\/33 acceptable/, /3\.1 LOW 0\/48, 3\.5 HIGH 48\/48/, (o) => (o.match(/ weak: synthetic weak/g) ?? []).length === 48] },
};
let failed = 0;
for (const [name, c] of Object.entries(cases)) {
    fs.rmSync(CAL, { recursive: true, force: true }); fs.mkdirSync(CAL, { recursive: true });
    for (const f of keys) {
        const key = JSON.parse(fs.readFileSync(`${REAL}/${f}`, 'utf8'));
        fs.copyFileSync(`${REAL}/${f}`, `${CAL}/${f}`);
        fs.writeFileSync(`${CAL}/verdicts.blind-${f.match(/\d+/)[0]}.json`, JSON.stringify(Object.fromEntries(Object.entries(key).map(([k, { arm }]) => [k, V(c.by(arm))])), null, 1));
    }
    const out = execFileSync(process.execPath, [`${SP}/flash-h40a-score-blind.mjs`], { env: { ...process.env, BLIND_DIR: CAL }, encoding: 'utf8' });
    const bad = c.expect.filter((e) => (typeof e === 'function' ? !e(out) : !e.test(out)));
    console.log(`case ${name}: ${bad.length ? `FAIL (${bad.length} of ${c.expect.length} checks)` : 'ok'}`);
    if (bad.length) { failed++; console.log(out); }
}
fs.rmSync(CAL, { recursive: true, force: true });
console.log(failed ? `CALIBRATION FAILED (${failed} case(s))` : 'CALIBRATION OK');
process.exit(failed ? 1 : 0);
