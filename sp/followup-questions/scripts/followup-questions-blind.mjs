// Builds the BLINDED grading files for the earlier-question context replay (PREREGISTER-followup-questions.md
// §1, §3, §3b, §5), in followup-replay-blind.mjs's pattern: per item the six answers (A r1-3, B r1-3) shuffled by
// a seeded rng under keys `${id}#${n}`; PER_FILE = 4 -> 4 files of 4 items; key files beside them, never shown to
// a grader. The `question` a grader sees:
//   roster follow-ups   J.questionForGrader(timeline item) -> "<q> [Follow-up to: <parent q>]"
//   roster mains        the same call, which returns the bare roster question (graded as the standard judge does)
//   callbacks (C1-C6)   "<callback> [Follow-up to: <referenced roster question>]"  (§3)
//   dropped (D1-D3)     J.questionForGrader(the follow-up's own roster item): WITH its true parent (§3b)
// `heard` is the pinned question the app dispatched (`current`); for a callback, the callback itself.
//
//   node followup-questions-blind.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MAIN, RUN_DIR, BLIND_DIR, IDS, REPS, ARMS, PER_FILE, fileFor, loadGated } from './common.mjs';

const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
const TL = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'interview60.timeline.json'), 'utf8'));
const { G } = await loadGated();

function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tlItem = (id) => { const it = TL.items.find((x) => x.id === id); if (!it) throw new Error(`${id} is not in the s50m timeline`); return it; };

/** The grader's question for one frozen item (see the header). Refuses a callback whose recorded
 *  referenced question is not the roster's text, and a main that questionForGrader would decorate. */
export function graderQuestion(id, o) {
    if (o.kind === 'callback') {
        const ref = tlItem(o.ref);
        if (ref.q !== o.refQuestion) throw new Error(`${id}: recorded refQuestion is not ${o.ref}'s roster text`);
        return `${o.current} [Follow-up to: ${o.refQuestion}]`;
    }
    const item = tlItem(o.kind === 'dropped' ? o.id : id);
    const q = J.questionForGrader(item, TL.items);
    if (!o.chain && q !== item.q) throw new Error(`${id}: a main, but questionForGrader decorated it`);
    if (o.chain && !q.includes(' [Follow-up to: ')) throw new Error(`${id}: a follow-up of ${o.chain}, but its grader question carries no parent`);
    if (o.chain && item.chain !== o.chain) throw new Error(`${id}: the timeline's parent ${item.chain} is not the recorded ${o.chain}`);
    return q;
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith('followup-questions-blind.mjs')) {
    if (fs.existsSync(BLIND_DIR) && fs.readdirSync(BLIND_DIR).some((f) => /^verdicts\./.test(f))) { console.error(`${BLIND_DIR} already holds verdicts; refusing to rebuild the keys under them`); process.exit(2); }
    const answers = {};
    for (const arm of ARMS) for (const rep of REPS) {
        const f = fileFor(arm, rep);
        if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
        answers[`${arm}${rep}`] = JSON.parse(fs.readFileSync(f, 'utf8'));
    }
    fs.mkdirSync(BLIND_DIR, { recursive: true });
    const missing = [], empty = [];
    const perItem = {};
    for (const id of IDS) {
        perItem[id] = [];
        for (const arm of ARMS) for (const rep of REPS) {
            const x = answers[`${arm}${rep}`][id];
            // No record, or a transient failure after every retry: not graded; the pair leaves the decision (§4).
            if (!x || x.transientError) { missing.push(`${arm}r${rep}:${id}`); continue; }
            // A completed call whose filtered answer is empty is not sent to a grader: the decide step scores it
            // 0/0/0 (wrong), exactly as the judge's mergeVerdicts scores an undelivered answer. It stays in the pair.
            if (!x.spoken) { empty.push(`${arm}r${rep}:${id}`); continue; }
            perItem[id].push({ arm, rep, answer: x.spoken });
        }
        perItem[id] = shuffle(perItem[id], rng(`blind:followup-questions:${id}`));
    }
    const chunks = [];
    for (let i = 0; i < IDS.length; i += PER_FILE) chunks.push(IDS.slice(i, i + PER_FILE));
    chunks.forEach((ids, n) => {
        const items = [], key = {};
        for (const id of ids) {
            const o = G[id];
            const question = graderQuestion(id, o);
            perItem[id].forEach((e, i) => {
                const k = `${id}#${i + 1}`;
                items.push({ key: k, id, kind: 'spoken', level: null, topic: null, question, heard: o.current, source: 'answers-pass', answer: e.answer });
                key[k] = { id, arm: e.arm, rep: e.rep };
            });
        }
        fs.writeFileSync(path.join(BLIND_DIR, `pairs.blind-${n + 1}.json`), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items }, null, 1));
        fs.writeFileSync(path.join(BLIND_DIR, `key.blind-${n + 1}.json`), JSON.stringify(key, null, 1));
        console.log(`pairs.blind-${n + 1}.json  ${items.length} answers  ${ids.join(',')}`);
    });
    console.log(`${chunks.length} files; not graded, pair incomplete (transient after retries): ${missing.length ? missing.join(', ') : 'none'}; not graded, scored wrong (empty after the filters): ${empty.length ? empty.join(', ') : 'none'}; instrument ${J.graderPromptVersion()} (pre-registered 8564ba96369a)`);
}
