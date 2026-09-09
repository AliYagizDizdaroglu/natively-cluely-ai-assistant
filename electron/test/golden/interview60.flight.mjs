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
 *      snapshot → gate. auto's own preflight still refuses the hour when the
 *      chosen ear is silent; a 429 wall postpones it (45 min deadline).
 *      NATIVELY_STT_PROVIDER=deepgram (set in the environment that launches this
 *      script) runs the hour on Deepgram; auto's preflight refuses the hour if
 *      the app did not start that ear.
 *   3. answer passes on gemini-3.1-flash-lite, gemini-3.5-flash-lite and the
 *      Groq arms, the same 52 questions, prompt and filters, plus the
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
import { rosterLabel, ROSTER_NAME } from './roster.mjs';

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

/** The answers pass writes the default arm to the plain file and every other arm to a model-suffixed one. */
export function answersFileFor(model) {
    return model === ANSWER_MODELS[0] ? 'interview60.answers.json' : `interview60.answers.${model.replace(/\//g, '_')}.json`;
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

    // 3. Three answer arms + chains, into the run folder.
    if (!dry) for (const f of [...ANSWER_MODELS.map(answersFileFor), 'interview60.chains.json']) moveAside(path.join(HERE, f), stamp);
    const answersFiles = [];
    for (const model of ANSWER_MODELS) {
        await run([path.join(HERE, 'interview60.answers.mjs'), '--model', model], { dry });
        const src = path.join(HERE, answersFileFor(model));
        const dest = path.join(runDir, answersFileFor(model));
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
        toGrade: ['interview60.judge.pairs.json', ...ANSWER_MODELS.map((m) => `interview60.judge.pairs.${m}.json`)],
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
