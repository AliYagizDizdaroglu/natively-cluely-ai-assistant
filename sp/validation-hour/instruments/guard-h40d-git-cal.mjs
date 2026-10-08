// Calibration for guard-h40d-git.mjs's unexpectedDirtyPaths() / allowlistedPaths() (check 10b). Captured status strings,
// no git call, no dirty tree needed (guard-h40c-git-cal.mjs's pattern). Case 1 and 2 are the REAL captures of
// `git -C MAIN status --porcelain` read on 2026-10-01 at MAIN's HEAD 73d7f01: the whole tree, and the scope the guard
// actually asks for (GIT_PATHSPEC). Every negative case must come out as a path list, never an empty one (rule 8).
import { unexpectedDirtyPaths, allowlistedPaths, KNOWN_DIRTY, GIT_PATHSPEC } from '../guard-h40d-git.mjs';

let failures = 0;
let total = 0;
function check(name, got, want) {
    total++;
    const gotStr = JSON.stringify(got);
    const wantStr = JSON.stringify(want);
    const ok = gotStr === wantStr;
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'BAD '} ${name} :: got ${gotStr} want ${wantStr}`);
}

console.log(`GIT_PATHSPEC = ${JSON.stringify(GIT_PATHSPEC)}; KNOWN_DIRTY has ${KNOWN_DIRTY.size} paths`);

// The real captures (MAIN, 2026-10-01, HEAD 73d7f01).
const WHOLE_TREE = ' M electron/test/golden/interview60.chains.json\n M electron/test/golden/interview60.report.md\n M natively_debug.log.1\n?? electron/test/golden/openrouter-probes/\n?? electron/test/golden/openrouter.probe.mjs\n?? electron/test/golden/zai-probes/\n?? electron/test/golden/zai.probe.mjs\n?? resume_prompt.txt\n?? retry_claude_print.bat\n';
// What `git status --porcelain -- <GIT_PATHSPEC>` prints for the same tree: the whole capture minus the two stray root files.
const SCOPED = WHOLE_TREE.split('\n').filter((l) => !/resume_prompt|retry_claude_print/.test(l)).join('\n');
check('1. the real captured status in the guard\'s own scope (MAIN today) is fully allowlisted', unexpectedDirtyPaths(SCOPED), []);
check('2. ... and the guard would quote these seven allowlisted paths present (r4\'s three tracked paths and h40c\'s four untracked scratch paths), in git\'s own order', allowlistedPaths(SCOPED), [
    'electron/test/golden/interview60.chains.json', 'electron/test/golden/interview60.report.md', 'natively_debug.log.1',
    'electron/test/golden/openrouter-probes/', 'electron/test/golden/openrouter.probe.mjs', 'electron/test/golden/zai-probes/', 'electron/test/golden/zai.probe.mjs']);
// The whole tree is NOT what the guard asks for; fed to the predicate it shows what a strict whole-tree reading would trip on.
check('3. the whole-tree capture: the three r4 paths and the four scratch paths are allowlisted; two stray untracked ROOT files are not (outside the guard\'s scope, so they never reach it)',
    unexpectedDirtyPaths(WHOLE_TREE), ['resume_prompt.txt', 'retry_claude_print.bat']);
check('4. natively_debug.log.1 is allowlisted when it is shown', allowlistedPaths(' M natively_debug.log.1\n'), ['natively_debug.log.1']);

check('5. empty status', unexpectedDirtyPaths(''), []);
check('6. empty status: nothing allowlisted present', allowlistedPaths(''), []);

// Negative cases: the check can fail (rule 8).
check('7. a peer edit to a tracked source file alongside the known files is NOT allowlisted', unexpectedDirtyPaths(SCOPED + ' M electron/llm/verbalHedge.ts\n'), ['electron/llm/verbalHedge.ts']);
check('8. an untracked file outside the known list is NOT allowlisted', unexpectedDirtyPaths('?? electron/llm/newFile.ts\n'), ['electron/llm/newFile.ts']);
check('9. the build script (scripts/, in scope since h40d) modified is NOT allowlisted', unexpectedDirtyPaths(' M scripts/build-electron.js\n'), ['scripts/build-electron.js']);
check('10. package.json modified is NOT allowlisted', unexpectedDirtyPaths(' M package.json\n'), ['package.json']);
check('11. a staged new file is NOT allowlisted', unexpectedDirtyPaths('A  src/new.tsx\n'), ['src/new.tsx']);
check('12. a deleted tracked file is NOT allowlisted', unexpectedDirtyPaths(' D electron/LLMHelper.ts\n'), ['electron/LLMHelper.ts']);
check('13. a file next to an allowlisted one with a similar name is NOT allowlisted', unexpectedDirtyPaths(' M electron/test/golden/interview60.chains.json.bak\n'), ['electron/test/golden/interview60.chains.json.bak']);
check('14. an untracked file INSIDE an allowlisted untracked dir is reported by git as the dir (collapsed), which is allowlisted; a different dir is not',
    unexpectedDirtyPaths('?? electron/test/golden/zai-probes/\n?? electron/test/golden/other-probes/\n'), ['electron/test/golden/other-probes/']);

// Parser shape.
check('15. a rename is read by its destination path', unexpectedDirtyPaths('R  electron/test/golden/interview60.report.md -> electron/test/golden/interview60.report.md\n'), []);
check('16. a rename INTO a non-allowlisted path is reported', unexpectedDirtyPaths('R  electron/test/golden/interview60.report.md -> electron/llm/x.md\n'), ['electron/llm/x.md']);
check('17. CRLF line endings are stripped', unexpectedDirtyPaths(SCOPED.replace(/\n/g, '\r\n')), []);
check('18. the first line\'s leading status space survives (guard-br1\'s 2026-09-30 trim bug): a dirty FIRST line is still read from column 3', unexpectedDirtyPaths(' M electron/zz.ts\n M natively_debug.log.1\n'), ['electron/zz.ts']);
check('19. backslash paths are normalised', unexpectedDirtyPaths(' M electron\\test\\golden\\interview60.chains.json\n'), []);

console.log(failures === 0 ? `PREDICATE CALIBRATION OK ${total - failures}/${total}` : `PREDICATE CALIBRATION FAILED ${failures}/${total}`);
process.exit(failures === 0 ? 0 : 1);
