// Re-review 2 probe (throwaway): M4 (guard), M5 (one resolved RUNNER), M6 (runner refusal). The real
// sidecar runs ONLY with --dry or --plan; a COPY of it (RUNS and OUT redirected into rr-task4-fix2) runs
// ONLY with --dry, to reach the post-readiness --dry print. The runner runs ONLY with --limit 0 (zero
// questions, so no request is possible), GEMMA_ARMS_DIR inside rr-task4-fix2, no --captured.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix2`;
const RR1 = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix1`;
const rep1 = (t, from, to) => { const n = t.split(from).length - 1; if (n !== 1) throw new Error(`expected 1 match, found ${n}: ${from.slice(0, 80)}`); return t.replace(from, () => to); };
const count = (t, s) => t.split(s).length - 1;
const baseEnv = () => { const e = { ...process.env }; delete e.GEMMA_RUNNER_PATH; delete e.GEMMA_MAX_TRIES; return e; };
const sh = (label, args, { cwd = HERE, env = {} } = {}) => {
    const r = spawnSync(process.execPath, args, { cwd, env: { ...baseEnv(), ...env }, encoding: 'utf8' });
    const lines = (r.stdout + r.stderr).trim().split('\n');
    const tail = lines.filter((l) => /RUNNER LACKS|NOT READY|REFUSED|\[dry\]|GEMMA_MAX_TRIES is not|ANSWER-ONLY|answered|wrote|Error|error/.test(l));
    console.log(`\n--- ${label}  (cwd ${path.relative(SP, cwd) || '.'}; env ${JSON.stringify(env)})  EXIT ${r.status}`);
    for (const l of tail) console.log(`    ${l.replace(SP.replace(/\//g, '\\'), '<SP>').replace(SP, '<SP>')}`);
    return r;
};
const flashOut = `${SP}/flash-h40b`;
console.log(`<SP>/flash-h40b exists before: ${fs.existsSync(flashOut)}`);

// ── M4: runner copies that NAME the variable only in prose ──
const cur = fs.readFileSync(`${SP}/gemma-answers.mjs`, 'utf8');
const m4a = `${HERE}/m4a.mjs`; fs.copyFileSync(`${RR1}/runner-4tries-with-comment-token.mjs`, m4a);
const m4b = `${HERE}/m4b.mjs`; fs.writeFileSync(m4b, rep1(cur, 'const MAX_TRIES_ENV = process.env.GEMMA_MAX_TRIES;', 'const MAX_TRIES_ENV = undefined;'));
for (const [n, f] of [['real runner', `${SP}/gemma-answers.mjs`], ['m4a (old 4-try loop + one comment naming the var)', m4a], ['m4b (current runner, the env READ removed, header/comments kept)', m4b]]) {
    const t = fs.readFileSync(f, 'utf8');
    console.log(`${n}: "GEMMA_MAX_TRIES" x${count(t, 'GEMMA_MAX_TRIES')}, "process.env.GEMMA_MAX_TRIES" x${count(t, 'process.env.GEMMA_MAX_TRIES')}`);
}
sh('sidecar --dry, real runner (no override)', [`${SP}/flash-h40b-sidecar.mjs`, '--dry']);
sh('sidecar --dry, GEMMA_RUNNER_PATH=m4a (absolute)', [`${SP}/flash-h40b-sidecar.mjs`, '--dry'], { env: { GEMMA_RUNNER_PATH: m4a } });
sh('sidecar --dry, GEMMA_RUNNER_PATH=m4b.mjs (RELATIVE, cwd rr-task4-fix2)', [`${SP}/flash-h40b-sidecar.mjs`, '--dry'], { env: { GEMMA_RUNNER_PATH: 'm4b.mjs' } });
sh('sidecar --dry, GEMMA_RUNNER_PATH=..\\..\\..\\gemma-answers.mjs (RELATIVE to the real runner)', [`${SP}/flash-h40b-sidecar.mjs`, '--dry'], { env: { GEMMA_RUNNER_PATH: '..\\..\\..\\gemma-answers.mjs' } });
sh('sidecar --dry, same RELATIVE value from a different cwd (<SP>) -> resolves elsewhere', [`${SP}/flash-h40b-sidecar.mjs`, '--dry'], { cwd: SP, env: { GEMMA_RUNNER_PATH: '..\\..\\..\\gemma-answers.mjs' } });
sh('sidecar --plan, GEMMA_RUNNER_PATH=m4a', [`${SP}/flash-h40b-sidecar.mjs`, '--plan'], { env: { GEMMA_RUNNER_PATH: m4a } });

// ── M5 past readiness: a sidecar COPY whose RUNS and OUT point into rr-task4-fix2, --dry only ──
const runs = `${HERE}/runs`, rd = `${runs}/2026-09-26T17-00-00-h40b`;
fs.rmSync(runs, { recursive: true, force: true }); fs.mkdirSync(rd, { recursive: true });
const ids = ['R01', 'R02F', 'R03', 'R04', 'R05', 'R11F', 'R16', 'R17F', 'R23', 'R26F', 'R27', 'R28', 'R30', 'R31F', 'R32'];   // R08, R09F, R12 left uncaptured
fs.writeFileSync(`${rd}/interview60.prompts.json`, JSON.stringify(Object.fromEntries(ids.map((id, i) => [id, { system: 'S'.repeat(18000 + 300 * i), user: `U ${id} `.repeat(200) }])), null, 1));
fs.writeFileSync(`${rd}/interview60.timeline.json`, '[]');
let side = fs.readFileSync(`${SP}/flash-h40b-sidecar.mjs`, 'utf8');
side = rep1(side, 'const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;', `const RUNS = '${runs}';`);
side = rep1(side, 'const OUT = `${SP}/flash-h40b`;', `const OUT = '${HERE}/sidecar-out';`);
const sdry = `${HERE}/sdry.mjs`; fs.writeFileSync(sdry, side);
sh('sidecar COPY --dry (fake h40b folder), no override', [sdry, '--dry']);
sh('sidecar COPY --dry, GEMMA_RUNNER_PATH=..\\..\\..\\gemma-answers.mjs (RELATIVE)', [sdry, '--dry'], { env: { GEMMA_RUNNER_PATH: '..\\..\\..\\gemma-answers.mjs' } });
console.log(`\n<SP>/flash-h40b exists after: ${fs.existsSync(flashOut)}; copy's OUT created by --dry: ${fs.existsSync(`${HERE}/sidecar-out`)} (contents: [${fs.existsSync(`${HERE}/sidecar-out`) ? fs.readdirSync(`${HERE}/sidecar-out`).join(',') : ''}])`);

// ── M6: the real runner, zero questions ──
const arms = `${HERE}/arms`; fs.rmSync(arms, { recursive: true, force: true }); fs.mkdirSync(arms);
for (const v of ['abc', 'Infinity', undefined, '1']) {
    sh(`runner --limit 0, GEMMA_MAX_TRIES=${v === undefined ? '(unset)' : v}`, [`${SP}/gemma-answers.mjs`, '--limit', '0'], { env: { GEMMA_ARMS_DIR: arms, NATIVELY_ROSTER: 'holdout40', ...(v === undefined ? {} : { GEMMA_MAX_TRIES: v }) } });
    console.log(`    arms dir now: [${fs.readdirSync(arms).join(',')}]`);
}
