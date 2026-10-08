// freeze.mjs: the frozen-hash mechanism (SPEC 4.5). After calibration passes, the rubric's sha256 and the spec file's sha256 go into LAB\rubric.sha and LAB\spec.sha BEFORE the first real export.
// From then on the exporter, the launcher and the scorer refuse a real tag whose hashes are missing, and ANY tag whose hash file does not match the file (lib.mjs hashProblem).
//   node freeze.mjs --status                       prints the hash state (nothing written)
//   node freeze.mjs --confirm-thresholds-by-user   writes thresholds.confirmed, rubric.sha, spec.sha. Refused unless (a) the user's own confirmation flag is given (the SPEC 6 thresholds are AWAITING THE USER),
//                                                  (b) the calibration PASSES on disk (cal; or rev when the revision was flown), (c) no real launch has happened yet, (d) no hash file exists already.
// The flag is the user's: the kit never passes it on its own. No model call.
import fs from 'node:fs';
import path from 'node:path';
import { LAB, dirsOf, fileSha, readJsonl, loadThresholds, specThresholds, THRESHOLD_KEYS } from './lib.mjs';
import { scoreCalibration, filesFromTags } from './score-cue.mjs';

export function freezeProblem({ lab = LAB, confirmed = false } = {}) {
    const d = dirsOf(lab);
    if (!confirmed) return 'the SPEC 6 thresholds are AWAITING THE USER: freezing needs --confirm-thresholds-by-user, given by the user (the spec hash covers them)';
    for (const f of [d.rubricSha, d.specSha, d.thresholdsSha]) if (fs.existsSync(f)) return `${path.basename(f)} already exists: a frozen hash is never rewritten (a new spec means a full re-grade)`;
    for (const f of [d.rubric, d.spec, d.thresholds]) if (!fs.existsSync(f)) return `${path.basename(f)} is missing`;
    // the thresholds live in ONE file; the spec states the same numbers, and says AWAITING until the user confirms (REVIEW-KIT K2)
    const specText = fs.readFileSync(d.spec, 'utf8');
    if (/AWAITING THE USER/.test(specText)) return 'the spec still says the thresholds are AWAITING THE USER: the user confirms them by editing the spec (and thresholds.json if they change a number) BEFORE spec.sha is taken';
    let T, ST; try { T = loadThresholds(lab); } catch (e) { return e.message; }
    ST = specThresholds(specText);
    if (!ST) return 'the spec has no "THRESHOLDS: ..." line (section 6)';
    for (const k of THRESHOLD_KEYS) if (ST[k] !== T[k]) return `the spec's THRESHOLDS line (${k}=${ST[k]}) disagrees with thresholds.json (${k}=${T[k]})`;
    if (readJsonl(d.launches).some((r) => /^(r1|h40d)-/.test(r.slot))) return 'a real grader has already been launched: the freeze comes first';
    const revFlown = fs.existsSync(d.verdicts) && fs.readdirSync(d.verdicts).length > 0 && (() => { try { filesFromTags('rev', 4, lab); return true; } catch { return false; } })();
    let r;
    try { r = revFlown ? scoreCalibration(filesFromTags('rev', 4, lab), 'rev') : scoreCalibration(filesFromTags('cal', 3, lab), 'cal'); } catch (e) { return `the calibration cannot be read (${e.message.slice(0, 120)})`; }
    if (!r.pass) return `the ${revFlown ? 'revision' : 'calibration'} does not pass every bar: ${r.lines.filter((l) => l.startsWith('FAIL')).length} bar(s) failed`;
    return null;
}
export function freeze({ lab = LAB, confirmed = false } = {}) {
    const why = freezeProblem({ lab, confirmed }); if (why) throw new Error(why);
    const d = dirsOf(lab);
    fs.writeFileSync(path.join(lab, 'thresholds.confirmed'), `confirmed by the user ${new Date().toISOString()}\n`);
    fs.writeFileSync(d.rubricSha, `${fileSha(d.rubric)}\n`);
    fs.writeFileSync(d.specSha, `${fileSha(d.spec)}\n`);
    fs.writeFileSync(d.thresholdsSha, `${fileSha(d.thresholds)}\n`);
    return { rubric: fileSha(d.rubric), spec: fileSha(d.spec) };
}
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/freeze.mjs')) {
    const argv = process.argv.slice(2), d = dirsOf(LAB);
    if (argv.includes('--status')) {
        for (const [name, shaFile, file] of [['rubric', d.rubricSha, d.rubric], ['spec', d.specSha, d.spec], ['thresholds', d.thresholdsSha, d.thresholds]]) console.log(`${name}: file sha256 ${fs.existsSync(file) ? fileSha(file) : 'MISSING'}; frozen ${fs.existsSync(shaFile) ? fs.readFileSync(shaFile, 'utf8').trim() : 'NOT FROZEN'}${fs.existsSync(shaFile) && fs.existsSync(file) ? (fs.readFileSync(shaFile, 'utf8').trim() === fileSha(file) ? ' (match)' : ' (MISMATCH)') : ''}`);
        console.log(`thresholds confirmed by the user: ${fs.existsSync(path.join(LAB, 'thresholds.confirmed')) ? 'yes' : 'NO (awaiting the user)'}`);
    } else {
        try { const r = freeze({ confirmed: argv.includes('--confirm-thresholds-by-user') }); console.log(`FROZEN: rubric.sha ${r.rubric}\n        spec.sha   ${r.spec}\nPut both in the pass record before the first real export.`); }
        catch (e) { console.error(`freeze: REFUSED: ${e.message}`); process.exit(2); }
    }
}
