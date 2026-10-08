// Shared, PURE git-status predicate for guard-h40c.mjs's check 10b (fix round 1, review finding
// I8: the guard must pin the tree the flight's own rebuild will compile — `auto` runs
// `npm run build:electron` AFTER the guard, and MAIN is shared with peer sessions, so a peer
// edit between registration and the hour would fly under the registered commit's name without
// moving HEAD). Same shape as guard-r09.mjs: the predicate is separated from the guard's own
// process.exit() so it can be calibrated directly, on a captured status string, without needing
// a dirty git tree or a live git call (I8's own calibration note: "a temporary edit to an
// untracked scratch file won't show — instead calibrate the predicate on a captured status
// string").
//
// The known-dirty whitelist below is wider than I8's own text (which names only the two golden
// files interview60.chains.json/report.md): a real `git status --porcelain -- electron src
// premium package.json` run against MAIN also shows four more untracked scratch files under
// electron/test/golden/ that the h40c plan's own global constraints already document as "the
// user's known uncommitted files" (openrouter-probes/, openrouter.probe.mjs, zai-probes/,
// zai.probe.mjs — never staged, per the plan). Whitelisting only the two golden files would make
// this check fail on the tree's current, expected state; the plan's own list is the authority for
// what counts as "known", not this review comment's narrower example.
export const KNOWN_DIRTY = new Set([
    'electron/test/golden/interview60.chains.json',
    'electron/test/golden/interview60.report.md',
    'electron/test/golden/openrouter-probes/',
    'electron/test/golden/openrouter.probe.mjs',
    'electron/test/golden/zai-probes/',
    'electron/test/golden/zai.probe.mjs',
]);

/**
 * Porcelain v1 status lines (as `git status --porcelain -- <paths>` prints them, one per line,
 * "XY path" or "XY path -> path" for a rename) that are not in `knownDirty`. Pure: takes the
 * captured text, returns the surviving path strings, does no I/O and calls no git.
 */
export function unexpectedDirtyPaths(statusOutput, knownDirty = KNOWN_DIRTY) {
    return statusOutput
        .split('\n')
        .map((l) => l.replace(/\r$/, ''))
        .filter((l) => l.length > 0)
        .map((line) => line.slice(3).trim().replace(/\\/g, '/').split(' -> ').pop())
        .filter((p) => !knownDirty.has(p));
}
