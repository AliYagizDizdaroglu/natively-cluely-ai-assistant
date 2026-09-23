/**
 * Unattended flight: the whole after-run sequence from a scheduled task, no
 * hands. Probe the Live ear, pick the Live model, run the auto hour, then the
 * three-arm answer passes, the chains pass and the judge exports, and leave a
 * done-marker in the run folder listing what is left to grade.
 *
 *   node electron/test/golden/interview60.flight.mjs [label=after] [--dry-run]
 *
 * Steps, each logged to interview60.run.flight.log with UTC timestamps:
 *   1. live-probe: the app's exact Live session config against the probe clip.
 *      A tool call → the default model (gemini-3.1-flash-live-preview); silence
 *      → NATIVELY_LIVE_MODEL=gemini-2.5-flash-native-audio-latest for the hour,
 *      because 3.x has been seen to exhaust a daily allowance silently
 *      (connects, transcribes, never calls the tool). A connection failure
 *      aborts before anything is spent.
 *   2. auto <label>: stop → build → start → probe → preflight → hour →
 *      snapshot → gate → stop. auto's own preflight still refuses the hour when the
 *      chosen ear is silent; a 429 wall postpones it (45 min deadline).
 *      NATIVELY_STT_PROVIDER=deepgram (set in the environment that launches this
 *      script) runs the hour on Deepgram; auto's preflight refuses the hour if
 *      the app did not start that ear.
 *   3. answer passes on gemini-3.1-flash-lite, gemini-3.5-flash-lite and the
 *      Groq arms, the same 52 questions, prompt and filters, then the focused
 *      Flash arms and the two PAIRED_ARMS (the hour's captured prompts at the
 *      pre-bench level, the bare prompt at the shipped LOW level), plus the
 *      chains pass, all copied into the run folder. Earlier answers/chains
 *      files are moved aside first: the passes resume from an existing file,
 *      and resuming from yesterday's answers would score yesterday's model.
 *   4. judge --export for the hour's own answers and for each answers file,
 *      so grading (an Opus subagent, no API key) can start the moment someone
 *      is back. interview60.flight.done.json in the run folder lists them.
 *
 * --dry-run logs every command it would run and executes none of them: the
 * way to prove a scheduled task reaches this script with the right cwd, node
 * and log file before trusting it with the hour. Scheduling: README,
 * "Unattended flight".
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { INTERVIEW, rosterLabel, ROSTER_NAME } from './roster.mjs';

export const LIVE_DEFAULT = 'gemini-3.1-flash-live-preview';
export const LIVE_FALLBACK = 'gemini-2.5-flash-native-audio-latest';
// The first is the app's answer model; the rest are comparison arms. Ids with a "/" run
// on Groq (answers.mjs; with a placeholder GROQ_API_KEY the pass exits 3 in seconds and
// the flight goes on without that file). Both Gemma arms are deliberately absent.
// gemma-4-26b-a4b-it: the 2026-09-08 probe leaked its planning text into the spoken
// answer and one answer ran 11 min to MAX_TOKENS. gemma-4-31b-it: 49, then 37, then 35
// acceptable of 52 across after7/8/9 under the frozen grader, with 4 answers degenerating
// into repeated tokens and 16 truncating mid-word, at 19.4s to first token. Re-measuring
// a model already ruled out costs an hour of flight time and holds the judge exports.
export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];

/**
 * Focused arms: the non-lite Flash models, whose free tier allows a handful of calls a day,
 * on the questions the app got wrong LAST flight — every other part of the call (prompt,
 * user text, filters, temperature) identical to the lite arm above. If a Flash model clears
 * them, the model is the next lever; if it does not, the misses are the questions', not the
 * model's.
 *
 * Re-picked from s50j (2026-09-20). Shipping thinking LOW solved three of the previous five:
 * S2Q07, S2Q09 and S2Q10 were answered acceptably by ALL SIX app-bytes arms, so the focused
 * models were spending 20 calls a day on questions nothing could fail. A focused arm exists to
 * SEPARATE models, so its questions have to be ones the arms disagree on.
 *
 * Ranked on the captured prompt, because that is what a focused arm replays — a question that
 * is only hard on the bare scripted text would be an easy one here. Across s50j's six app-bytes
 * arms (in-app, three 3.1-LOW twins, 3.1 at no thinking, 3.5-lite at HIGH):
 *   S1Q02  2 of 6  the CV precision/recall reconciliation — wrong 10 of 10 at MINIMAL, and
 *                  LOW only rescues it about a third of the time
 *   S1Q08  3 of 6  delayed outcomes and experiment assignment; the assignment half is the part
 *                  arms drop
 *   S2Q02  4 of 6  per-metric units, denominators and uncertainty — answered with robustness
 *                  checks instead of an interval
 *   S1Q07  4 of 6  the platform design; LangSmith gets misplaced as a tabular-drift monitor
 *   S1Q06  KEPT AS A CONTROL, not as a target — see below.
 *
 * S1Q06 stays because a control is a different job from a target: 9 of 10 arms pass it on
 * captured bytes (and it still splits the bare arms 2 of 6), so an arm that fails it is a
 * broken arm rather than a hard question, and that reading is what makes the four targets
 * trustworthy. Do not drop it for being easy; being easy is the point. Its older rationale —
 * "the one question where model size is proven" — no longer holds on captured bytes, where the
 * lite arms went 6 of 6 and big Flash 3 of 4.
 *
 * Re-pick this after a flight by scoring every main across that hour's app-bytes arms; do not
 * let it go stale again.
 */
export const FOCUSED_ONLY = 'S1Q02,S1Q08,S2Q02,S1Q07,S1Q06';
export const FOCUSED_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

/**
 * Paired arms (2026-09-18): the hour's own experiment, on the two Flash Lites.
 *
 * The 2026-09-17 bench showed the thinking-level effect (+21 acceptable on 117 pairs) and the
 * app-context tax (+6 on 57) only in PAIRED grading on the same bytes; unpaired arms across
 * hours sit inside the ±4 noise. These arms give every flight its own pairs, all answered
 * minutes after the hour so nothing is compared across times of day:
 *
 *   on the app answer model (gemini-3.1-flash-lite)
 *     captured-minimal  the hour's captured prompts (system + user turn, all items, follow-ups
 *                       included) with no thinkingConfig — the provider default the app sent
 *                       through s50f. in-app vs this = the level, same bytes.
 *     captured-low      the same captured prompts at LOW, the shipped level: the offline twin of
 *                       the hour itself. in-app vs this = what the app pipeline adds on top of a
 *                       raw API call; and it is the like-for-like partner for captured-high.
 *                       RUN THREE TIMES (-r2, -r3) since 2026-09-19: s50i put the live hour at
 *                       28/39 against this arm's 33/39 on identical bytes, same model, same
 *                       level, but at one sample a side against a ±4 bench floor. The three reps
 *                       measure the twin's own rep-to-rep spread, and that band is what the live
 *                       hour has to fall outside before the gap counts as a pipeline defect
 *                       rather than sampling. Only the tag differs between them.
 *     low               the bare verbal prompt at LOW. in-app vs this = the app context at the
 *                       shipped level; low vs the plain bare arm = the level on bare bytes.
 *
 *   on gemini-3.5-flash-lite, the stall-fallback model (2026-09-18 bench: it does NOT honour
 *   LOW — probes reported no thought tokens on 3 of 4 calls — and at HIGH it TIED 3.1 at LOW on
 *   quality, +3 on 117 pairs, while answering far shorter: words p50 74 vs 95. Its apparent
 *   latency edge could not be believed, because those arms ran at 03:00 and the 3.1 arms at
 *   10:05. These two arms settle that in the same window.)
 *     captured-high     captured prompts at HIGH — pairs with captured-low on app bytes
 *     high              the bare verbal prompt at HIGH — pairs with low on bare bytes
 *
 * ~155 lite calls, split across the two models' separate quotas. Captured arms are skipped,
 * loudly, when the hour left no capture.
 */
export const PAIRED_ARMS = [
    { model: ANSWER_MODELS[0], tag: 'low', captured: false, args: ['--thinking', 'LOW'] },
    { model: ANSWER_MODELS[0], tag: 'captured-minimal', captured: true, args: [] },
    { model: ANSWER_MODELS[0], tag: 'captured-low', captured: true, args: ['--thinking', 'LOW'] },
    { model: ANSWER_MODELS[0], tag: 'captured-low-r2', captured: true, args: ['--thinking', 'LOW'] },
    { model: ANSWER_MODELS[0], tag: 'captured-low-r3', captured: true, args: ['--thinking', 'LOW'] },
    { model: ANSWER_MODELS[1], tag: 'captured-high', captured: true, args: ['--thinking', 'HIGH'] },
    // Three reps of the 3.5 HIGH twin as well (s50k): s50j's single captured-high scored 35 of 39
    // against the 3.1-LOW band of 29-33, which is +6 against the worst rep and +2 against the band
    // — a model decision needs its own band on the same bytes, same window, not one arm.
    { model: ANSWER_MODELS[1], tag: 'captured-high-r2', captured: true, args: ['--thinking', 'HIGH'] },
    { model: ANSWER_MODELS[1], tag: 'captured-high-r3', captured: true, args: ['--thinking', 'HIGH'] },
    { model: ANSWER_MODELS[1], tag: 'high', captured: false, args: ['--thinking', 'HIGH'] },
];

/**
 * The spoken roster items the hour captured a replayable prompt for (system + user turn).
 * answers.mjs --captured refuses any id without one rather than inventing its framing, and an
 * hour rarely captures every item (s50e 39 of 40, s50f 38 of 40), so the captured arm is
 * pointed at exactly these with --only.
 */
export function capturedOnly(captured, items = INTERVIEW) {
    return items.filter((i) => (i.kind ?? 'spoken') === 'spoken' && captured[i.id]?.system && captured[i.id]?.user).map((i) => i.id);
}

/**
 * The Live model for the hour, from the probe's exit code: 0 (tool call seen)
 * → the default 3.x; 2 (no Gemini key in the env) → null, abort; anything
 * else → the 2.5 fallback. 3 is the silent case, but a 3.x session that dies
 * mid-clip on an explicit quota close (exit 1) wants the fallback just the
 * same — and if 2.5 is dead too, auto's own preflight refuses the hour, so
 * falling back can never spend it on a broken ear.
 */
export function chooseLiveModel(probeExit) {
    if (probeExit === 0) return LIVE_DEFAULT;
    if (probeExit === 2) return null;
    return LIVE_FALLBACK;
}

/**
 * The run folder auto() just wrote: the newest `<stamp>-<label>` whose stamp
 * is at or after the flight's start, so a folder from an earlier day with the
 * same label is never mistaken for this hour. Stamps are ISO instants with
 * ':' and '.' replaced by '-', which sort as text.
 */
export function newestRunDir(names, label, startedAtIso) {
    const since = startedAtIso.replace(/[:.]/g, '-').slice(0, 19);
    return names.filter((n) => n.endsWith(`-${label}`) && n.slice(0, 19) >= since).sort().pop() ?? null;
}

/**
 * The answers pass writes the default arm to the plain file and every other arm — another
 * model, or a --tag variant of the default model — to a suffixed one, `<model>[_<tag>]`
 * with "/" as "_", exactly as answers.mjs names it.
 */
export function answersFileFor(model, tag = '') {
    const arm = tag ? `${model}_${tag}` : model;
    return arm === ANSWER_MODELS[0] ? 'interview60.answers.json' : `interview60.answers.${arm.replace(/\//g, '_')}.json`;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const RUNS_DIR = path.join(HERE, 'interview60.runs');
const LOG = path.join(HERE, 'interview60.run.flight.log');

const log = (m) => {
    const line = `${new Date().toISOString()} ${m}`;
    console.log(line);
    fs.appendFileSync(LOG, line + '\n');
};

/** Runs `node <args>` from the project root with stdout/stderr appended to the flight log; resolves to the exit code. */
function run(args, { env = {}, dry = false } = {}) {
    const shown = `node ${args.map((a) => path.relative(PROJ, a) || a).join(' ')}`;
    const envShown = Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ');
    log(`RUN   ${shown}${envShown ? '   env ' + envShown : ''}`);
    if (dry) return Promise.resolve(0);
    return new Promise((resolve) => {
        const out = fs.openSync(LOG, 'a');
        const child = spawn(process.execPath, args, {
            cwd: PROJ,
            // npm (auto's build step) lives beside node.exe; a scheduled task's PATH may not say so.
            env: { ...process.env, PATH: `${path.dirname(process.execPath)};${process.env.PATH ?? ''}`, ...env },
            stdio: ['ignore', out, out],
        });
        child.on('exit', (code) => { fs.closeSync(out); log(`EXIT  ${code}   ${shown}`); resolve(code ?? 1); });
        child.on('error', (e) => { fs.closeSync(out); log(`ERROR ${e.message}   ${shown}`); resolve(1); });
    });
}

/** Moves an earlier generated file aside (never deletes): the passes resume from whatever file exists. */
function moveAside(file, stamp) {
    if (!fs.existsSync(file)) return;
    const aside = file.replace(/\.json$/, `.stale-${stamp}.json`);
    fs.renameSync(file, aside);
    log(`ASIDE ${path.basename(file)} → ${path.basename(aside)}`);
}

/** The commit that flew — recorded in done.json so the pass record names the code it measured. */
function gitHead() {
    try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: PROJ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

async function main() {
    const args = process.argv.slice(2);
    const dry = args.includes('--dry-run');
    const label = args.find((a) => !a.startsWith('--')) ?? 'after';
    const startedAt = new Date().toISOString();
    const commit = gitHead();
    const stamp = startedAt.replace(/[:.]/g, '-').slice(0, 19);
    log(`FLIGHT ${label} start${dry ? ' — DRY RUN, nothing is executed' : ''}   node ${process.version}   cwd ${PROJ}`);
    // Which stimulus produced this folder. Without it a run folder is uninterpretable
    // the moment a second roster exists.
    log(`ROSTER ${rosterLabel()}`);
    if (!fs.existsSync(path.join(PROJ, '.env'))) { log('ABORT no .env beside package.json — the probe and the passes read the Gemini key from it'); return 2; }

    // 1. Which Live ear.
    const probeExit = await run(['--env-file=.env', path.join(HERE, 'interview60.live-probe.cjs')], { dry });
    const liveModel = dry ? LIVE_DEFAULT : chooseLiveModel(probeExit);
    if (!liveModel) { log(`ABORT live probe exit ${probeExit}: no Gemini key reached the probe; nothing spent`); return 2; }
    log(`LIVE  ${liveModel}${liveModel === LIVE_FALLBACK ? `   (probe exit ${probeExit}: 3.x never called the tool — its daily allowance is spent, or the session died)` : ''}`);
    log(`STT   ${process.env.NATIVELY_STT_PROVIDER ?? "the app's saved provider"}${process.env.NATIVELY_STT_PROVIDER ? "   (NATIVELY_STT_PROVIDER; preflight checks the app's STT start line)" : ''}`);
    const liveEnv = liveModel === LIVE_DEFAULT ? {} : { NATIVELY_LIVE_MODEL: liveModel };

    // 2. The hour.
    const autoExit = await run([path.join(HERE, 'interview60.run.mjs'), 'auto', label], { env: liveEnv, dry });
    let runDir;
    if (dry) runDir = path.join(RUNS_DIR, `${stamp}-${label}`);
    else {
        const name = newestRunDir(fs.existsSync(RUNS_DIR) ? fs.readdirSync(RUNS_DIR) : [], label, startedAt);
        if (!name) { log(`ABORT auto exit ${autoExit} and no run folder "*-${label}" stamped since ${stamp}: the hour did not run (auto's output above says why)`); return 1; }
        runDir = path.join(RUNS_DIR, name);
    }
    log(`RUN-DIR ${runDir}   (auto exit ${autoExit}; 1 means the gate failed — its table is above)`);

    // 3. Answer arms (full, then the focused Flash arms) + chains, into the run folder.
    if (!dry) for (const f of [...ANSWER_MODELS.map((m) => answersFileFor(m)), ...FOCUSED_MODELS.map((m) => answersFileFor(m)), ...PAIRED_ARMS.map((a) => answersFileFor(a.model, a.tag)), 'interview60.chains.json']) moveAside(path.join(HERE, f), stamp);
    const answersFiles = [];
    // The focused arms replay the app's OWN call for those questions — same system
    // instruction, same user turn, same résumé context and transcript, only the model id
    // differs — so a Flash win predicts what the app would do rather than what a bare prompt
    // does. Built from the hour that just ran; if the capture is missing the arms fall back
    // to their own framing, which is a DIFFERENT experiment, so the fallback is logged loudly
    // and recorded in the done file.
    const promptsFile = path.join(runDir, 'interview60.prompts.json');
    const promptsExit = await run([path.join(HERE, 'interview60.prompts.mjs'), runDir], { dry });
    const focusedCaptured = dry || (promptsExit === 0 && fs.existsSync(promptsFile));
    if (!focusedCaptured) log('WARN  no captured prompts — the focused arms will send their own framing, NOT the app\'s call');
    const focusedArgs = ['--only', FOCUSED_ONLY, ...(focusedCaptured ? ['--captured', promptsFile] : [])];
    const capturedIds = focusedCaptured && !dry ? capturedOnly(JSON.parse(fs.readFileSync(promptsFile, 'utf8'))) : [];
    if (focusedCaptured && !dry) log(`paired captured arm: ${capturedIds.length} spoken items have a replayable prompt this hour`);
    for (const a of PAIRED_ARMS) if (a.captured && !(focusedCaptured && (dry || capturedIds.length))) log(`WARN  paired arm ${a.tag} skipped — it replays the hour's captured prompts and there are none`);
    const paired = PAIRED_ARMS.filter((a) => !a.captured || (focusedCaptured && (dry || capturedIds.length)))
        .map((a) => ({ model: a.model, tag: a.tag, args: ['--tag', a.tag, ...a.args, ...(a.captured ? ['--captured', promptsFile, ...(dry ? [] : ['--only', capturedIds.join(',')])] : [])] }));
    const arms = [...ANSWER_MODELS.map((model) => ({ model, args: [] })), ...FOCUSED_MODELS.map((model) => ({ model, args: focusedArgs })), ...paired];
    for (const { model, tag, args } of arms) {
        await run([path.join(HERE, 'interview60.answers.mjs'), '--model', model, ...args], { dry });
        const src = path.join(HERE, answersFileFor(model, tag));
        const dest = path.join(runDir, answersFileFor(model, tag));
        if (dry) { answersFiles.push(dest); continue; }
        if (!fs.existsSync(src)) { log(`WARN  no answers file for ${model} — the pass wrote nothing`); continue; }
        fs.copyFileSync(src, dest);
        answersFiles.push(dest);
    }
    await run([path.join(HERE, 'interview60.chains.mjs')], { dry });
    const chains = path.join(HERE, 'interview60.chains.json');
    if (!dry && fs.existsSync(chains)) fs.copyFileSync(chains, path.join(runDir, 'interview60.chains.json'));

    // 4. Judge exports: the hour's own answers, then each arm.
    const judge = path.join(HERE, 'interview60.judge.mjs');
    await run([judge, runDir, '--export'], { dry });
    for (const f of answersFiles) await run([judge, runDir, '--answers', f, '--export'], { dry });

    const done = {
        label, roster: ROSTER_NAME, rosterLabel: rosterLabel(), startedAt, finishedAt: new Date().toISOString(), liveModel, autoExit, runDir, answersFiles,
        commit, stt: process.env.NATIVELY_STT_PROVIDER ?? null,
        // 'captured' = the focused arms replayed the app's own system + user turn; 'own-framing'
        // = they sent the arm's bare question text, which is not the same experiment.
        focusedPrompts: focusedCaptured ? 'captured' : 'own-framing', focusedOnly: FOCUSED_ONLY,
        pairedArms: paired.map((a) => a.tag),
        toGrade: ['interview60.judge.pairs.json', ...ANSWER_MODELS.map((m) => `interview60.judge.pairs.${m}.json`), ...paired.map((a) => `interview60.judge.pairs.${a.model}_${a.tag}.json`)],
        next: 'grade each pairs file with its rubric into interview60.judge.verdicts[.<model>].json, then interview60.judge.mjs <run> [--answers <file>] --verdicts <that file>',
    };
    if (!dry) fs.writeFileSync(path.join(runDir, 'interview60.flight.done.json'), JSON.stringify(done, null, 1));
    // 5. The pass record: passes/<run>.md and passes/INDEX.md, ungraded until the judge
    //    files are merged (interview60.judge.mjs regenerates it then).
    await run([path.join(HERE, 'interview60.pass-record.mjs'), runDir], { dry });
    log(`DONE  ${label}   ${dry ? 'dry run complete' : 'wrote ' + path.join(runDir, 'interview60.flight.done.json')}`);
    return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().then((code) => process.exit(code)).catch((e) => { log(`FATAL ${e?.stack ?? e}`); process.exit(1); });
}
