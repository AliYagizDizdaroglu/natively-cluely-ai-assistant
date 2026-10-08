// Throwaway end-to-end check of the blind builder and the decide CLI on SYNTHETIC answers and verdicts with a
// known outcome, in a temp folder (FQ_OUT_DIR), so the file seams (answer files -> blind pairs/keys -> two graders'
// verdicts -> merge -> decide) are exercised before Thursday. No model call, no grader, nothing in the real folder.
//   planted: roster B acceptable where A is weak on 5 pairs (gain +5 -> PASS), except that
//     - S1Q04F r3 arm A is a transient failure  -> incomplete pair, excluded (so the gain is +4 of R = 20)
//     - C3 r2 arm B answered but empty after the filters -> scored 0/0/0 -> a NEW consensus wrong -> clause 1 FAIL
//   expected: incomplete S1Q04F#3, emptied Br2:C3, R = 20, wrongB 1 > wrongA 0 -> DECISION: FAIL (c1), c5 PASS (+4)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fq-e2e-'));
process.env.FQ_OUT_DIR = TMP;
const { IDS, REPS, ARMS, fileFor, loadGated, BLIND_DIR } = await import('./common.mjs');
if (!BLIND_DIR.startsWith(TMP.replace(/\\/g, '/')) && !BLIND_DIR.startsWith(TMP)) { console.log(`REFUSED: BLIND_DIR ${BLIND_DIR} is not under the temp folder`); process.exit(2); }
const { G } = await loadGated();
const WEAK_A = new Set(['S1Q04F#3', 'S1Q06F#1', 'S1Q08#2', 'S2Q05F#1', 'S2Q08#3']);   // S1Q04F#3 is also the transient pair
for (const arm of ARMS) for (const rep of REPS) {
    const store = {};
    for (const id of IDS) {
        const base = { id, kind: G[id].kind, q: G[id].current, arm, rep, position: 1, model: 'synthetic', thinking: 'HIGH', at: new Date().toISOString() };
        if (id === 'S1Q04F' && rep === 3 && arm === 'A') { store[id] = { ...base, transientError: 'HTTP 503' }; continue; }
        const empty = id === 'C3' && rep === 2 && arm === 'B';
        // The answer text names the planted verdict so the synthetic "grader" below can score it without the key.
        const tag = arm === 'A' && WEAK_A.has(`${id}#${rep}`) ? 'PLANTED-WEAK' : 'PLANTED-ACC';
        store[id] = { ...base, spoken: empty ? '' : `${tag} synthetic answer for ${id} rep ${rep} arm ${arm}`, words: empty ? 0 : 80, ttft: 3000 + rep * 10, total: 6000, finish: 'STOP', raw: 'x', rawLen: 1, thoughts: 100 };
    }
    fs.writeFileSync(fileFor(arm, rep), JSON.stringify(store, null, 1));
}
const run = (f) => spawnSync(process.execPath, [path.join(HERE, f)], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: TMP } });
const b = run('followup-questions-blind.mjs');
console.log(b.stdout.trim()); if (b.status !== 0) { console.log(`blind exit ${b.status} ${b.stderr}`); process.exit(1); }
// Two synthetic graders read ONLY the pairs files (as a real grader would) and score by the planted tag.
for (const f of fs.readdirSync(BLIND_DIR).filter((x) => /^pairs\.blind-\d+\.json$/.test(x))) {
    const n = f.match(/(\d+)/)[1];
    const { items } = JSON.parse(fs.readFileSync(path.join(BLIND_DIR, f), 'utf8'));
    for (const g of ['g1', 'g2']) {
        const v = Object.fromEntries(items.map((it) => [it.key, it.answer.startsWith('PLANTED-WEAK') ? { correctness: 2, on_topic: 2, delivery: 0, reason: 'synthetic weak' } : { correctness: 2, on_topic: 2, delivery: 2, reason: 'synthetic acceptable' }]));
        fs.writeFileSync(path.join(BLIND_DIR, `verdicts.blind-${n}.${g}.json`), JSON.stringify(v, null, 1));
    }
}
const d = run('followup-questions-decide.mjs');
console.log(d.stdout.trim()); if (d.stderr.trim()) console.log(`stderr: ${d.stderr.trim()}`);
const out = d.stdout;
const checks = [
    ['incomplete pair named', /incomplete pairs \(excluded\): S1Q04F#3 \(A missing\)/.test(out)],
    ['empty answer named and scored', /scored 0\/0\/0\): Br2:C3/.test(out)],
    ['R = 20 roster pairs', /roster pairs R = 20/.test(out)],
    ['clause 1 FAIL on the emptied answer', /consensus-wrong B 1 <= A 0: FAIL/.test(out)],
    ['clause 5 gain +4 of 20 reads PASS', /= \+4 \(PASS >= \+4, FAIL <= \+1\): PASS/.test(out)],
    ['decision FAIL', /DECISION: FAIL/.test(out)],
    ['94 of 96 answers sent to graders (not the transient, not the empty one)', [...b.stdout.matchAll(/(\d+) answers {2}/g)].reduce((a, m) => a + Number(m[1]), 0) === 94],
];
let ok = true;
for (const [name, pass] of checks) { ok &&= pass; console.log(`${pass ? 'OK ' : 'BAD'} ${name}`); }
// A grader file missing one key must stop the merge, not be read as a verdict.
const v1 = path.join(BLIND_DIR, 'verdicts.blind-1.g2.json');
const j = JSON.parse(fs.readFileSync(v1, 'utf8')); delete j[Object.keys(j)[0]]; fs.writeFileSync(v1, JSON.stringify(j));
const d2 = run('followup-questions-decide.mjs');
const refused = d2.status === 2 && /no valid verdict/.test(d2.stderr);
ok &&= refused; console.log(`${refused ? 'OK ' : 'BAD'} a grader file missing one key stops the merge (exit ${d2.status})`);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(ok ? 'E2E OK' : 'E2E FAILED');
process.exit(ok ? 0 : 1);
