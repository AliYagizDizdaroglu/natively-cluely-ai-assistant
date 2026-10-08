// re-check r3 copy of ../run-calibrations.mjs: identical cases; outputs written HERE (recheck-r3-scratch), never into VH.
// Runs the calibrations of h40d-clocks.mjs, h40d-thoughts-noise.mjs, knowledge-mode-read.mjs and
// h40d-knowledge-lines.mjs (read-only node scripts) and writes their outputs to clocks.cal-r2.out.txt,
// thoughts-noise.out.txt and knowledge-mode.out.txt beside this file. No API call, no build, no test. Each case is
// one `node <script> <args>` child; the outputs are concatenated with a header line. Revision 3 (2026-10-01) added
// the 05:00 re-smoke to the clocks cases, the s50e four-holes case to the thinking-token cases (re-check N6) and the
// knowledge-mode section (re-check N1).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.dirname(HERE);
const SP = path.dirname(VH);
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const WTR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs';
const H40C = `${RUNS}/2026-09-29T11-42-00-h40c`;
const run = (script, args) => {
    try { return execFileSync(process.execPath, [path.join(VH, script), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { return `${e.stdout ?? ''}${e.stderr ?? ''}[exit ${e.status}]\n`; }
};
const grep = (text, re) => text.split('\n').filter((l) => re.test(l)).join('\n') + '\n';

// 1. the clocks script
const clocks = [];
const RESMOKE = `${WTR}/2026-10-01T02-37-41-cuesmoke`; // the 05:00 re-smoke: the combined build's first run (revision 3)
for (const r of [H40C, `${RUNS}/2026-09-30T11-45-30-br1`, `${WTR}/2026-09-30T13-46-52-cuesmoke`, `${WTR}/2026-09-30T02-38-22-cuesmoke`, RESMOKE, `${SP}/h40c-stats-cal-r2-failure`, `${SP}/h40c-stats-cal-r2-delivered`, `${SP}/h40c-stats-cal-r2-unresolved`]) {
    clocks.push(`=================== node h40d-clocks.mjs ${path.basename(r)}\n${run('h40d-clocks.mjs', [r])}`);
}
for (const r of [`${WTR}/2026-09-30T13-46-52-cuesmoke`, H40C, RESMOKE]) clocks.push(`=================== node h40d-clocks.mjs ${path.basename(r)} --whole-log\n${run('h40d-clocks.mjs', [r, '--whole-log'])}`);
clocks.push(`=================== node h40d-clocks.mjs h40c --list (first 6 rows)\n${grep(run('h40d-clocks.mjs', [H40C, '--list']), /^  #/).split('\n').slice(0, 6).join('\n')}\n`);
clocks.push(`=================== node h40d-clocks.mjs 16:12 cuesmoke --list (all rows)\n${grep(run('h40d-clocks.mjs', [`${WTR}/2026-09-30T13-46-52-cuesmoke`, '--list']), /^  #/)}`);
clocks.push(`=================== node h40d-clocks.mjs 05:00 re-smoke --list (first 4 rows: row 1 is the run's first window, G 2 ms, no Intent classified line)\n${grep(run('h40d-clocks.mjs', [RESMOKE, '--list']), /^  #/).split('\n').slice(0, 4).join('\n')}\n`);
fs.writeFileSync(path.join(HERE, 'clocks.cal-r2.out.txt'), clocks.join('\n'));

// 2. the thinking-token noise script
const noise = [];
for (const r of ['2026-09-20T11-22-43-s50k', '2026-09-21T08-22-34-s50l', '2026-09-22T08-22-50-s50m', '2026-09-24T08-20-12-h40a', '2026-09-26T11-39-51-h40b', '2026-09-29T11-42-00-h40c']) {
    noise.push(`=================== node h40d-thoughts-noise.mjs ${r}\n${run('h40d-thoughts-noise.mjs', [`${RUNS}/${r}`])}`);
}
const C = 'gemini-3.5-flash-lite_captured-high';
noise.push(`=================== CALIBRATION: h40c, cue = control (same files) -> difference 0, PASS\n${grep(run('h40d-thoughts-noise.mjs', [H40C, '--control', C]), /rule 2c/)}`);
noise.push(`=================== CALIBRATION: h40c, cue = control + 200 tokens -> FAIL\n${grep(run('h40d-thoughts-noise.mjs', [H40C, '--control', C, '--offset', '200']), /rule 2c/)}`);
noise.push(`=================== CALIBRATION: h40c, cue = control + 150 tokens -> PASS at the boundary\n${grep(run('h40d-thoughts-noise.mjs', [H40C, '--control', C, '--offset', '150']), /rule 2c reading/)}`);
noise.push(`=================== CALIBRATION: h40c, cue = control + 151 tokens -> FAIL\n${grep(run('h40d-thoughts-noise.mjs', [H40C, '--control', C, '--offset', '151']), /rule 2c reading/)}`);
noise.push(`=================== CALIBRATION: h40c, --exclude R10,R20 (ids dropped on both sides: answered counts fall by 2)\n${grep(run('h40d-thoughts-noise.mjs', [H40C, '--control', C, '--exclude', 'R10,R20']), /^run:|answered|rule 2c reading/)}`);
noise.push(`=================== CALIBRATION: h40c, the control family absent (no captured-no-cues-high on h40c) -> no 2c reading\n${grep(run('h40d-thoughts-noise.mjs', [H40C]), /no answers file|rule 2c/)}`);
noise.push(`=================== CALIBRATION: --control-dir (h40c's captured-high as cue against h40b's captured-high read from h40b's folder: different bytes, a nonzero difference is expected; exercises the option only)\n${grep(run('h40d-thoughts-noise.mjs', [H40C, '--control', C, '--control-dir', `${RUNS}/2026-09-26T11-39-51-h40b`]), /from |rule 2c: cue pooled median thoughts|rule 2c reading/)}`);
noise.push(`=================== CALIBRATION (re-check N6): s50e's single-rep gemini-3.7-flash arm as both sides, 4 holes of 5 -> INCOMPLETE (the revision-2 script read PASS (fallback))\n${grep(run('h40d-thoughts-noise.mjs', [`${RUNS}/2026-09-14T08-22-28-s50e`, '--cue', 'gemini-3.7-flash', '--control', 'gemini-3.7-flash']), /answered|rule 2c reading|rule 2c holes/)}`);
fs.writeFileSync(path.join(HERE, 'thoughts-noise.out.txt'), noise.join('\n'));

// 3. knowledge mode (rule 1(g), re-check N1): the persisted toggle read without the app, and the hour's log lines
const kmode = [];
kmode.push(`=================== node knowledge-mode-read.mjs (the real file through the admin share; the direct path is the sandbox's shadow)\n${run('knowledge-mode-read.mjs', [])}`);
for (const stub of ['on', 'off', 'absent', 'broken', 'missing']) kmode.push(`=================== node knowledge-mode-read.mjs --file kmode-stubs/settings-${stub}.json\n${run('knowledge-mode-read.mjs', ['--file', `${VH}/kmode-stubs/settings-${stub}.json`])}`);
for (const r of [H40C, `${RUNS}/2026-09-30T11-45-30-br1`, `${WTR}/2026-09-30T13-46-52-cuesmoke`, RESMOKE]) kmode.push(`=================== node h40d-knowledge-lines.mjs ${path.basename(r)}\n${run('h40d-knowledge-lines.mjs', [r])}`);
for (const f of ['ok-20', 'missing-1-of-20', 'missing-3-of-20', 'disabled-inside', 'no-enabled']) kmode.push(`=================== node h40d-knowledge-lines.mjs --log kmode-fixtures/${f}.log\n${run('h40d-knowledge-lines.mjs', ['--log', `${VH}/kmode-fixtures/${f}.log`])}`);
fs.writeFileSync(path.join(HERE, 'knowledge-mode.out.txt'), kmode.join('\n'));
console.log(`wrote ${path.join(HERE, 'clocks.cal-r2.out.txt')}, thoughts-noise.out.txt and knowledge-mode.out.txt (all in this folder)`);
