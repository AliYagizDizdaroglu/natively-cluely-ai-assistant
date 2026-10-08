// P2 review mutants, applied to the COPY only (p2rev), each run then restored byte-identical.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const F = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/eq-tmp/p2rev/electron/test/golden/interview60.flight.mjs';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/eq-tmp/p2rev-run.ps1';
const orig = fs.readFileSync(F, 'utf8');
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex').slice(0, 16);
const mutants = [
    ['M1 off branch removed', "    if (v === 'off') return null;\n", ''],
    ['M2 throw -> return null', '    throw new Error(`NATIVELY_FLIGHT_FOCUSED=', '    return null; throw new Error(`NATIVELY_FLIGHT_FOCUSED='],
    ['M3 unset -> null', "    if (v === undefined || v === '') return focusedOnlyFor(roster);", "    if (v === undefined || v === '') return null;"],
    ['M4 main ignores env (focusedOnlyFor)', 'try { focusedOnly = focusedFor(ROSTER_NAME, process.env); }', 'try { focusedOnly = focusedOnlyFor(ROSTER_NAME); }'],
    ['M5 arms ungated', '...(focusedOnly ? FOCUSED_MODELS.map(', '...(true ? FOCUSED_MODELS.map('],
    ['M6 bad value no exit 2', "catch (e) { log(`ABORT ${e.message}`); return 2; }", 'catch (e) { focusedOnly = null; }'],
    ['M7 off log line removed', "    if (process.env.NATIVELY_FLIGHT_FOCUSED === 'off') log(`FOCUSED  off by NATIVELY_FLIGHT_FOCUSED=off - skipping the ${FOCUSED_MODELS.length} focused arms`);\n    else ", '    '],
];
console.log('orig', sha(orig));
for (const [name, from, to] of mutants) {
    if (!orig.includes(from)) { console.log(name, 'PATTERN NOT FOUND'); continue; }
    fs.writeFileSync(F, orig.replace(from, to));
    let out;
    try { out = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', RUN, 'electron/test/golden/interview60.flight.focused.test.ts', 'electron/test/golden/interview60.flight.test.ts'], { encoding: 'utf8' }); }
    catch (e) { out = (e.stdout ?? '') + (e.stderr ?? ''); }
    const tests = out.split('\n').find((l) => /Tests\s/.test(l))?.trim() ?? out.slice(0, 300);
    console.log(`${name}: ${tests}`);
    fs.writeFileSync(F, orig);
}
console.log('restored', sha(fs.readFileSync(F, 'utf8')), sha(fs.readFileSync(F, 'utf8')) === sha(orig));
