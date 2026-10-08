// Throwaway: the ONE re-ask each no-answer is owed, after both lanes finish.
//   1. Snapshots every arm's first-ask holes/empties to gemma-arms/before-hole-pass.json
//      (the reliability record: what the first ask produced, before any re-ask overwrites it).
//   2. Re-asks, once, every no-answer that has not had its re-ask yet. Excluded: 26B HIGH base
//      ids that were holes in first-pass.json (re-asked by the 03:15 lane restart) and S1Q04
//      (ran away at 180 s and again at 600 s). Cap 180 s, same runner, same pacing.
// The two models run in parallel (separate per-model token budgets); arms within a model in turn.
//   node gemma-hole-pass.mjs [--dry]
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const ARMS = `${SP}/gemma-arms`;
const PROMPTS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json';
const dry = process.argv.includes('--dry');
// --models a,b: only these models (a lane that finished early runs its pass on its own).
const mi = process.argv.indexOf('--models');
const MODELS = mi >= 0 ? process.argv[mi + 1].split(',') : ['gemma-4-31b-it', 'gemma-4-26b-a4b-it'];
const TAGS = [['high', 'HIGH'], ['min', 'MINIMAL'], ['high-r2', 'HIGH'], ['high-r3', 'HIGH'], ['min-r2', 'MINIMAL'], ['min-r3', 'MINIMAL']];

const firstPass = JSON.parse(fs.readFileSync(`${ARMS}/first-pass.json`, 'utf8').replace(/^\uFEFF/, ''));
const alreadyReasked = new Set([...(firstPass['gemma-4-26b-a4b-it_high']?.holes ?? []).map((h) => h.split(':')[0]), 'S1Q04']);

const snapshot = {}, plan = {};
for (const m of MODELS) {
    plan[m] = [];
    for (const [tag, level] of TAGS) {
        const arm = `${m}_${tag}`;
        const f = `${ARMS}/interview60.answers.${arm}.json`;
        if (!fs.existsSync(f)) { console.error(`missing ${arm} — lanes not finished`); process.exit(2); }
        const s = JSON.parse(fs.readFileSync(f, 'utf8'));
        const none = Object.entries(s).filter(([, v]) => !v.spoken);
        snapshot[arm] = Object.fromEntries(none.map(([id, v]) => [id, v.transientError ?? `empty (cut retried: ${!!v.cutRetried})`]));
        const owed = none.map(([id]) => id).filter((id) => !(arm === 'gemma-4-26b-a4b-it_high' && alreadyReasked.has(id)));
        if (owed.length) plan[m].push({ arm, tag, level, ids: owed });
    }
}
// Merged, never overwritten: each model's pass adds its arms to the one reliability record.
const SNAP = `${ARMS}/before-hole-pass.json`;
if (!dry) fs.writeFileSync(SNAP, JSON.stringify({ ...(fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : {}), ...snapshot }, null, 1));
for (const m of MODELS) for (const p of plan[m]) console.log(`${dry ? 'WOULD ' : ''}RE-ASK ${p.arm}: ${p.ids.join(',')}`);
if (dry) process.exit(0);

const env = { ...process.env, GEMMA_ARMS_DIR: ARMS, NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S2', GEMMA_CALL_TIMEOUT_MS: '180000' };
const runOne = (m, p) => new Promise((resolve) => {
    const log = fs.openSync(`${ARMS}/${m}.log`, 'a');
    fs.writeSync(log, `=== hole pass ${p.tag} ${new Date().toTimeString().slice(0, 8)} (cap 180 s, one re-ask): ${p.ids.join(',')}\n`);
    const c = spawn(process.execPath, [`${SP}/gemma-answers.mjs`, '--model', m, '--tag', p.tag, '--thinking', p.level, '--captured', PROMPTS, '--only', p.ids.join(',')], { env, stdio: ['ignore', log, log] });
    c.on('exit', (code) => { fs.closeSync(log); resolve(code); });
});
await Promise.all(MODELS.map(async (m) => { for (const p of plan[m]) await runOne(m, p); }));
for (const m of MODELS) for (const p of plan[m]) {
    const s = JSON.parse(fs.readFileSync(`${ARMS}/interview60.answers.${p.arm}.json`, 'utf8'));
    const still = p.ids.filter((id) => !s[id]?.spoken);
    console.log(`AFTER ${p.arm}: re-asked ${p.ids.length}, recovered ${p.ids.length - still.length}${still.length ? `, still none: ${still.join(',')}` : ''}`);
}
