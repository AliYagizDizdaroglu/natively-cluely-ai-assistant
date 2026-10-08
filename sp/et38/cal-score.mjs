// Rule-8 calibration of et38/score.mjs (PREREGISTER-et38.md) on SYNTHETIC verdicts over calibration batches built
// from earlier Live runs: L20's bare-Live runs (L20b rN + L20c rN merged to 38 items) stand in for ET-low r1..r3,
// and run 1 with three more answers turned into apologies stands in for an ET-medium that stopped after one run.
// Each case writes eight verdict files into its own folder, runs score.mjs, and checks the condition and verdict
// lines it prints. No real ET answer and no real verdict is involved. Prints conditions and verdicts only.
//   node cal-score.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const ET = `${SP}/et38`, CAL = `${ET}/cal-score`;
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const mergedAnswers = (r) => ({ ...J(`${SP}/l20b/runs/live38-r${r}.answers.json`), ...J(`${SP}/l20c/runs/live38-r${r}.answers.json`) });
const mergedRun = (r) => { const b = J(`${SP}/l20b/runs/live38-r${r}.json`), c = J(`${SP}/l20c/runs/live38-r${r}.json`); return { t0Iso: b.t0Iso, sessions: [...b.sessions, ...c.sessions], events: [...b.events, ...c.events] }; };
const APOLOGY = 'I am sorry, I ran into a system error and cannot answer that.';

/** Writes a calibration batch: low reps as listed, medium r1 if asked; `edit(level, rep, answers)` may change the answers. */
function mkDir(name, lowReps, withMedium, edit = () => {}) {
    const dir = `${CAL}/${name}`;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(`${dir}/runs`, { recursive: true });
    fs.copyFileSync(`${ET}/items.json`, `${dir}/items.json`);
    const put = (level, r, answers) => { edit(level, r, answers); fs.writeFileSync(`${dir}/runs/et-${level}-r${r}.answers.json`, JSON.stringify(answers)); fs.writeFileSync(`${dir}/runs/et-${level}-r${r}.json`, JSON.stringify(mergedRun(r))); };
    for (const r of lowReps) put('low', r, mergedAnswers(r));
    if (withMedium) { const a = mergedAnswers(1); for (const id of ['S2Q10', 'S2Q03', 'S1Q10']) a[id] = { ...a[id], answer: APOLOGY }; put('medium', 1, a); }
    return dir;
}
const blind = (dir) => { const r = spawnSync(process.execPath, [`${ET}/blind.mjs`, '--dir', dir, '--keydir', `${dir}/key`], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`blind failed for ${dir}: ${r.stdout}${r.stderr}`); return J(`${dir}/key/key.json`); };

const ACC = { correctness: 2, on_topic: 2, delivery: 2, reason: 'synthetic' };
const WEAK = { correctness: 1, on_topic: 2, delivery: 2, reason: 'synthetic' };
const WRONG = { correctness: 0, on_topic: 2, delivery: 2, reason: 'synthetic' };
let n = 0;
function runCase(name, runDir, keyDir, grade, expect) {
    const { key, packets } = J(`${keyDir}/key.json`);
    const vdir = `${CAL}/v-${++n}`;
    fs.rmSync(vdir, { recursive: true, force: true });
    fs.mkdirSync(vdir, { recursive: true });
    for (const p of Object.keys(packets)) for (const [slot, g] of ['g1', 'g2'].entries()) {
        const want = Object.keys(key).filter((k) => packets[p].includes(k.split('#')[0]));
        fs.writeFileSync(`${vdir}/verdicts-${p}-${g}.json`, JSON.stringify(Object.fromEntries(want.map((k) => [k, grade(k, slot, key)]))));
    }
    const r = spawnSync(process.execPath, [`${ET}/score.mjs`, '--dir', runDir, '--keydir', keyDir, '--verdicts', vdir], { encoding: 'utf8' });
    const out = r.stdout ?? '';
    const fails = expect.filter((re) => !re.test(out));
    const ok = r.status === 0 && fails.length === 0;
    console.log(`${ok ? 'OK ' : 'BAD'} ${name}${ok ? '' : `  exit ${r.status}; unmatched: ${fails.map(String).join(' ')}; stderr ${String(r.stderr).slice(0, 300)}`}`);
    if (!ok) for (const l of out.split('\n').filter((x) => /^\d\. |Verdict|anchor/.test(x))) console.log(`      ${l.slice(0, 230)}`);
    return ok;
}

// the base batch: low r1-r3 (answered 35, 38, 38 = 111), medium r1 (32 answered, 6 holes: stopped early)
const base = mkDir('base', [1, 2, 3], true);
const K = blind(base);
const keysOf = (key, arm) => Object.keys(key).filter((k) => key[k] === arm).sort();
// br1 acceptable on 28 of its 37 answers (0.757): the anchor holds. `br1Weak` = its first 9 keys.
const br1Weak = new Set(keysOf(K.key, 'br1-inapp').slice(0, 9));
const anchored = (k) => (br1Weak.has(k) ? WEAK : ACC);
const low = (key, k) => key[k].startsWith('et-low-');
const lowKeys = Object.keys(K.key).filter((k) => K.key[k].startsWith('et-low-')).sort();
const r2Keys = keysOf(K.key, 'et-low-r2');

// variants of the base batch with the same key (the answers' texts that the key was built from are unchanged where it matters)
const slow = mkDir('slow', [1, 2, 3], true, (level, r, a) => { if (level === 'low') for (const id of Object.keys(a)) if (a[id]?.played) a[id] = { ...a[id], ttftMs: 20000 }; });
const unreliable = mkDir('unreliable', [1, 2, 3], true, (level, r, a) => { if (level === 'low' && r === 2) for (const id of ['S1Q03', 'S1Q06']) a[id] = { ...a[id], answer: APOLOGY }; });
const lowOne = mkDir('low-one-run', [1], true);
const K1 = blind(lowOne);

const results = [
    runCase('anchor holds (br1 0.757), ET-low all acceptable, 111 answered, fast -> PROCEED; medium stopped after one run -> STOP on reliability', base, `${base}/key`, anchored,
        [/The anchor:\*\* br1 graded again reads 0\.757; L20c read it 0\.770; the anchor HOLDS/, /## ET-low[\s\S]*1\. quality: mean rate 1\.000 .*-> PASS; .*-> PASS/, /2\. band: worst run 1\.000 .*-> PASS/, /3\. safety: consensus-wrong 0 <= 1 -> PASS/, /4\. reliability: answered 111\/114, need >= 110 -> PASS/, /5\. speed: .*-> PASS/, /Verdict, ET-low: PROCEED/, /Verdict, ET-medium: STOP on reliability \(stopped early: 6 holes after 1 run/]),
    runCase('ET-low weak everywhere -> quality FAIL -> STOP', base, `${base}/key`, (k, s, key) => (low(key, k) ? WEAK : anchored(k)),
        [/## ET-low[\s\S]*1\. quality: mean rate 0\.000 .*-> FAIL/, /Verdict, ET-low: STOP: its answers are not good enough/]),
    runCase('two ET-low answers wrong by both graders -> safety 2 > 1 -> STOP', base, `${base}/key`, (k) => (lowKeys.slice(0, 2).includes(k) ? WRONG : anchored(k)),
        [/3\. safety: consensus-wrong 2 <= 1 -> FAIL/, /Verdict, ET-low: STOP/]),
    runCase('one ET-low answer wrong by both graders -> safety at its edge -> PROCEED', base, `${base}/key`, (k) => (k === lowKeys[0] ? WRONG : anchored(k)),
        [/3\. safety: consensus-wrong 1 <= 1 -> PASS/, /Verdict, ET-low: PROCEED/]),
    runCase('two ET-low answers wrong by ONE grader only -> not consensus -> PROCEED', base, `${base}/key`, (k, s) => (lowKeys.slice(0, 2).includes(k) && s === 0 ? WRONG : anchored(k)),
        [/3\. safety: consensus-wrong 0 <= 1 -> PASS/, /Verdict, ET-low: PROCEED/]),
    runCase('ET-low run 2 acceptable on 22 of 38 (0.579) -> the mean holds (0.860) but the band fails -> STOP', base, `${base}/key`, (k) => (r2Keys.slice(0, 16).includes(k) ? WEAK : anchored(k)),
        [/1\. quality: mean rate 0\.860 .*-> PASS; .*-> PASS/, /2\. band: worst run 0\.579 >= 0\.658 .*-> FAIL/, /Verdict, ET-low: STOP/]),
    runCase('br1 all acceptable (1.000): the anchor does not hold; ET-low all acceptable -> NO VERDICT ON QUALITY', base, `${base}/key`, () => ACC,
        [/the anchor DOES NOT HOLD/, /1\. quality: mean rate 1\.000 >= br1 1\.000 - 0\.05 = 0\.950 -> PASS; >= 0\.702 .*-> not read/, /2\. band: .*-> not read/, /Verdict, ET-low: NO VERDICT ON QUALITY/]),
    runCase('the anchor does not hold and ET-low is weak everywhere -> STOP (the br1 read needs no L20c bar)', base, `${base}/key`, (k, s, key) => (low(key, k) ? WEAK : ACC),
        [/the anchor DOES NOT HOLD/, /1\. quality: mean rate 0\.000 .*-> FAIL/, /Verdict, ET-low: STOP/]),
    runCase('quality holds, every first word at 20 s -> speed FAIL -> WAIT', slow, `${base}/key`, anchored,
        [/5\. speed: first word of the real answer p50 20\.0 s <= 6\.6 s and p90 20\.0 s <= 14\.6 s .*-> FAIL/, /Verdict, ET-low: WAIT/]),
    runCase('quality holds, 109 answered -> reliability FAIL -> WAIT', unreliable, `${base}/key`, anchored,
        [/4\. reliability: answered 109\/114, need >= 110 -> FAIL/, /Verdict, ET-low: WAIT/]),
    runCase('ET-low has one run only -> not scorable yet, never a verdict', lowOne, `${lowOne}/key`, (k) => (new Set(keysOf(K1.key, 'br1-inapp').slice(0, 9)).has(k) ? WEAK : ACC),
        [/Verdict, ET-low: NOT SCORABLE YET: ET-low has 1 run/, /Verdict, ET-medium: STOP on reliability/]),
];
const ok = results.every(Boolean);
console.log(ok ? `ET38 SCORE CALIBRATION OK (${results.length} cases)` : 'ET38 SCORE CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
