// Throwaway: mutates R/launch-grader.mjs in place (restored in finally) and runs section D; every mutant must make section D FAIL.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const F = 'R/launch-grader.mjs';
const orig = fs.readFileSync(F, 'utf8');
const M = [
    ['non-empty memory pre-check removed', 'if (mem.length) return {', 'if (false) return {'],
    ['.jsonl pre-check removed', 'if (jl.length) return {', 'if (false) return {'],
    ['an existing cwd reused', 'if (fs.existsSync(cwd)) return {', 'if (false) return {'],
    ['is_error recorded as exit 0', 'const exit = r.status === 0 && (!j || j.is_error) ? 1 : r.status;', 'const exit = r.status;'],
    ['slug folder ownership not checked', 'const own = path.basename(dir).toLowerCase() === projectSlug(cwd).toLowerCase();', 'const own = true;'],
    ['a second .jsonl counted as 1', "return { slugJsonl: own && jsonls.length === 1 && jsonls[0] === `${session}.jsonl` ? 1 : own ? jsonls.length : 0, memoryDir };", 'return { slugJsonl: 1, memoryDir };'],
    ['memoryDir always absent', "try { memoryDir = fs.readdirSync(path.join(dir, 'memory')).length ? 'non-empty' : 'empty'; } catch { /* no memory folder */ }", ''],
    ['probe 2 gate removed', "if (!first || first.exit !== 0 || !tools || tools.Read !== 1 || tools.Write !== 1 || Object.keys(tools).length !== 2) {", 'if (false) {'],
    ['probe 2 gate ignores the tool counts', "|| !tools || tools.Read !== 1 || tools.Write !== 1 || Object.keys(tools).length !== 2) {", ') {'],
    ['verdicts never validated', 'const p = verdictFileProblem(', 'const p = null && verdictFileProblem('],
    ['concurrency unlimited', 'const MAX_AT_ONCE = 2;', 'const MAX_AT_ONCE = 99;'],
    ['dangerous flag added', "'--strict-mcp-config'];", "'--strict-mcp-config', '--dangerously-skip-permissions'];"],
    ['launch line without exit code success gate', "process.exit(r.record.exit === 0 && r.record.slugJsonl === 1 && r.record.memoryDir !== 'non-empty' && /valid on its pairs/.test(vp) ? 0 : 1);", 'process.exit(0);'],
];
let ok = true;
try {
    for (const [name, a, b] of M) {
        if (orig.split(a).length !== 2) { console.log(`ANCHOR NOT FOUND ONCE: ${name} (${orig.split(a).length - 1})`); ok = false; continue; }
        fs.writeFileSync(F, orig.replace(a, () => b));
        const r = spawnSync(process.execPath, ['work/runsc.mjs', '-', 'R/scripts/grader-session-calibrate.mjs', '--only', 'D'], { encoding: 'utf8', env: { ...process.env, NOFILL: '1' } });
        const caught = /exit 1;/.test(r.stdout);
        ok &&= caught;
        console.log(`${caught ? 'caught' : 'MISSED'} ${name}`);
    }
} finally { fs.writeFileSync(F, orig); }
console.log(ok ? 'ALL LAUNCHER MUTANTS CAUGHT' : 'A LAUNCHER MUTANT SURVIVED');
process.exit(ok ? 0 : 1);
