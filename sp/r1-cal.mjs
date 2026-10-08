// R1 calibration: check 11 must fail on an absent export and on an extra id, and pass on an
// exact match. Runs entirely inside one node process (no compound shell chains) against the
// guard-h40c-cal stub repo, committing each state so check 10b's tree-cleanliness check does not
// interfere, then restoring to the clean baseline at the end.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const STUB = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\guard-h40c-cal';
const FLIGHT_MJS = path.join(STUB, 'electron', 'test', 'golden', 'interview60.flight.mjs');
const git = (...args) => execFileSync('git', ['-C', STUB, ...args], { encoding: 'utf8' }).trim();

const baseline = fs.readFileSync(FLIGHT_MJS, 'utf8');
const baselineHead = git('rev-parse', 'HEAD');

function runGuard(commit) {
    const env = {
        ...process.env,
        NATIVELY_STT_PROVIDER: 'deepgram',
        NATIVELY_ROSTER: 'holdout40',
        NATIVELY_SCENARIOS: '',
        NATIVELY_GEMINI_THINKING_LEVEL: '',
        NATIVELY_VERBAL_PRIMARY_MODEL: '',
        NATIVELY_VERBAL_HEDGE: '1',
        NATIVELY_VERBAL_HEDGE_TRIGGER_MS: '',
        NATIVELY_FOLLOWUP_PARENT: '',
        NATIVELY_QUESTION_DETECTION_MODEL: '',
        NATIVELY_FLIGHT_COMMIT: commit,
    };
    const r = spawnSync('node', [path.join(STUB, 'guard-h40c.mjs')], { cwd: STUB, env, encoding: 'utf8' });
    return { status: r.status, stdout: r.stdout.trim(), stderr: r.stderr.trim() };
}

function commitState(label, mutate) {
    mutate();
    git('add', '-A');
    git('commit', '-m', label, '--allow-empty');
    return git('rev-parse', 'HEAD');
}

const results = [];

// Case 1: exact match (baseline, already true at the starting HEAD).
{
    const r = runGuard(baselineHead);
    results.push(['exact match -> expect GUARD OK (exit 0)', r]);
}

// Case 2: absent export (comment the export out, replace all its uses with an inline array so the
// rest of the stub file still parses and runs - the guard only imports ANSWER_MODELS, it never
// calls main()).
{
    const mutated = baseline.replace(
        "export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];",
        "// R1 cal: export removed entirely\nconst ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];",
    );
    if (mutated === baseline) throw new Error('absent-export mutation did not match anything - baseline text changed?');
    const sha = commitState('R1 cal: remove ANSWER_MODELS export', () => fs.writeFileSync(FLIGHT_MJS, mutated));
    const r = runGuard(sha);
    results.push(['absent export -> expect GUARD FAILED (exit 1)', r]);
}

// Case 3: extra id (restore the export, then add a third id).
{
    const mutated = baseline.replace(
        "export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];",
        "export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];",
    );
    if (mutated === baseline) throw new Error('extra-id mutation did not match anything - baseline text changed?');
    const sha = commitState('R1 cal: add a third id to ANSWER_MODELS', () => fs.writeFileSync(FLIGHT_MJS, mutated));
    const r = runGuard(sha);
    results.push(['extra id -> expect GUARD FAILED (exit 1)', r]);
}

// Restore: back to the original file content, committed, HEAD pinned to a fresh commit of the
// original content (not a reset --hard, to avoid rewriting the branch other calibrations may
// still reference by SHA).
{
    const sha = commitState('R1 cal: restore ANSWER_MODELS to the two Gemini lites', () => fs.writeFileSync(FLIGHT_MJS, baseline));
    const r = runGuard(sha);
    results.push(['restored exact match -> expect GUARD OK (exit 0)', r]);
}

for (const [label, r] of results) {
    console.log(`\n=== ${label} ===`);
    console.log(`exit ${r.status}`);
    const line11 = (r.status === 0 ? r.stdout : r.stderr).split('\n').find((l) => l.includes('ANSWER_MODELS') || l.includes('GUARD')) ?? '(no matching line)';
    console.log(line11);
}

const finalHead = git('rev-parse', 'HEAD');
const finalStatus = git('status', '--porcelain');
console.log(`\nfinal HEAD: ${finalHead}`);
console.log(`final status: ${finalStatus ? finalStatus : '(clean)'}`);
