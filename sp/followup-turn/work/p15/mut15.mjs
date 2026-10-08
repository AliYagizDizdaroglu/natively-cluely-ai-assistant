// Throwaway: mutate R/audit-graders.mjs / R/launch-grader.mjs one rule at a time, run the calibration section(s), restore. Each mutant must make the calibration FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const FT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn';
const A = `${FT}/R/audit-graders.mjs`, L = `${FT}/R/launch-grader.mjs`;
const muts = [
    ['denial: is_error permission text not counted', A, "if (j.toolDenialKind != null || /permission|denied/i.test(msg)) denials++;", "if (false) denials++;", 'F'],
    ['denial: toolDenialKind ignored', A, "j.toolDenialKind != null || /permission|denied/i.test(msg)", "/permission|denied/i.test(msg)", 'F'],
    ['denial: message regex ignored', A, "j.toolDenialKind != null || /permission|denied/i.test(msg)", "j.toolDenialKind != null", 'F'],
    ['denial: any is_error counts', A, "j.toolDenialKind != null || /permission|denied/i.test(msg)", "true", 'F'],
    ['denial: permission_denials list ignored', A, "if (Array.isArray(j?.permission_denials) && j.permission_denials.length) denials +=", "if (false) denials +=", 'F'],
    ['denial: flag never pushed', A, "if (denials) flags.push(", "if (false) flags.push(", 'F'],
    ['bash: default mode lets Bash through', A, "} else if (c.name === 'Bash') flags.push(", "} else if (c.name === 'Bash') void (", 'F'],
    ['read: own verdicts not allowed', A, ", norm(files.verdicts, blindDir)]);\n    const writeOk", "]);\n    const writeOk", 'F'],
    ['read: any file allowed', A, "if (!fp || !readOk.has(norm(fp, blindDir))) flags.push(", "if (false) flags.push(", 'F'],
    ['write/edit: any file allowed', A, "if (!fp || !writeOk.has(norm(fp, blindDir))) flags.push(", "if (false) flags.push(", 'F'],
    ['edit: not recognised as Write', A, "c.name === 'Write' || c.name === 'Edit'", "c.name === 'Write'", 'F'],
    ['launcher: Bash back in --tools', L, "'--tools', 'Read,Write,Edit',", "'--tools', 'Read,Write,Edit,Bash',", 'D'],
    ['launcher: --add-dir back (grader)', L, "return { args: [...FLAGS(prompt), '--allowed-tools', ...rules], rules };\n}\n/** The probe", "return { args: [...FLAGS(prompt), '--add-dir', blindDir, '--allowed-tools', ...rules], rules };\n}\n/** The probe", 'D'],
    ['launcher: --add-dir back (probe)', L, "const rules = [absRule('Read', inFile), absRule('Edit', outFile)];\n    return { args: [...FLAGS(prompt), '--allowed-tools'", "const rules = [absRule('Read', inFile), absRule('Edit', outFile)];\n    return { args: [...FLAGS(prompt), '--add-dir', GRADING, '--allowed-tools'", 'D'],
    ['launcher: a Bash allow rule back', L, "absRule('Edit', path.join(blindDir, f.verdicts))];", "absRule('Edit', path.join(blindDir, f.verdicts)), 'Bash(node -e *)'];", 'D'],
];
let bad = 0;
for (const [name, file, a, b, sec] of muts) {
    const orig = fs.readFileSync(file, 'utf8');
    if (!orig.includes(a)) { console.log(`MUTANT NOT APPLICABLE (text not found): ${name}`); bad++; continue; }
    fs.writeFileSync(file, orig.replace(a, () => b));
    let r;
    try { r = spawnSync(process.execPath, [`${FT}/R/scripts/grader-session-calibrate.mjs`, '--only', sec], { encoding: 'utf8' }); }
    finally { fs.writeFileSync(file, orig); }
    const caught = r.status !== 0;
    const nbad = (r.stdout.match(/^BAD /gm) ?? []).length;
    console.log(`${caught ? 'caught ' : 'SURVIVED'} (${nbad} BAD): ${name}`);
    if (!caught) bad++;
}
console.log(bad ? `${bad} MUTANT PROBLEM(S)` : `ALL ${muts.length} POINT-15 MUTANTS CAUGHT`);
