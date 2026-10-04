// Builds the BLINDED grading files for the turn-based follow-up context replay (PREREGISTER-turn-followup.md section 1,
// "Blind builder"; m6), in followup-questions-blind.mjs's pattern: per item the 10 answers of a FRONT item (A r1-5, B r1-5)
// or the 6 of a BACK item (A r1-3, B r1-3), shuffled by a seeded rng (seed `blind:turn-followup:<hour>:<id>`) under keys
// `<hour>:<id>#<n>`; the front leg's 14 items go 2 per file (7 files of 20 answers), the back leg's 8 items 4 per file
// (2 files of 24) = 9 files, never more than 24 answers a file. Key files sit beside them and are moved out of every
// grader's reach before a grader is dispatched (move-keys.mjs). The `question` a grader sees is questionForGrader (the
// follow-up WITH its parent, `[Follow-up to: ...]`), the same for both arms; for a D-case it is the follow-up's own
// roster item, i.e. the TRUE parent.
//
// Refuses (A2 point 3) while any R/STOPPED-*.txt exists or when any stored record ended at or after the hard stop (2026-10-04T06:30:00Z): stopped
// records are never graded. loadGated verifies section 2 first, which includes the judge module's and the dispatch text's rows (A2 M1).
//   node followup-turn-blind.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MAIN, OUT_DIR, runDir, BLIND_DIR, LEGS, ARMS, PRIMARY_HOURS, PER_FILE, MAX_PER_FILE, INSTRUMENT, fileFor, loadGated, itemsFor, stoppedMarkers, recordEndProblem } from './common.mjs';
const RERUN = process.argv.includes('--rerun');   // the one allowed s50k re-run (registration section 7): s50k only, into blind-rerun/
const HRS = RERUN ? ['s50k'] : PRIMARY_HOURS;
const OUTB = RERUN ? path.join(path.dirname(BLIND_DIR), 'blind-rerun') : BLIND_DIR;

const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
const TL = {};
const tlItem = (hour, id) => {
    TL[hour] ??= JSON.parse(fs.readFileSync(path.join(runDir(hour), 'interview60.timeline.json'), 'utf8'));
    const it = TL[hour].items.find((x) => x.id === id);
    if (!it) throw new Error(`${hour}:${id} is not in the ${hour} timeline`);
    return it;
};

export function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const seedFor = (hour, id) => `blind:turn-followup:${hour}:${id}`;

/** The grader's question for one frozen item (the follow-up with its parent). Refuses a main that questionForGrader decorates. */
export function graderQuestion(o) {
    const item = tlItem(o.hour, o.kind === 'dropped' ? o.rosterId : o.id);
    const q = J.questionForGrader(item, TL[o.hour].items);
    if (!o.chain && q !== item.q) throw new Error(`${o.hour}:${o.id}: a main, but questionForGrader decorated it`);
    if (o.chain && !q.includes(' [Follow-up to: ')) throw new Error(`${o.hour}:${o.id}: a follow-up of ${o.chain}, but its grader question carries no parent`);
    if (o.chain && item.chain !== o.chain) throw new Error(`${o.hour}:${o.id}: the timeline's parent ${item.chain} is not the recorded ${o.chain}`);
    return q;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (fs.existsSync(OUTB) && fs.readdirSync(OUTB).some((f) => /^verdicts\./.test(f))) { console.error(`${OUTB} already holds verdicts; refusing to rebuild the keys under them`); process.exit(2); }
    const stopped = stoppedMarkers();
    if (stopped.length) { console.error(`REFUSED: ${stopped.join(', ')} exist(s) in ${OUT_DIR}: a pass hit the hard stop (09:30 local); stopped records are never graded (day-steps stop-archive moves them out)`); process.exit(2); }
    const { G } = await loadGated(HRS);
    const missing = [], empty = [];
    const files = [];
    for (const leg of ['front', 'back']) {
        const L = LEGS[leg];
        const items = itemsFor(G, leg, HRS);
        const answers = {};
        for (const h of HRS) for (const arm of ARMS) for (let rep = 1; rep <= L.reps; rep++) {
            const f = fileFor(leg, h, arm, rep);
            if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
            answers[`${h}|${arm}|${rep}`] = JSON.parse(fs.readFileSync(f, 'utf8'));
        }
        const late = Object.entries(answers).flatMap(([k, st]) => Object.entries(st).map(([rk, rec]) => [`${leg} ${k} ${rk}`, recordEndProblem(rec)]).filter(([, why]) => why));
        if (late.length) { console.error(`REFUSED: ${late.length} record(s) ended at or after the hard stop (${late.slice(0, 4).map(([w, why]) => `${w}: ${why}`).join('; ')}); stopped records are never graded`); process.exit(2); }
        const perItem = {};
        for (const key of items) {
            const o = G[key];
            perItem[key] = [];
            for (const arm of ARMS) for (let rep = 1; rep <= L.reps; rep++) {
                const x = answers[`${o.hour}|${arm}|${rep}`][key];
                // No record, or a transient failure after every retry: not graded; the pair leaves the decision (section 4).
                if (!x || x.transientError) { missing.push(`${leg}:${arm}r${rep}:${key}`); continue; }
                if (x.leg !== leg || x.model !== L.model || x.thinking !== L.thinking || x.hour !== o.hour || x.key !== key || x.arm !== arm || x.rep !== rep) throw new Error(`${key} ${arm}r${rep}: the record's hour/leg/model/thinking/arm/rep do not match its slot`);
                // A completed call whose filtered answer is empty is not sent to a grader: decide scores it 0/0/0 (wrong), exactly as the
                // judge's mergeVerdicts scores an undelivered answer. It stays in the pair.
                if (!x.spoken) { empty.push(`${leg}:${arm}r${rep}:${key}`); continue; }
                perItem[key].push({ arm, rep, answer: x.spoken });
            }
            perItem[key] = shuffle(perItem[key], rng(seedFor(o.hour, o.id)));
        }
        const per = PER_FILE[leg];
        for (let i = 0; i < items.length; i += per) files.push({ leg, keys: items.slice(i, i + per), perItem });
    }
    fs.mkdirSync(OUTB, { recursive: true });
    files.forEach(({ leg, keys, perItem }, n) => {
        const list = [], keyMap = {};
        for (const key of keys) {
            const o = G[key];
            const question = graderQuestion(o);
            perItem[key].forEach((e, i) => {
                const k = `${key}#${i + 1}`;
                list.push({ key: k, id: key, kind: 'spoken', level: null, topic: null, question, heard: o.current, source: 'answers-pass', answer: e.answer });
                keyMap[k] = { key, hour: o.hour, id: o.id, arm: e.arm, rep: e.rep, leg };
            });
        }
        if (list.length > MAX_PER_FILE) throw new Error(`blind-${n + 1}: ${list.length} answers, more than ${MAX_PER_FILE}`);
        fs.writeFileSync(path.join(OUTB, `pairs.blind-${n + 1}.json`), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items: list }, null, 1));
        fs.writeFileSync(path.join(OUTB, `key.blind-${n + 1}.json`), JSON.stringify(keyMap, null, 1));
        console.log(`pairs.blind-${n + 1}.json  ${leg}  ${list.length} answers  ${keys.join(',')}`);
    });
    console.log(`${files.length} files (${files.filter((f) => f.leg === 'front').length} front + ${files.filter((f) => f.leg === 'back').length} back); not graded, pair incomplete (transient after retries): ${missing.length ? missing.join(', ') : 'none'}; not graded, scored wrong (empty after the filters): ${empty.length ? empty.join(', ') : 'none'}; instrument ${J.graderPromptVersion()} (pre-registered ${INSTRUMENT})`);
}
