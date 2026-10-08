// The pooled decision of PREREGISTER-followup-questions.md §7 (+ AMENDMENT-s50l.md): Thursday's s50m pairs + Saturday's
// s50l pairs, read by Thursday's exact `decide()` with { pooled: true } (a second INCONCLUSIVE is a FAIL; bars scale
// with the pooled counts). The merge is Thursday's CLI merge (followup-questions-decide.mjs lines 91-131), run once per
// folder with that folder's own common.mjs, so each run's keys, verdicts, answer files and material are read as
// Thursday's were. Ids are prefixed by run (m: / l:) so the two runs' pairs never collide. Lives OUTSIDE scripts/
// (which make-fq-s50l.mjs regenerates).
//   node pooled-decide.mjs --calibrate   Thursday alone, NOT pooled: its 9 rule lines must equal, in order, the block
//                                        in Thursday's RESULT.txt (prep review I5)
//   node pooled-decide.mjs               both runs, pooled -> the decision, after the pins (review M5) and the
//                                        additivity check (review I5) pass
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const THU = path.join(SP, 'followup-questions', 'scripts'), SAT = path.join(HERE, 'scripts');
const { decide, formatResult } = await import(pathToFileURL(path.join(THU, 'followup-questions-decide.mjs')).href);
const SCORE = (v) => v && [v.correctness, v.on_topic, v.delivery].every((x) => [0, 1, 2].includes(x));
const INSTRUMENT = '8564ba96369a', PINNED = 'claude-opus-5-5';

async function collect(dir, tag) {
    const C = await import(pathToFileURL(path.join(dir, 'common.mjs')).href);
    const J = await import(pathToFileURL(path.join(C.MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
    const { G } = await C.loadGated();
    const answers = {};
    for (const arm of C.ARMS) for (const rep of C.REPS) answers[`${arm}${rep}`] = JSON.parse(fs.readFileSync(C.fileFor(arm, rep), 'utf8'));
    const keyFiles = fs.readdirSync(C.BLIND_DIR).filter((f) => /^key\.blind-\d+\.json$/.test(f));
    if (!keyFiles.length) throw new Error(`${tag}: no key.blind-N.json under ${C.BLIND_DIR}`);
    const scores = {};
    for (const kf of keyFiles) {
        const nf = kf.match(/^key\.blind-(\d+)\.json$/)[1];
        const keys = JSON.parse(fs.readFileSync(path.join(C.BLIND_DIR, kf), 'utf8'));
        for (const g of C.GRADERS) {
            const vf = path.join(C.BLIND_DIR, `verdicts.blind-${nf}.${g}.json`);
            if (!fs.existsSync(vf)) throw new Error(`${tag}: missing ${vf}`);
            const v = JSON.parse(fs.readFileSync(vf, 'utf8'));
            const extra = Object.keys(v).filter((k) => !keys[k]);
            if (extra.length) throw new Error(`${tag}: ${path.basename(vf)} grades keys not in ${kf}: ${extra.join(', ')}`);
            for (const [k, meta] of Object.entries(keys)) {
                if (!SCORE(v[k])) throw new Error(`${tag}: ${path.basename(vf)}: no valid verdict for ${k}`);
                ((scores[`${meta.id}|${meta.arm}|${meta.rep}`] ??= {})[g] = v[k]);
            }
        }
    }
    const EMPTY = { correctness: 0, on_topic: 0, delivery: 0 };
    const pairs = [], incomplete = [], emptied = [];
    for (const id of C.IDS) for (const rep of C.REPS) {
        const side = {};
        for (const arm of C.ARMS) {
            const x = answers[`${arm}${rep}`][id];
            if (!x || x.transientError) continue;
            if (!x.spoken) { emptied.push(`${tag}:${arm}r${rep}:${id}`); side[arm] = { g1: EMPTY, g2: EMPTY, ttft: x.ttft ?? x.total, words: 0 }; continue; }
            const s = scores[`${id}|${arm}|${rep}`];
            if (!s?.g1 || !s?.g2) throw new Error(`${tag}: ${id} r${rep} ${arm}: answered but not graded by both graders`);
            side[arm] = { g1: s.g1, g2: s.g2, ttft: x.ttft, words: x.words };
        }
        if (!side.A || !side.B) { incomplete.push(`${tag}:${id}#${rep}`); continue; }
        pairs.push({ id: `${tag}:${id}`, kind: G[id].kind, rep, A: side.A, B: side.B });
    }
    return { pairs, incomplete, emptied, J, C, keyFiles: keyFiles.length };
}

const thu = await collect(THU, 'm');
if (process.argv.includes('--calibrate')) {
    const mine = formatResult(decide(thu.pairs, thu.J.verdictOf)).split('\n');
    const pub = fs.readFileSync(process.env.FQ_RESULT_PATH ?? path.join(SP, 'followup-questions', 'RESULT.txt'), 'utf8').split('\n').map((l) => l.trimEnd());   // FQ_RESULT_PATH: only for the negative calibration
    const start = pub.indexOf(mine[0]);
    const block = start >= 0 ? pub.slice(start, start + mine.length) : [];
    const same = mine.length === 9 && block.length === mine.length && mine.every((l, i) => l === block[i]);
    console.log(mine.join('\n'));
    console.log(same ? 'CALIBRATION OK: all 9 rule lines equal Thursday\'s RESULT.txt block, in order' : `CALIBRATION MISMATCH (lines ${mine.length}, block found at ${start})`);
    process.exit(same ? 0 : 1);
}

// Pins (review M5): the instrument stamp, and every grader of both runs claude-opus-5-5 per graders.json.
const stamp = thu.J.graderPromptVersion();
if (stamp !== INSTRUMENT) { console.log(`REPORTED, NOT DECIDED: instrument ${stamp} is not ${INSTRUMENT}`); process.exit(3); }
for (const [dir, n] of [[path.join(SP, 'followup-questions', 'blind'), 8], [path.join(HERE, 'blind'), null]]) {
    const gf = path.join(dir, 'graders.json');
    if (!fs.existsSync(gf)) { console.log(`REPORTED, NOT DECIDED: missing ${gf}`); process.exit(3); }
    const gj = JSON.parse(fs.readFileSync(gf, 'utf8'));
    const models = Object.values(gj.graders ?? {}).map((g) => g.model);
    const want = n ?? 0;
    if ((n !== null && models.length !== want) || !models.length || models.some((m) => m !== PINNED) || gj.instrument !== INSTRUMENT) { console.log(`REPORTED, NOT DECIDED: ${gf}: models ${JSON.stringify(models)}, instrument ${gj.instrument}`); process.exit(3); }
}
const sat = await collect(SAT, 'l');
const satGraders = Object.keys(JSON.parse(fs.readFileSync(path.join(HERE, 'blind', 'graders.json'), 'utf8')).graders).length;
if (satGraders !== 2 * sat.keyFiles) { console.log(`REPORTED, NOT DECIDED: s50l graders.json lists ${satGraders}, expected ${2 * sat.keyFiles}`); process.exit(3); }

const all = [...thu.pairs, ...sat.pairs];
const r = decide(all, thu.J.verdictOf, { pooled: true });
// Additivity (review I5): the pooled counts must equal Thursday's + s50l's, each read alone by the same decide().
const rm = decide(thu.pairs, thu.J.verdictOf), rl = decide(sat.pairs, thu.J.verdictOf);
const sums = ['wrongA', 'wrongB', 'offA', 'offB', 'slowA', 'slowB', 'accA', 'accB'];
const bad = sums.filter((k) => r.numbers[k] !== rm.numbers[k] + rl.numbers[k]);
if (r.n !== rm.n + rl.n || r.R !== rm.R + rl.R || bad.length) { console.log(`ADDITIVITY FAILED: ${bad.join(',')} n ${r.n} vs ${rm.n}+${rl.n} R ${r.R} vs ${rm.R}+${rl.R}`); process.exit(4); }
console.log(`additivity OK: n ${rm.n}+${rl.n}=${r.n}, R ${rm.R}+${rl.R}=${r.R}, ${sums.map((k) => `${k} ${rm.numbers[k]}+${rl.numbers[k]}`).join(', ')}`);
console.log(`POOLED (s50m Thursday + s50l Saturday): ${thu.pairs.length} + ${sat.pairs.length} pairs; instrument ${stamp}; graders ${PINNED}`);
console.log(`incomplete pairs (excluded): ${[...thu.incomplete, ...sat.incomplete].join(', ') || 'none'}`);
console.log(`answers empty after the filters (scored 0/0/0): ${[...thu.emptied, ...sat.emptied].join(', ') || 'none'}`);
console.log(formatResult(r));
