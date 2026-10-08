// Throwaway: calibrates flash-h40b-score-blind.mjs on SYNTHETIC verdicts with KNOWN answers, ALWAYS
// against the COMPLETE fixture (SP/flash-h40b-fixture/) — hardcoded below, no env override — never real
// flight data. This proves the SCORER's logic is correct; it says nothing about whether real data is
// complete, and it is not meant to: a real gap (an unanswered rep, an uncaptured id, a lite-arm error) is
// expected on flight day and must not block reading the real verdicts. flash-h40b-score-blind.mjs is the
// real-data scorer: it never fails on a hole (including a tier with zero captured ids — N1, fix round
// 2), and prints its own "answered A of N (ids × reps)" per tier/model/lite-arm so a partial hole is
// visible instead — checked below on the complete fixture too (M2, fix round 2): every arm must show
// A === N there, so a scorer whose answered count is always 0 fails calibration. Flight-day order: run
// THIS calibration first (it must print CALIBRATION OK, proving the scorer works) as a proof step,
// THEN score the real data with flash-h40b-score-blind.mjs.
// Copies the fixture's key files into a scratch blind dir, writes verdicts by arm, runs the scorer
// against that dir, and checks the totals it prints. Three cases:
//   A  everything acceptable            -> tier1 6/6, tier2 9/9, tier3 11/11, tier3b 11/11; lite 48/48 each
//   B  Flash wrong, lite acceptable     -> Flash 0/6, 0/9, 0/11, 0/11; lite 48/48; 37 "wrong" reasons
//   C  Flash weak, 3.1 wrong, 3.5 fine  -> Flash 0/...; 3.1 LOW 0/48, 3.5 HIGH 48/48; 37 "weak" reasons
// (37 = 2*3 + 3*3 + 11*1 + 11*1, the total Flash answer count across all four tiers.)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
// Hardcoded to the fixture (not an env-overridable FLASH_DIR/BLIND_DIR): this script's whole job is to
// prove the scorer against a KNOWN-complete dataset, so it must never be pointed at real, possibly-holed
// data by a stray env var. It still points the CHILD score-blind.mjs process at the fixture explicitly.
const FIX_RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/sdd/2026-09-25-flight-h40b/rr-task4-fix2/fx/full/run', FIX_FLASH = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/sdd/2026-09-25-flight-h40b/rr-task4-fix2/fx/full/flash';
const REAL = `${FIX_FLASH}/blind`, CAL = `${FIX_FLASH}/blind-cal`;
console.log(`calibrating the scorer against the fixture only: run=${FIX_RUN}  flash=${FIX_FLASH}  blind=${REAL}  (real flight data is never read by this script)`);
if (!fs.existsSync(REAL)) { console.log(`no fixture blind dir at ${REAL} — build the fixture (flash-h40b-fixture-build.mjs) and run flash-h40b-blind-pairs.mjs against it (RUN_DIR=${FIX_RUN} FLASH_DIR=${FIX_FLASH}) first`); process.exit(2); }
const keys = fs.readdirSync(REAL).filter((x) => /^key\.blind-\d+\.json$/.test(x));
if (!keys.length) { console.log('no key files yet — build the pairs first'); process.exit(2); }
const V = (c) => ({ correctness: c, on_topic: 2, delivery: 2, reason: c === 2 ? 'fine' : c === 1 ? 'synthetic weak' : 'synthetic wrong' });
const cases = {
    A: { by: () => 2, expect: [
        /gemini-3\.8-flash on tier 1: 6\/6 acceptable/, /gemini-3\.7-flash on tier 2: 9\/9 acceptable/, /gemini-3\.6-flash on tier 3: 11\/11 acceptable/, /gemini-3\.5-flash on tier 3b: 11\/11 acceptable/, /3\.1 LOW 48\/48, 3\.5 HIGH 48\/48/,
        // M2 (fix round 2): the "answered" lines too, on the complete fixture every arm is fully
        // answered (A === N) — a scorer whose answeredCount is always 0 must fail these.
        /gemini-3\.8-flash on tier 1: answered 6 of 6 \(ids × reps\)/, /gemini-3\.7-flash on tier 2: answered 9 of 9 \(ids × reps\)/, /gemini-3\.6-flash on tier 3: answered 11 of 11 \(ids × reps\)/, /gemini-3\.5-flash on tier 3b: answered 11 of 11 \(ids × reps\)/, /lite answered: 3\.1 LOW 48 of 48 \(ids × reps\), 3\.5 HIGH 48 of 48 \(ids × reps\)/,
    ] },
    B: { by: (arm) => (/flash default/.test(arm) ? 0 : 2), expect: [/gemini-3\.8-flash on tier 1: 0\/6 acceptable/, /gemini-3\.7-flash on tier 2: 0\/9 acceptable/, /gemini-3\.6-flash on tier 3: 0\/11 acceptable/, /gemini-3\.5-flash on tier 3b: 0\/11 acceptable/, /3\.1 LOW 48\/48, 3\.5 HIGH 48\/48/, (o) => (o.match(/ wrong: synthetic wrong/g) ?? []).length === 37] },
    C: { by: (arm) => (/flash default/.test(arm) ? 1 : arm === '3.1-lite LOW' ? 0 : 2), expect: [/gemini-3\.6-flash on tier 3: 0\/11 acceptable/, /gemini-3\.5-flash on tier 3b: 0\/11 acceptable/, /3\.1 LOW 0\/48, 3\.5 HIGH 48\/48/, (o) => (o.match(/ weak: synthetic weak/g) ?? []).length === 37] },
};
let failed = 0;
for (const [name, c] of Object.entries(cases)) {
    fs.rmSync(CAL, { recursive: true, force: true }); fs.mkdirSync(CAL, { recursive: true });
    for (const f of keys) {
        const key = JSON.parse(fs.readFileSync(`${REAL}/${f}`, 'utf8'));
        fs.copyFileSync(`${REAL}/${f}`, `${CAL}/${f}`);
        fs.writeFileSync(`${CAL}/verdicts.blind-${f.match(/\d+/)[0]}.json`, JSON.stringify(Object.fromEntries(Object.entries(key).map(([k, { arm }]) => [k, V(c.by(arm))])), null, 1));
    }
    // RUN_DIR/FLASH_DIR are pinned to the fixture explicitly (not inherited from this process's own
    // env), so a stray override in the caller's shell can never redirect calibration onto real data.
    const out = execFileSync(process.execPath, ['C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/sdd/2026-09-25-flight-h40b/rr-task4-fix2/sc/sb.ansfull.mjs'], { env: { ...process.env, RUN_DIR: FIX_RUN, FLASH_DIR: FIX_FLASH, BLIND_DIR: CAL }, encoding: 'utf8' });
    const bad = c.expect.filter((e) => (typeof e === 'function' ? !e(out) : !e.test(out)));
    console.log(`case ${name}: ${bad.length ? `FAIL (${bad.length} of ${c.expect.length} checks)` : 'ok'}`);
    if (bad.length) { failed++; console.log(out); }
}
fs.rmSync(CAL, { recursive: true, force: true });
console.log(failed ? `CALIBRATION FAILED (${failed} case(s), fixture: ${FIX_FLASH})` : `CALIBRATION OK (fixture: ${FIX_FLASH})`);
process.exit(failed ? 1 : 0);
