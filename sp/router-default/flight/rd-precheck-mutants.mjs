// LAB\flight\rd-precheck-mutants.mjs: rule 8 for rd-precheck.ps1 (plan Task 18 step 4). rd-precheck-cal.mjs proves each gate reads right on the real script; this proves
// the cases can FAIL: a copy of the script with ONE gate rule switched off (sitting beside the original, as the script resolves its own folder) is run over the cases
// that must notice it (RD_CAL_SCRIPT + RD_CAL_ONLY), and each of those cases must read BAD. The dummy tasks Natively-flight-rdcal* are the only tasks touched.
//   node rd-precheck-mutants.mjs        writes rd-precheck-mutants.txt beside it. Run it AFTER rd-precheck-cal.mjs (they share the dummy task names: never concurrently).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, 'rd-precheck.ps1');
const OUT = path.join(HERE, 'rd-precheck-mutants.txt');
const src = fs.readFileSync(SCRIPT, 'utf8');
const MUTANTS = [
    ['stamp-bound-moved (At - 4 -> At - 3 min)', "$stampDt -gt $atDt.AddMinutes(-4)", "$stampDt -gt $atDt.AddMinutes(-3)", ['A4']],
    ['stamp-bound-exclusive (-gt -> -ge)', "$stampDt -gt $atDt.AddMinutes(-4)", "$stampDt -ge $atDt.AddMinutes(-4)", ['A5']],
    ['record-T-vs-NextRunTime-not-compared', "} elseif (-not $nextRun -or (Minute-Text $nextRun) -ne $tLines[0].Substring(3)) {", "} elseif ($false) {", ['A7']],
    ['T-line-count-not-checked', "if ($tLines.Count -ne 1) {", "if ($false) {", ['A6']],
    ['night-gates-line-not-required', "[regex]::IsMatch($newText, '(?m)^NIGHT GATES OK\\s*$')", '$true', ['D1']],
    ['dry-twin-result-ignored', '($dryResult -eq 0) -and $guardLine', '$true -and $guardLine', ['D2']],
    ['disable-not-done', '$null = Disable-ScheduledTask -TaskName $flightName', '$null = 0', ['P3']],
    ['other-tasks-not-gated', "Gate 'other-tasks' ($others.Count -eq 0)", "Gate 'other-tasks' $true", ['T2']],
    ['port-not-gated', "Gate 'port' (-not $portHeld)", "Gate 'port' $true", ['T3']],
    ['error-log-not-gated', "Gate 'error-log' (-not $errLogHere)", "Gate 'error-log' $true", ['T4']],
    ['tail-not-gated', "Gate 'tail' ($tails.Count -eq 0)", "Gate 'tail' $true", ['T5']],
    ['electron-not-gated', "Gate 'electron' ($electrons.Count -eq 0)", "Gate 'electron' $true", ['T6']],
];
const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
log('rd-precheck-mutants.mjs: a copy of rd-precheck.ps1 with one gate rule off, run over the cases that must notice it');
log(`script ${SCRIPT}`);
log('');
let caught = 0;
const bad = [];
for (const [name, find, repl, ids] of MUTANTS) {
    if (!src.includes(find)) throw new Error(`calibration bug: mutant "${name}": text not found in the script: ${find}`);
    const mf = path.join(HERE, 'rd-precheck.mut.ps1');
    fs.writeFileSync(mf, src.replace(find, () => repl), 'utf8');
    const r = spawnSync(process.execPath, [path.join(HERE, 'rd-precheck-cal.mjs')], { encoding: 'utf8', timeout: 900000, env: { ...process.env, RD_CAL_SCRIPT: 'rd-precheck.mut.ps1', RD_CAL_ONLY: ids.join(',') } });
    fs.rmSync(mf, { force: true });
    const verdicts = Object.fromEntries([...(r.stdout ?? '').matchAll(/^(ok  |BAD ) (\S+)\s/gm)].map((m) => [m[2], m[1].trim()]));
    const missed = ids.filter((id) => verdicts[id] !== 'BAD');
    const ok = missed.length === 0;
    if (ok) caught++; else bad.push(name);
    log(`${ok ? 'ok  ' : 'BAD '} ${name}`);
    log(`      cases ${ids.join(', ')}: ${ids.map((id) => `${id}=${verdicts[id] ?? '(not run)'}`).join(', ')} (each must read BAD on the mutant)${missed.length ? `; NOT NOTICED: ${missed.join(', ')}` : ''}`);
}
log('');
log(bad.length ? `PRECHECK MUTANTS: FAILED (${bad.join(', ')})` : `PRECHECK MUTANTS OK ${caught}/${MUTANTS.length} caught`);
fs.writeFileSync(OUT, `${out.join('\n')}\n`);
process.exit(bad.length ? 1 : 0);
