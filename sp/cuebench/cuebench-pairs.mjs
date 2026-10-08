// Cue bench blind pairs (SP\PREREGISTER-cuebench.md §2): per rep r and question id, the control answer (s50m
// captured-high r) and the cue answer (cues-r<r>) side by side, their order set by a seeded coin, keys `${id}#1` and
// `${id}#2`; the id list split in halves so one grader run holds ~40 answers. Graders see PROSE only: the answers pass
// strips the cue block into `cues` and records the prose as `spoken`. Key files never go to a grader.
//   node cuebench-pairs.mjs --cue-dir <dir with interview60.answers.gemini-3.5-flash-lite_cues-r{1,2,3}.json>
//   node cuebench-pairs.mjs --cue-dir <dir> --dry     (counts only, writes nothing)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BLIND = process.env.CB_BLIND_DIR ?? path.join(HERE, 'blind');
export const MODEL = 'gemini-3.5-flash-lite';   // PREREGISTER-cuebench.md §1: h40c PASSED -> the front leg, thinking HIGH
export const REPS = [1, 2, 3];
export const controlFile = (r) => path.join(RUN, `interview60.answers.${MODEL}_captured-high${r === 1 ? '' : `-r${r}`}.json`);
export const cueFile = (dir, r) => path.join(dir, `interview60.answers.${MODEL}_cues-r${r}.json`);
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };

export function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith('cuebench-pairs.mjs')) {
    const cueDir = arg('--cue-dir');
    const DRY = process.argv.includes('--dry');
    if (!cueDir) { console.error('usage: cuebench-pairs.mjs --cue-dir <dir> [--dry]'); process.exit(2); }
    const J = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.judge.mjs`).href);
    const stamp = J.graderPromptVersion();
    if (stamp !== '8564ba96369a') { console.error(`instrument stamp ${stamp} is not the pre-registered 8564ba96369a`); process.exit(2); }
    const TL = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
    const PROMPTS = JSON.parse(fs.readFileSync(`${RUN}/interview60.prompts.json`, 'utf8'));
    const IDS = Object.keys(PROMPTS).filter((id) => PROMPTS[id]?.system && PROMPTS[id]?.user);
    if (IDS.length !== 39) { console.error(`expected s50m's 39 captured ids, found ${IDS.length}`); process.exit(2); }
    if (!DRY) {
        if (fs.existsSync(BLIND) && fs.readdirSync(BLIND).some((f) => /^verdicts\./.test(f))) { console.error(`${BLIND} already holds verdicts; refusing to rebuild keys under them`); process.exit(2); }
        fs.mkdirSync(BLIND, { recursive: true });
    }
    const half = Math.ceil(IDS.length / 2);
    for (const r of REPS) {
        for (const f of [controlFile(r), cueFile(cueDir, r)]) if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
        const control = JSON.parse(fs.readFileSync(controlFile(r), 'utf8'));
        const cue = JSON.parse(fs.readFileSync(cueFile(cueDir, r), 'utf8'));
        const absent = [], empty = [];
        for (const [h, ids] of [[1, IDS.slice(0, half)], [2, IDS.slice(half)]]) {
            const items = [], key = {};
            for (const id of ids) {
                const sides = { control: control[id], cue: cue[id] };
                // A transient (no record, or transientError) takes the id out of THIS rep for both arms; named below.
                if (Object.values(sides).some((x) => !x || x.transientError)) { absent.push(`r${r}:${id}(${Object.entries(sides).filter(([, x]) => !x || x.transientError).map(([a]) => a).join(',')})`); continue; }
                const tl = TL.items.find((x) => x.id === id);
                if (!tl) { console.error(`${id} is not in the s50m timeline`); process.exit(2); }
                const question = J.questionForGrader(tl, TL.items);
                const order = rng(`cuebench:${id}:r${r}`)() < 0.5 ? ['control', 'cue'] : ['cue', 'control'];
                order.forEach((arm, i) => {
                    const k = `${id}#${i + 1}`;
                    key[k] = { id, arm, rep: r };
                    // Empty prose is not graded; the scorer counts it wrong, as mergeVerdicts counts an undelivered answer.
                    if (!sides[arm].spoken) { empty.push(`r${r}:${id}:${arm}`); key[k].empty = true; return; }
                    items.push({ key: k, id, kind: 'spoken', level: tl.level ?? null, topic: tl.topic ?? null, question, heard: sides[arm].q ?? tl.q, source: 'answers-pass', answer: sides[arm].spoken });
                });
            }
            if (!DRY) {
                fs.writeFileSync(path.join(BLIND, `pairs.r${r}.h${h}.json`), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items }, null, 1));
                fs.writeFileSync(path.join(BLIND, `key.r${r}.h${h}.json`), JSON.stringify(key, null, 1));
            }
            console.log(`${DRY ? 'DRY ' : ''}pairs.r${r}.h${h}.json  ${items.length} answers (${Object.keys(key).length / 2} ids)`);
        }
        console.log(`  rep ${r}: out of this rep (transient): ${absent.join(', ') || 'none'}; empty prose (scored wrong): ${empty.join(', ') || 'none'}`);
    }
    console.log(`instrument ${stamp}; graders: two per pairs file, each writes verdicts.r<r>.h<h>.g1.json / .g2.json beside it`);
}
