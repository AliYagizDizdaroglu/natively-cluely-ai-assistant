// bench step 5 (SPEC 8 "Grading"): the blind export. 3 files of 84 answers; file k holds ONE C rep (k) and ONE T rep (k), shuffled, ids hidden behind keys q001..q084. The key (arm, id, rep per key)
// goes to bench/keyhold/key-b1.json, never inside the dir the graders are pointed at. The graded text is the SPOKEN answer (cue content is not graded; spec 11). NO network, NO model.
// Refuses when any of the six run files is incomplete (n must be 42 x 6 = 252 answers) or a spoken text is empty. Prints counts only.
//   node export-blind.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BENCH, RUNS_DIR, BLIND_DIR, KEYHOLD, GOLDEN_BUNDLE, readJson, sha12, sha256, loadLive40, expectedIds } from './common.mjs';

export const SEED = 'blind:bundle-1:bench';
export function rng(seedText) {   // FNV-1a seeded, the same generator router-default's export uses
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/**
 * Pure. `stores[arm][rep]` = { id: {spoken,...} }. Returns { files: [{ items }], key } or throws on any hole.
 * `questionOf(id)` / `heardOf(id)` give the grader text; the arm labels live only in the key.
 */
export function buildBlind(stores, ids, questionOf, heardOf, seed = SEED) {
    const files = [], key = {};
    for (let rep = 1; rep <= 3; rep++) {
        const flat = [];
        for (const arm of ['C', 'T']) {
            const st = stores[arm]?.[rep];
            if (!st) throw new Error(`missing run ${arm} rep ${rep}`);
            for (const id of ids) {
                const e = st[id];
                if (!e || typeof e.spoken !== 'string' || !e.spoken.trim() || e.transientError) throw new Error(`${arm} rep ${rep} id ${id}: no spoken answer`);
                flat.push({ arm, id, rep, answer: e.spoken });
            }
        }
        shuffle(flat, rng(`${seed}:${rep}`));
        const k = {}, items = flat.map((x, i) => {
            const kk = `q${String(i + 1).padStart(3, '0')}`;
            k[kk] = { arm: x.arm, id: x.id, rep: x.rep };
            return { key: kk, id: kk, kind: 'spoken', level: null, topic: null, question: questionOf(x.id), heard: heardOf(x.id), source: 'answers-pass', answer: x.answer };
        });
        files.push({ items }); key[`blind-${rep}`] = k;
    }
    return { files, key };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
    const live40 = await loadLive40(), ids = expectedIds(live40);
    const J = await import(pathToFileURL(`${GOLDEN_BUNDLE}/interview60.judge.mjs`).href);
    const judgeItems = live40.map((i) => ({ id: i.id, q: i.q, chain: i.chain ?? i.parent }));
    const byId = new Map(judgeItems.map((i) => [i.id, i]));
    const stores = { C: {}, T: {} };
    for (const arm of ['C', 'T']) for (let rep = 1; rep <= 3; rep++) {
        const f = path.join(RUNS_DIR, `b1${arm.toLowerCase()}${rep}.json`);
        if (!fs.existsSync(f)) refuse(`${path.basename(f)} missing: run run-bench.mjs`);
        stores[arm][rep] = readJson(f);
    }
    const keyFile = path.join(KEYHOLD, 'key-b1.json'), recFile = path.join(KEYHOLD, 'build-record-b1.json');
    if (fs.existsSync(keyFile) || fs.existsSync(recFile)) refuse('the key or build record already exists; refusing to overwrite');
    if (fs.existsSync(BLIND_DIR) && fs.readdirSync(BLIND_DIR).some((f) => /^pairs\.blind-\d+\.json$/.test(f))) refuse('pairs files already exist; refusing to overwrite');
    for (const dir of [BLIND_DIR]) { const rel = path.relative(dir, KEYHOLD); if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) refuse('the key dir is inside the blind dir'); }
    let built;
    try {
        built = buildBlind(stores, ids, (id) => J.questionForGrader(byId.get(id), judgeItems), (id) => live40.find((i) => i.id === id).q);
    } catch (e) { refuse(e.message); }
    const followups = ids.filter((id) => live40.find((i) => i.id === id).level === 'followup');
    const decorated = followups.filter((id) => J.questionForGrader(byId.get(id), judgeItems).includes(' [Follow-up to: '));
    if (decorated.length !== followups.length) refuse(`follow-ups without their parent text: ${followups.filter((i) => !decorated.includes(i)).join(',')}`);
    fs.mkdirSync(BLIND_DIR, { recursive: true }); fs.mkdirSync(KEYHOLD, { recursive: true });
    built.files.forEach((f, i) => fs.writeFileSync(path.join(BLIND_DIR, `pairs.blind-${i + 1}.json`), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items: f.items }, null, 1)));
    fs.writeFileSync(keyFile, JSON.stringify(built.key, null, 1));
    fs.writeFileSync(recFile, JSON.stringify({ seed: SEED, instrument: J.graderPromptVersion(), runSha12: Object.fromEntries(['C', 'T'].flatMap((a) => [1, 2, 3].map((r) => [`${a}${r}`, sha12(fs.readFileSync(path.join(RUNS_DIR, `b1${a.toLowerCase()}${r}.json`)))]))), pairsSha12: built.files.map((_, i) => sha12(fs.readFileSync(path.join(BLIND_DIR, `pairs.blind-${i + 1}.json`)))) }, null, 1));
    console.log(`blind: ${built.files.length} files of ${built.files.map((f) => f.items.length).join('/')} answers (C rep k + T rep k per file); key in keyhold (${Object.keys(built.key).length} files); instrument ${J.graderPromptVersion()}`);
}
