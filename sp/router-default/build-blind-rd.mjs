// Task 14A build-blind-rd.mjs: the blind side-by-side grading export of the router-default run (spec 5 "The grading export", "What is graded"; 10 Grading).
// Based on router40's build-blind-r40.mjs (seeded FNV-1a rng, whole-item file cut, keyhold layout, refusal of a non-registered run folder).
// Inputs (a run folder's two capture files, Task 13): interview60.answers.router-live.json (one entry per Live-shown turn) and
//   interview60.answers.router-shadow.json (the pipeline answer of a Live-shown turn: appended:false hidden, appended:true shown as "(full answer)").
//   Every entry carries `turn`, and (task-5-fix2) `superseded: boolean`, true on BOTH the live and the shadow record of a superseded Live turn.
// Arms (they live only in the key, as `arms`):
//   [L]    the Live text as shown;
//   [S]    the shadow pipeline answer of the SAME TURN (never joined across turns);
//   [S,A]  on an appended turn the appended text, emitted ONCE: it is both the Quality pair's S (spec 5) and the appended pipeline answer shown (No regression);
//   [A]    an appended answer whose turn has no Live text (A alone).
// Live-shown turns whose pipeline text is empty/blank, or that were superseded, are exported as L alone; the key marks them (`sEmpty` / `superseded`)
// so the scorer leaves them out of the Quality bar. Pipeline-shown items are NOT here (the in-app `[Answer] full:` export grades them).
// Items (roster ids with at least one entry) go in roster = chain order, ALL turns of one id together, cut into 4 files of WHOLE items (as even as possible,
// sizes derived from the item count); inside a file the answers are shuffled and keyed q01... Prints counts only, never question or answer text.
//   node build-blind-rd.mjs --run-dir <run folder> [--out-dir <run>\router-blind] [--key-dir <LAB>\keyhold] [--root <checkout holding the roster and judge>]
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LAB = path.dirname(fileURLToPath(import.meta.url));
// The registered run label. The harness names a run folder `<stamp>-<label>` (interview60.run.mjs:598-599, stamp = ISO instant with : and . -> -, cut to 19 chars),
// so the folder name must match ^<stamp>-<label>$ exactly: a smoke, a suffixed (retried) run, a prefix or a bare label is never graded.
// ASSUMPTION (plan names no label): Task 19's registration confirms or changes this one constant (smoke and run labels must differ), then re-run cal-build-blind-rd.mjs.
export const REGISTERED_RUN_LABEL = 'router-default-r1';
export const SEED = 'blind:router-default:r1';
export const N_FILES = 4;
export const runFolderPattern = (label) => new RegExp(`^\\d{4}-\\d\\d-\\d\\dT\\d\\d-\\d\\d-\\d\\d-${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const DEFAULT_ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-d'; // Task 13's approved shape; MAIN once Task 16 lands

const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };

export function rng(seedText) {
    let h = 2166136261;
    for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** n items into N_FILES contiguous slices, sizes differing by at most 1, larger first (10 -> 3,3,2,2). Empty slices are dropped. */
export function cutSizes(n) { const base = Math.floor(n / N_FILES), extra = n % N_FILES; return Array.from({ length: N_FILES }, (_, i) => base + (i < extra ? 1 : 0)).filter((s) => s > 0); }
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const runDirArg = argOf('--run-dir');
    if (!runDirArg) refuse('usage: build-blind-rd.mjs --run-dir <run folder> [--out-dir <dir>] [--key-dir <dir>] [--root <checkout>]');
    const runDir = path.resolve(runDirArg);
    if (!runFolderPattern(REGISTERED_RUN_LABEL).test(path.basename(runDir))) refuse(`only a run folder named <stamp>-<registered run label> is accepted, label "${REGISTERED_RUN_LABEL}" (got "${path.basename(runDir)}"); a smoke, a retried or suffixed run or any other folder is never graded`);
    const ROOT = argOf('--root') ?? DEFAULT_ROOT;
    const OUT = path.resolve(argOf('--out-dir') ?? path.join(runDir, 'router-blind'));
    const KEYDIR = path.resolve(argOf('--key-dir') ?? path.join(LAB, 'keyhold'));
    const keyFile = path.join(KEYDIR, 'key-rd.json'), recFile = path.join(KEYDIR, 'build-record-rd.json');
    if (fs.existsSync(keyFile) || fs.existsSync(recFile)) refuse('the key or build record already exists in the key dir; refusing to overwrite');
    if (fs.existsSync(OUT) && fs.readdirSync(OUT).some((f) => /^pairs\.blind-\d+\.json$/.test(f))) refuse('pairs files already exist in the out dir; refusing to overwrite');
    // the key must never sit where a grader is pointed: not inside the out dir, not inside the run folder
    for (const [what, dir] of [['out dir', OUT], ['run folder', runDir]]) { const rel = path.relative(dir, KEYDIR); if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) refuse(`the key dir is inside the ${what}; the key is never shown to a grader`); }

    const judgeFile = `${ROOT}/electron/test/golden/interview60.judge.mjs`, rosterFile = `${ROOT}/electron/test/golden/live40.questions.mjs`;
    const J = await import(pathToFileURL(judgeFile).href);        // a missing --root fails here, loudly, before anything is written
    const { LIVE40 } = await import(pathToFileURL(rosterFile).href);
    const judgeItems = LIVE40.map((i) => ({ id: i.id, q: i.q, chain: i.chain }));
    const byId = new Map(LIVE40.map((i) => [i.id, i]));

    const readArr = (p) => { if (!fs.existsSync(p)) refuse(`missing capture file ${path.basename(p)}`); const raw = fs.readFileSync(p); let v; try { v = JSON.parse(raw.toString('utf8')); } catch { refuse(`${path.basename(p)} is not JSON`); } if (!Array.isArray(v)) refuse(`${path.basename(p)} is not an array of entries`); return { v, sha: sha256(raw) }; };
    const live = readArr(path.join(runDir, 'interview60.answers.router-live.json')), shadow = readArr(path.join(runDir, 'interview60.answers.router-shadow.json'));

    // validate at the boundary: roster id, integer turn, string text; a Live text must be non-empty (shown=live with no text is an anomaly);
    // a pipeline text may be empty (an aborted or failed pipeline: an understood failure, exported as L alone and counted)
    let noSupersededField = 0;
    const check = (e, where, needText) => {
        if (!e || typeof e !== 'object') refuse(`${where}: an entry is not an object`);
        if (!byId.has(e.id)) refuse(`${where}: entry id ${JSON.stringify(e.id)} (turn ${e.turn}) is not in the roster`);
        if (!Number.isInteger(e.turn)) refuse(`${where}: entry ${e.id} has no integer turn`);
        if (typeof e.text !== 'string' || (needText && !e.text.trim())) refuse(`${where}: entry ${e.id} (turn ${e.turn}) has no text`);
        if (typeof e.superseded !== 'boolean') noSupersededField++;   // a record without the field counts as false; counted so a pre-fix log is visible
    };
    const LT = new Map(), ST = new Map();   // turn -> entry
    const put = (m, e, where) => { if (m.has(e.turn)) refuse(`${where}: duplicate entry for turn ${e.turn} (${e.id} and ${m.get(e.turn).id}); the file is malformed`); m.set(e.turn, e); };
    for (const e of live.v) { check(e, 'router-live', true); put(LT, e, 'router-live'); }
    for (const e of shadow.v) {
        check(e, 'router-shadow', false);
        if (typeof e.appended !== 'boolean') refuse(`router-shadow: entry ${e.id} (turn ${e.turn}) has no boolean "appended" field`);
        if (ST.has(e.turn) && ST.get(e.turn).appended !== e.appended) refuse(`router-shadow: turn ${e.turn} (${e.id}) has both a hidden and an appended pipeline entry; S would be ambiguous`);
        put(ST, e, 'router-shadow');
    }
    for (const [t, s] of ST) { const l = LT.get(t); if (l && l.id !== s.id) refuse(`turn ${t}: the Live entry (${l.id}) and the pipeline entry (${s.id}) are different items; the capture files disagree`); }

    // The superseded set = UNION of (a) the turns named by the run's own diag line `[Router] superseded turn=<id> phase=<streaming|done> line_written=<yes|no>`
    // (authoritative: emitted for every Live-shown turn that was superseded) and (b) the turns whose capture record carries superseded:true. After a supersede that
    // came after Live finished the capture flags read false and the replacing text is in no capture, so the capture flag alone is not enough (arbiter fix3).
    // A log that cannot be read refuses: the set cannot be known.
    const logPath = path.join(runDir, 'natively_debug.log');
    if (!fs.existsSync(logPath)) refuse('missing natively_debug.log in the run folder; the superseded set (the diag lines) cannot be known');
    // Turn ids never repeat inside one app process but a log can hold several: slice the log as router-hour-read.mjs does. Keyed on the session header
    // `=== Natively session started <ISO> ===`: keep only the session whose header is the last one at or before the hour's startedMs (interview60.timeline.json),
    // up to the next header; refuse (exit 2) when no header sits at or before startedMs, or when a second header falls inside the hour (startedMs, endedMs].
    const tlPath = path.join(runDir, 'interview60.timeline.json');
    if (!fs.existsSync(tlPath)) refuse('missing interview60.timeline.json in the run folder; the hour cannot be located in the log');
    let tl; try { tl = JSON.parse(fs.readFileSync(tlPath, 'utf8')); } catch { refuse('interview60.timeline.json is not JSON'); }
    if (!Number.isFinite(tl.startedMs) || !Number.isFinite(tl.endedMs)) refuse('interview60.timeline.json lacks startedMs / endedMs');
    const logLines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/);
    const HDR = /^=== Natively session started (\S+) ===/;
    let from = -1, to = logLines.length;
    logLines.forEach((l, i) => { const m = HDR.exec(l); if (m && Date.parse(m[1]) <= tl.startedMs) from = i; });
    if (from < 0) refuse('the log does not cover the hour: no "=== Natively session started <ISO> ===" line at or before the hour start (a rotation or restart cut the head)');
    logLines.forEach((l, i) => { const m = HDR.exec(l); if (!m) return; const t = Date.parse(m[1]); if (t > tl.startedMs && t <= tl.endedMs) refuse('the app restarted inside the hour (a second session header inside the hour)'); if (i > from && i < to) to = i; });
    const diagTurns = new Set();
    for (const m of logLines.slice(from, to).join('\n').matchAll(/\[Router\] superseded turn=(\d+) phase=(?:streaming|done) line_written=(?:yes|no)\b/g)) diagTurns.add(Number(m[1]));
    const flagTurns = new Set([...LT.values(), ...ST.values()].filter((e) => e.superseded === true).map((e) => e.turn));
    const supTurns = new Set([...diagTurns, ...flagTurns]);
    const diagOnly = [...diagTurns].filter((t) => !flagTurns.has(t));

    // per item (roster order), per turn
    const entriesOf = new Map(); // id -> sorted turn list
    for (const t of new Set([...LT.keys(), ...ST.keys()])) { const id = (LT.get(t) ?? ST.get(t)).id; (entriesOf.get(id) ?? entriesOf.set(id, []).get(id)).push(t); }
    const perItem = [];
    const n = { L: 0, S: 0, A: 0, sa: 0, sEmpty: 0, superseded: 0, liveNoPipeline: 0, shadowOnly: 0, multiTurnIds: 0 };
    for (const it of LIVE40) {
        const id = it.id, turns = (entriesOf.get(id) ?? []).sort((a, b) => a - b);
        if (!turns.length) continue;
        const q = J.questionForGrader(judgeItems.find((x) => x.id === id), judgeItems);
        if (it.level === 'followup') { if (!q.includes(' [Follow-up to: ')) throw new Error(`${id}: a follow-up without its parent text`); } else if (q !== it.q) throw new Error(`${id}: a main, but the grader question was decorated`);
        const list = [];
        const push = (arms, e, extra = {}) => { list.push({ arms, id, question: q, heard: it.q, answer: e.text, turn: e.turn, ...extra }); };
        let liveTurns = 0;
        for (const t of turns) {
            const l = LT.get(t), s = ST.get(t);
            const sup = supTurns.has(t);
            const blank = !s || !s.text.trim();
            if (l) {
                liveTurns++;
                const rank = liveTurns;
                if (sup) { push(['L'], l, { rank, superseded: true }); n.L++; n.superseded++; }                                   // the shadow text replaced the Live answer and was SHOWN: not an S
                else if (!s) { push(['L'], l, { rank }); n.L++; n.liveNoPipeline++; }                                              // Live with no pipeline answer at all
                else if (blank) { push(['L'], l, { rank, sEmpty: true }); n.L++; n.sEmpty++; }                                      // pipeline failed or aborted before a token
                else if (s.appended) { push(['L'], l, { rank }); push(['S', 'A'], s, { rank }); n.L++; n.S++; n.A++; n.sa++; }       // I3: the appended text ONCE, mapped to both arms
                else { push(['L'], l, { rank }); push(['S'], s, { rank }); n.L++; n.S++; }
            } else if (s.appended && !blank && !sup) { push(['A'], s); n.A++; }                                                   // an appended answer with no Live text: A alone
            else if (!s.appended) n.shadowOnly++;
        }
        if (liveTurns > 1) n.multiTurnIds++;
        if (list.length) perItem.push({ id, list });
    }
    if (!perItem.length) refuse('nothing to export: no Live-shown turn and no appended answer in the run');

    const sizes = cutSizes(perItem.length);
    fs.mkdirSync(OUT, { recursive: true });
    fs.mkdirSync(KEYDIR, { recursive: true });
    const key = {}; let at = 0;
    sizes.forEach((sz, f) => {
        const tag = `blind-${f + 1}`;
        const flat = perItem.slice(at, at + sz).flatMap((p) => p.list); at += sz;
        shuffle(flat, rng(SEED)); // a fresh stream per file, the one registered seed
        const items = [], km = {};
        flat.forEach((x, i) => {
            const k = `q${String(i + 1).padStart(2, '0')}`;
            items.push({ key: k, id: k, kind: 'spoken', level: null, topic: null, question: x.question, heard: x.heard, source: 'answers-pass', answer: x.answer });
            const it = byId.get(x.id);
            km[k] = { arms: x.arms, id: x.id, route: it.route, class: it.class, parent: it.parent ?? null, turn: x.turn, ...(x.rank ? { rank: x.rank } : {}), ...(x.sEmpty ? { sEmpty: true } : {}), ...(x.superseded ? { superseded: true } : {}) };
        });
        fs.writeFileSync(path.join(OUT, `pairs.${tag}.json`), JSON.stringify({ model: J.JUDGE_MODEL, rubric: J.RUBRIC, items }, null, 1));
        key[tag] = km;
    });
    fs.writeFileSync(recFile, JSON.stringify({ seed: SEED, runLabel: REGISTERED_RUN_LABEL, runFolder: path.basename(runDir), liveSha256: live.sha, shadowSha256: shadow.sha, rosterSha256: sha256(fs.readFileSync(rosterFile)), judgeSha256: sha256(fs.readFileSync(judgeFile)), sizes, instrument: J.graderPromptVersion() }, null, 1));
    fs.writeFileSync(keyFile, JSON.stringify(key, null, 1));
    console.log(`built ${sizes.length} files (${sizes.join('/')} items, ${perItem.length} items); Live turns ${n.L}; pipeline entries S ${n.S} (of them appended, one answer mapped to S and A: ${n.sa}), A ${n.A}`
        + `; ids with more than one Live turn ${n.multiTurnIds}; empty pipeline answer ${n.sEmpty}; superseded ${n.superseded}; live without a pipeline answer ${n.liveNoPipeline}; shadow-only (not exported) ${n.shadowOnly}`
        + `; superseded sources: diag line turns ${diagTurns.size}; capture flag true ${flagTurns.size}; union ${supTurns.size}; found only by the diag line ${diagOnly.length} (turns ${diagOnly.sort((a, b) => a - b).join(',') || '-'})`
        + `; records without superseded field ${noSupersededField}; instrument ${J.graderPromptVersion()}`);
}
