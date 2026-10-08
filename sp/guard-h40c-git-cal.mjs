// Calibration for guard-h40c-git.mjs's unexpectedDirtyPaths() (I8). Captured status strings,
// no git call, no dirty tree needed.
import { unexpectedDirtyPaths, KNOWN_DIRTY } from './guard-h40c-git.mjs';

let failures = 0;
function check(name, got, want) {
    const gotStr = JSON.stringify(got);
    const wantStr = JSON.stringify(want);
    const ok = gotStr === wantStr;
    if (!ok) failures++;
    console.log(`${ok ? 'ok' : 'FAIL'}   ${name} :: got ${gotStr} want ${wantStr}`);
}

// Case 1: the ACTUAL captured output of `git -C MAIN status --porcelain -- electron src premium
// package.json` (read via PowerShell, 2026-09-26, HEAD da28f25) — the real known-dirty case.
const REAL_CAPTURE = ` M electron/test/golden/interview60.chains.json\n M electron/test/golden/interview60.report.md\n?? electron/test/golden/openrouter-probes/\n?? electron/test/golden/openrouter.probe.mjs\n?? electron/test/golden/zai-probes/\n?? electron/test/golden/zai.probe.mjs\n`;
check('the real captured status (2026-09-26) is fully whitelisted', unexpectedDirtyPaths(REAL_CAPTURE), []);

// Case 2: empty status (nothing dirty at all).
check('empty status', unexpectedDirtyPaths(''), []);

// Case 3 (negative — proves the check can fail, rule 8): a peer's edit to a real source file,
// alongside the known-dirty ones. This is the failure scenario I8 names.
const PEER_EDIT = REAL_CAPTURE + ' M electron/llm/verbalHedge.ts\n';
check('a peer edit to a tracked source file is NOT whitelisted', unexpectedDirtyPaths(PEER_EDIT), ['electron/llm/verbalHedge.ts']);

// Case 4 (negative): an untracked file that is not on the known list at all.
check('an untracked file outside the known list is NOT whitelisted', unexpectedDirtyPaths('?? electron/llm/newFile.ts\n'), ['electron/llm/newFile.ts']);

// Case 5: a rename (porcelain "R  old -> new") is read by its NEW path.
check('a rename is read by its destination path', unexpectedDirtyPaths('R  electron/test/golden/interview60.report.md -> electron/test/golden/interview60.report.md\n'), []);

// Case 6: CRLF line endings (a Windows git client) do not confuse the parser.
check('CRLF line endings are stripped', unexpectedDirtyPaths(REAL_CAPTURE.replace(/\n/g, '\r\n')), []);

console.log(failures === 0 ? `CALIBRATION OK ${6 - failures}/6` : `CALIBRATION FAILED ${failures}/6`);
process.exit(failures === 0 ? 0 : 1);
