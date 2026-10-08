// Re-review 2 probe (throwaway): fixture COPIES for N1/M3, and the scorer/calibration run on each.
// Reads the real fixture and the deliverables; writes ONLY under rr-task4-fix2/fx, /sc, /out.
//   e1    tier 1 captured nothing: tiers.json '1' = { ids: [], skipped: [R02F, R08] }, tier-1 files gone
//   e3    tiers 3 AND 3b captured nothing (their 11 shared ids): ids [] on both, their files gone
//   eall  every tier captured nothing (prompts.json came out empty): all four ids [], no Flash files
//   a     tier 2's def-r3 file missing (the budget gate skipped a whole rep)
//   skip  tier 2's R09F uncaptured: '2' = { ids: [R03, R16], skipped: [R09F] }
//   tr    gemini-3.6-flash_def.json holds only 503 records
//   full  complete copy (for the calibration variants)
// Each copy: pairs builder, then synthetic all-acceptable verdicts, then the real scorer — all with
// RUN_DIR/FLASH_DIR/BLIND_DIR pointed at the copy.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const FIX = `${SP}/flash-h40b-fixture`;
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix2`;
const FXD = `${HERE}/fx`, OUTD = `${HERE}/out`;
fs.mkdirSync(OUTD, { recursive: true });
const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
        if (e.isDirectory()) { if (e.name === 'blind' || e.name === 'blind-cal') continue; copyDir(`${from}/${e.name}`, `${to}/${e.name}`); }
        else fs.copyFileSync(`${from}/${e.name}`, `${to}/${e.name}`);
    }
};
const NAMES = ['e1', 'e3', 'eall', 'a', 'skip', 'tr', 'full'];
for (const n of NAMES) { fs.rmSync(`${FXD}/${n}`, { recursive: true, force: true }); copyDir(`${FIX}/run`, `${FXD}/${n}/run`); copyDir(`${FIX}/flash`, `${FXD}/${n}/flash`); }
const T = (n) => `${FXD}/${n}/flash/tiers.json`;
const editTiers = (n, f) => { const t = JSON.parse(fs.readFileSync(T(n), 'utf8')); f(t); fs.writeFileSync(T(n), JSON.stringify(t, null, 1)); };
const rmFlash = (n, model, tags) => { for (const tag of tags) fs.rmSync(`${FXD}/${n}/flash/interview60.answers.${model}_${tag}.json`); };
const orig = JSON.parse(fs.readFileSync(`${FIX}/flash/tiers.json`, 'utf8'));
console.log(`fixture tiers: ${Object.entries(orig).map(([t, v]) => `${t}=${v.model}[${v.ids.join(',')}]`).join('  ')}`);

editTiers('e1', (t) => { t['1'] = { ...t['1'], ids: [], skipped: [...t['1'].ids], requests: 0 }; }); rmFlash('e1', orig['1'].model, ['def', 'def-r2', 'def-r3']);
editTiers('e3', (t) => { for (const k of ['3', '3b']) t[k] = { ...t[k], ids: [], skipped: [...t[k].ids], requests: 0 }; }); rmFlash('e3', orig['3'].model, ['def']); rmFlash('e3', orig['3b'].model, ['def']);
editTiers('eall', (t) => { for (const k of Object.keys(t)) t[k] = { ...t[k], ids: [], skipped: [...t[k].ids], requests: 0 }; });
rmFlash('eall', orig['1'].model, ['def', 'def-r2', 'def-r3']); rmFlash('eall', orig['2'].model, ['def', 'def-r2', 'def-r3']); rmFlash('eall', orig['3'].model, ['def']); rmFlash('eall', orig['3b'].model, ['def']);
rmFlash('a', orig['2'].model, ['def-r3']);
editTiers('skip', (t) => { t['2'] = { ...t['2'], ids: t['2'].ids.filter((x) => x !== 'R09F'), skipped: ['R09F'] }; });
{ const f = `${FXD}/tr/flash/interview60.answers.${orig['3'].model}_def.json`; const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  fs.writeFileSync(f, JSON.stringify(Object.fromEntries(Object.entries(s).map(([id, v]) => [id, { id, q: v.q, model: `${orig['3'].model}_def`, transientError: 'HTTP 503', cutRetried: false }])), null, 1)); }

const V = { correctness: 2, on_topic: 2, delivery: 2, reason: 'fine' };
for (const n of NAMES) {
    const env = { ...process.env, RUN_DIR: `${FXD}/${n}/run`, FLASH_DIR: `${FXD}/${n}/flash`, BLIND_DIR: `${FXD}/${n}/flash/blind` };
    const p = spawnSync(process.execPath, [`${SP}/flash-h40b-blind-pairs.mjs`], { env, encoding: 'utf8' });
    fs.writeFileSync(`${OUTD}/${n}.pairs.txt`, `EXIT ${p.status}\n--stdout--\n${p.stdout}--stderr--\n${p.stderr}`);
    const bd = `${FXD}/${n}/flash/blind`;
    let keys = 0;
    if (n !== 'full' && fs.existsSync(bd)) for (const f of fs.readdirSync(bd).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
        keys++;
        const key = JSON.parse(fs.readFileSync(`${bd}/${f}`, 'utf8'));
        fs.writeFileSync(`${bd}/verdicts.blind-${f.match(/\d+/)[0]}.json`, JSON.stringify(Object.fromEntries(Object.keys(key).map((k) => [k, V])), null, 1));
    }
    if (n === 'full') { console.log(`${n}: pairs exit ${p.status} (${p.stdout.trim().split('\n').pop()}); blind left ungraded for the calibration variants`); continue; }
    const s = spawnSync(process.execPath, [`${SP}/flash-h40b-score-blind.mjs`], { env, encoding: 'utf8' });
    fs.writeFileSync(`${OUTD}/${n}.score.txt`, `EXIT ${s.status}\n--stdout--\n${s.stdout}--stderr--\n${s.stderr}`);
    const pick = s.stdout.split('\n').filter((l) => /answered|acceptable;|re-graded|blind files graded|^tier /.test(l)).map((l) => `      ${l.trim()}`);
    console.log(`\n${n}: pairs exit ${p.status} (${p.stdout.trim().split('\n').pop()}; ${p.stderr.trim().split('\n').filter(Boolean).length} stderr lines); ${keys} key files given all-acceptable verdicts; SCORER EXIT ${s.status}${s.stderr.trim() ? `  STDERR: ${s.stderr.trim().split('\n').slice(0, 3).join(' / ')}` : ''}`);
    for (const l of pick) console.log(l);
}
