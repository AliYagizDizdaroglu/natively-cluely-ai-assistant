// mutants-routing.mjs: runs cal-routing.mjs against a temp COPY of the routing kit with one deliberate mutation at a time; every mutant must make the calibration FAIL (rule 8).
// NO network, NO model; the real files are never touched.   node mutants-routing.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = ['common.mjs', 'classify.mjs', 'engine.mjs', 'fake-live.mjs', 'score-routing.mjs', 'heard-words.mjs', 'context-from-profile.mjs', 'cal-routing.mjs', 'run.mjs'];
export const MUTANTS = [
    ['classify.mjs', 'deadline-exclusive', 'if (f.fwAt > deadline)', 'if (f.fwAt >= deadline)'],
    ['classify.mjs', 'garbled-never', 'garbled = hard && !R.isCleanHard(f.fw)', 'garbled = false'],
    ['classify.mjs', 'generationComplete-does-not-end', "else if (e.kind === 'generationComplete') { if (cur) { cur.ended = true; snap(e.t); } }", "else if (e.kind === 'generationComplete') { /* ignored */ }"],
    ['classify.mjs', 'late-counts-as-on-time', "if (f.fwAt > deadline) return { cls: 'LATE'", "if (false) return { cls: 'LATE'"],
    ['classify.mjs', 'row4-skipped', "const c = R.checkCompleted(f.textAtFw, false, f.endedAtFw, false);", "const c = { ok: true };"],
    ['engine.mjs', 'second-close-allowed', "if (unplanned > 1) { stopped = 'second unplanned close'; break; }\n            if (!(await reconnect(st.goAway", "if (unplanned > 5) { stopped = 'second unplanned close'; break; }\n            if (!(await reconnect(st.goAway"],
    ['engine.mjs', 'cut-attempt-not-relabelled', 'for (const e of events) if (e.item === item.id) e.item = `${item.id}~a1`;', ''],
    ['engine.mjs', 'events-not-rebased-on-Q', '({ t: e.t - rec.qRel, kind', '({ t: e.t, kind'],
    ['engine.mjs', 'open-turn-never-closes', "if (my.turnOpen) { if (quiet >= timing.OPEN_QUIET_MS) { ev('openTurnTimeout'); break; } continue; }", "if (my.turnOpen) { continue; }"],
    ['engine.mjs', 'no-output-wait-removed', "if (!my.sawText) { if (waited >= timing.NO_OUTPUT_MS) { ev('noOutput'); break; } continue; }", "if (!my.sawText) { break; }"],
    ['score-routing.mjs', 'R1-max-2', 'R1_MAX: 1', 'R1_MAX: 2'],
    ['score-routing.mjs', 'R2-min-14', 'R2_MIN: 15', 'R2_MIN: 14'],
    ['score-routing.mjs', 'R2-ignores-B0', 'n >= BARS.R2_MIN && n >= b0Easy - BARS.R2_VS_B0', 'n >= BARS.R2_MIN'],
    ['score-routing.mjs', 'R2t-slack-400', 'R2T_MS: 300', 'R2T_MS: 400'],
    ['score-routing.mjs', 'R3-max-3', 'R3_MAX: 2', 'R3_MAX: 3'],
    ['score-routing.mjs', 'R4-ignores-V', 'const g = [...b1.map(garbled), garbled(v)];', 'const g = [...b1.map(garbled)];'],
    ['score-routing.mjs', 'gate-min-1', 'GATE_MIN: 2', 'GATE_MIN: 1'],
    ['score-routing.mjs', 'guard-cutoff-inclusive', 'words[id] <= limit', 'words[id] < limit'],
    ['score-routing.mjs', 'guard-block-max-3', 'GUARD_BLOCK_MAX: 2', 'GUARD_BLOCK_MAX: 3'],
    ['score-routing.mjs', 'guard-ignores-gate', "if (!gatePass) return { ship: false", "if (false) return { ship: false"],
    ['score-routing.mjs', 'sR2-round-not-floor', 'Math.floor((13 * nEasyOutside) / 20)', 'Math.round((13 * nEasyOutside) / 20)'],
    ['score-routing.mjs', 'sR1-max-2', 'pass: hardShownLive <= 1', 'pass: hardShownLive <= 2'],
    ['score-routing.mjs', 'fake-run-scoreable', "if (run.fake) bad.push(", "if (false) bad.push("],
    ['score-routing.mjs', 'gate-problem-ignores-fail', "return g.pass ? null :", "return true ? null :"],
    ["score-routing.mjs", "R4-counts-late-garbled", "x.garbled && x.cls === 'HARD'", "x.garbled"],
    ["score-routing.mjs", "instruction-sha-unchecked", "if (run.shas?.instruction !== e.instruction || run.shas?.block !== e.block) bad.push(", "if (false) bad.push("],
    ["score-routing.mjs", "model-unchecked", "if (run.model !== EXPECT_MODEL) bad.push(", "if (false) bad.push("],
    ["score-routing.mjs", "arm-label-unchecked", "if (run.arm !== arm) bad.push(", "if (false) bad.push("],
    ["score-routing.mjs", "one-context-unchecked", "else if (new Set(ctxs).size !== 1) bad.push(", "else if (false) bad.push("],
    ["score-routing.mjs", "mixed-substitute-unchecked", "if (new Set(subs).size !== 1) bad.push(", "if (false) bad.push("],
    ["score-routing.mjs", "unregistered-unmarked-allowed", "else if (!subs[0] && ctxs[0] && ctxs[0] !== CTX_SHA12) bad.push(", "else if (false) bad.push("],
    ["score-routing.mjs", "gate-ignores-pending-context", "if (!pr.length && pending) pr.push(", "if (false) pr.push("],
    ["run.mjs", "substitute-unmarked", "console.log = (...a) => log0('SUBSTITUTE', ...a);", "console.log = (...a) => log0(...a);"],
    ["run.mjs", "substitute-and-context-both", "if (SUB && arg('--context-file')) refuse(", "if (false) refuse("],
    ["common.mjs", "substitute-accepts-registered", "if (sha12(ctx) === registeredSha12) throw new Error('that file IS", "if (false) throw new Error('that file IS"],
    ['common.mjs', 'deadline-2500', 'export const DEADLINE_MS = 2000;', 'export const DEADLINE_MS = 2500;'],
    ['common.mjs', 'context-sha-not-checked', 'if (sha12(ctx) !== expect.sha12 || ctx.length !== expect.chars)', 'if (false)'],
    ['common.mjs', 'holdout-allowed', "throw new Error(`unknown roster ${name} (live40 | scenario50); holdout40 is never allowed here`);", "return [];"],
    ['common.mjs', 's50-includes-S3', "items = SCENARIO50.filter((i) => /^S[12]/.test(i.id));", "items = SCENARIO50.filter((i) => /^S[123]/.test(i.id));"],
];

let caught = 0; const lines = [];
for (const [file, id, from, to] of MUTANTS) {
    const src = fs.readFileSync(path.join(HERE, file), 'utf8');
    const n = src.split(from).length - 1;
    if (n !== 1) { lines.push(`ERROR ${file} ${id}: anchor occurs ${n} times (must be 1)`); continue; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-rt-'));
    for (const f of FILES) fs.copyFileSync(path.join(HERE, f), path.join(tmp, f));
    fs.writeFileSync(path.join(tmp, file), src.replace(from, () => to));
    const r = spawnSync(process.execPath, [path.join(tmp, 'cal-routing.mjs'), '--quiet'], { encoding: 'utf8', timeout: 300000 });
    fs.rmSync(tmp, { recursive: true, force: true });
    const failed = (r.stdout.match(/^FAIL /gm) ?? []).length;
    const ok = r.status !== 0;
    if (ok) caught++;
    lines.push(`${ok ? 'CAUGHT  ' : 'SURVIVED'} ${file} ${id}  (${failed} check(s) failed${r.status !== 0 && !failed ? `; crashed exit ${r.status}` : ''})`);
}
console.log(lines.join('\n'));
console.log(`MUTANTS ${caught}/${MUTANTS.length} caught`);
process.exit(caught === MUTANTS.length ? 0 : 1);
