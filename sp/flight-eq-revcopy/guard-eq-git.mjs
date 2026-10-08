// Shared, PURE git-status predicate for guard-eq.mjs's check (10b): VH\guard-h40d-git.mjs copied for the flight-eq hour
// (PREREGISTER-flight-eq.md section 2; A2.10 P6). The logic and the allowlist are h40d's, unchanged; only this header
// differs. The predicate is separated from the guard's own process.exit() so it can be calibrated directly on captured
// status strings (guard-eq-git-cal.mjs), without a dirty tree or a live git call.
//
// The allowlist is r4's three tracked paths, plus h40c's four untracked scratch paths:
//   - interview60.chains.json, interview60.report.md: the harness rewrites them on every chains run / report;
//   - natively_debug.log.1: the app's rotated debug log, tracked in this repo (a ROOT file, so GIT_PATHSPEC names it);
//   - openrouter-probes/, openrouter.probe.mjs, zai-probes/, zai.probe.mjs: the user's known uncommitted scratch
//     under electron/test/golden/ (MAIN carries them today, 2026-10-05).
// Anything else the status shows inside GIT_PATHSPEC is "unexpected" and makes the guard refuse.
//
// GIT_PATHSPEC is h40c's scope (what the app and the harness are built and run from) plus `scripts`, plus the one
// root file r4 allowlists. `scripts` because scripts/build-electron.js decides what the flight's own rebuild compiles.
// Everything else outside this scope (root docs, other configs, stray untracked root files such as resume_prompt.txt)
// never trips the guard on purpose: a spurious refusal at T loses the whole flight (StartWhenAvailable is OFF) and a
// docs edit cannot change the app.
export const GIT_PATHSPEC = ['electron', 'src', 'premium', 'scripts', 'package.json', 'natively_debug.log.1'];

export const KNOWN_DIRTY = new Set([
    'electron/test/golden/interview60.chains.json',
    'electron/test/golden/interview60.report.md',
    'natively_debug.log.1',
    'electron/test/golden/openrouter-probes/',
    'electron/test/golden/openrouter.probe.mjs',
    'electron/test/golden/zai-probes/',
    'electron/test/golden/zai.probe.mjs',
]);

// Porcelain v1 status lines ("XY path", or "XY old -> new" for a rename) as the paths they name. The captured text is
// NOT trimmed as a whole first: a leading status space on the first line (" M x") must survive, or slice(3) shifts
// by one (guard-br1.mjs hit exactly that on 2026-09-30).
const pathsOf = (statusOutput) => statusOutput
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length > 0)
    .map((line) => line.slice(3).trim().replace(/\\/g, '/').split(' -> ').pop());

/** The status paths that are not in `knownDirty`. Pure: takes the captured text, does no I/O and calls no git. */
export function unexpectedDirtyPaths(statusOutput, knownDirty = KNOWN_DIRTY) {
    return pathsOf(statusOutput).filter((p) => !knownDirty.has(p));
}

/** The status paths that ARE in `knownDirty` (what the dry twin quotes as "the allowlisted paths present"). */
export function allowlistedPaths(statusOutput, knownDirty = KNOWN_DIRTY) {
    return pathsOf(statusOutput).filter((p) => knownDirty.has(p));
}
