// One-off: resolve the interleaved add/add conflict at the end of interview60.metrics.test.ts.
// Both sides appended a distinct describe() at the same spot; git interleaved them around their
// shared lines. The resolution keeps BOTH describes whole, each byte-for-byte as its own side has it:
//   cue block  = HEAD's lines 790..838   ("the cue row's limits track CUE_MAX_LINES and CUE_MAX_WORDS")
//   main block = MAIN's lines 764..860   ("claimOf: a paraphrase-anchored answer ... (h40b R07F)")
// The merged working file's conflict region is lines 790..933 (1-based, inclusive).
// usage (cwd = the worktree root): node <this> [--check]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILE = 'electron/test/golden/interview60.metrics.test.ts';
const MAIN = 'fix/coding-style-suffix-all-gemini';
const show = (rev) => execFileSync('git', ['show', `${rev}:${FILE}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const linesOf = (text) => text.split('\n');
const slice1 = (lines, from, to) => lines.slice(from - 1, to); // 1-based, inclusive

const cueLines = linesOf(show('HEAD'));
const mainLines = linesOf(show(MAIN));
const work = fs.readFileSync(FILE, 'utf8');
if (work.includes('\r')) throw new Error('working file has CR bytes; refusing');
const workLines = linesOf(work);

const cueBlock = slice1(cueLines, 790, 838);
const mainBlock = slice1(mainLines, 764, 860);

const expect = (cond, what) => { if (!cond) throw new Error(`boundary check failed: ${what}`); };
expect(cueBlock[0] === '/**', 'cue block starts with /**');
expect(cueBlock[cueBlock.length - 1] === '});', 'cue block ends with });');
expect(cueBlock.some((l) => l.startsWith('describe("the cue row\'s limits track CUE_MAX_LINES and CUE_MAX_WORDS"')), 'cue block holds its describe');
expect(mainBlock[0] === '/**', 'main block starts with /**');
expect(mainBlock[mainBlock.length - 1] === '});', 'main block ends with });');
expect(mainBlock.some((l) => l.startsWith("describe('claimOf: a paraphrase-anchored answer")), 'main block holds its describe');
expect(cueLines[838 - 1 + 1] === '' && cueLines[838 + 1].startsWith("describe('computeRun on a run dir missing"), 'cue: blank then the shared computeRun describe follows the block');
expect(mainLines[860] === '' && mainLines[861].startsWith("describe('computeRun on a run dir missing"), 'main: blank then the shared computeRun describe follows the block');

// The working file's region to replace.
expect(workLines[790 - 1] === '/**', 'work line 790 is /**');
expect(workLines[791 - 1] === '<<<<<<< HEAD', 'work line 791 is the first marker');
expect(workLines[933 - 1] === '});', 'work line 933 is });');
expect(workLines[934 - 1] === '', 'work line 934 is blank');
expect(workLines[935 - 1].startsWith("describe('computeRun on a run dir missing"), 'work line 935 is the shared computeRun describe');
expect(workLines.slice(0, 789).every((l) => !/^(<<<<<<<|=======|>>>>>>>)/.test(l)), 'no marker before the region');
expect(workLines.slice(933).every((l) => !/^(<<<<<<<|=======|>>>>>>>)/.test(l)), 'no marker after the region');

const out = [...workLines.slice(0, 789), ...cueBlock, '', ...mainBlock, ...workLines.slice(933)];
if (process.argv.includes('--check')) {
    console.log(`would write ${out.length} lines (was ${workLines.length}); cue block ${cueBlock.length} lines, main block ${mainBlock.length} lines`);
} else {
    fs.writeFileSync(FILE, out.join('\n'), 'utf8');
    console.log(`wrote ${FILE}: ${out.length} lines (was ${workLines.length}); cue block ${cueBlock.length} lines, main block ${mainBlock.length} lines`);
}
