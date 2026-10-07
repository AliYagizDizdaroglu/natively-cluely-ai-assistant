/**
 * Unattended flight: the whole after-run sequence from a scheduled task, no
 * hands. Probe the Live ear, pick the Live model, run the auto hour, then the
 * answer passes, the chains pass and the judge exports, and leave a
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
 *   3. answer passes on gemini-3.1-flash-lite and gemini-3.5-flash-lite, the
 *      roster's questions, prompt and filters, then the focused Flash arms
 *      and the paired arms (PAIRED_ARMS below: the hour's captured prompts
 *      and the bare prompt, on both Flash Lites, at the levels and
 *      repetitions listed there), plus the
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
// The first is the selected model (the stall race's first leg, the hedge's back leg), the second is
// the hedge's front leg (the stall race's fallback). Since the hedge became the default (h40c,
// 2026-09-29) the hour answers with the second first; the arms are unchanged. The Groq comparison arms
// (qwen/qwen3.8-27b, openai/gpt-oss-120b) were dropped from the flight at the user's
// request on 2026-09-26 — answers.mjs still runs a Groq id by hand (ids with a "/";
// with a placeholder GROQ_API_KEY that pass exits 3 in seconds). Both Gemma arms are
// deliberately absent. gemma-4-26b-a4b-it: the 2026-09-08 probe leaked its planning text
// into the spoken answer and one answer ran 11 min to MAX_TOKENS. gemma-4-31b-it: 49, then
// 37, then 35 acceptable of 52 across after7/8/9 under the frozen grader, with 4 answers
// degenerating into repeated tokens and 16 truncating mid-word, at 19.4s to first token.
// Re-measuring a model already ruled out costs an hour of flight time and holds the judge
// exports.
export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];

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
export const FOCUSED_ONLY_BY_ROSTER = { scenario50: 'S1Q02,S1Q08,S2Q02,S1Q07,S1Q06' };

/**
 * The focused five for the roster the hour runs, or null when it has none. answers.mjs exits 2
 * on --only ids outside its roster and the flight tolerates a missing answers file with one
 * WARN, so scenario50's ids on another roster would fail all four focused arms by accident and
 * read as four accidents in the pass record. No pick means the arms are skipped, once, in the
 * log. holdout40 picks its five after its baseline hour ranks the mains, as scenario50's were
 * re-picked from s50j.
 */
export const focusedOnlyFor = (roster) => FOCUSED_ONLY_BY_ROSTER[roster] ?? null;

/**
 * The focused five for this hour, honouring NATIVELY_FLIGHT_FOCUSED (flight-eq ruling 3, the
 * earlier-question hour spends no full-Flash quota): exactly 'off' skips the focused arms (null);
 * unset or empty is focusedOnlyFor(roster), unchanged; any other value throws, so a typo can
 * neither fly nor silently skip the arms. main() turns the throw into exit 2.
 */
export const focusedFor = (roster, env) => {
    const v = env.NATIVELY_FLIGHT_FOCUSED;
    if (v === 'off') return null;
    if (v === undefined || v === '') return focusedOnlyFor(roster);
    throw new Error(`NATIVELY_FLIGHT_FOCUSED=${JSON.stringify(v)} is not recognised: set it to "off" or leave it unset`);
};
export const FOCUSED_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

/**
 * Paired arms (2026-09-18): the hour's own experiment, on the two Flash Lites.
 *
 * The 2026-09-17 bench showed the thinking-level effect (+21 acceptable on 117 pairs) and the
 * app-context tax (+6 on 57) only in PAIRED grading on the same bytes; unpaired arms across
 * hours sit inside the ±4 noise. These arms give every flight its own pairs, all answered
 * minutes after the hour so nothing is compared across times of day:
 *
 *   on gemini-3.1-flash-lite, the selected app model (the stall race's first leg, the hedge's back leg;
 *   in-app vs these arms is a same-model read only with NATIVELY_VERBAL_HEDGE=0)
 *     captured-minimal  the hour's captured prompts (system + user turn, all items, follow-ups
 *                       included) with no thinkingConfig — the provider default the app sent
 *                       through s50f. in-app vs this = the level, same bytes, but only with
 *                       NATIVELY_VERBAL_HEDGE=0: under the hedge default (h40c, 2026-09-29) the
 *                       hour answers with 3.5-lite HIGH first, so it no longer isolates the level.
 *     captured-low      the same captured prompts at LOW, the shipped level: the offline twin of
 *                       the hour itself under NATIVELY_VERBAL_HEDGE=0. Since the hedge became the
 *                       default (h40c, 2026-09-29) the hour answers with 3.5-lite HIGH first, so
 *                       captured-high is the twin of the answers 3.5-lite won; a 3.1-lite win (its
 *                       won-by line) pairs with captured-low. The arms themselves are unchanged.
 *                       in-app vs this = what the app pipeline adds on top of a raw API call; and
 *                       it is the like-for-like partner for captured-high.
 *                       RUN THREE TIMES (-r2, -r3) since 2026-09-19: s50i put the live hour at
 *                       28/39 against this arm's 33/39 on identical bytes, same model, same
 *                       level, but at one sample a side against a ±4 bench floor. The three reps
 *                       measure the twin's own rep-to-rep spread, and that band is what the live
 *                       hour has to fall outside before the gap counts as a pipeline defect
 *                       rather than sampling. Only the tag differs between them.
 *     low               the bare verbal prompt at LOW. in-app vs this = the app context at the
 *                       shipped level; low vs the plain bare arm = the level on bare bytes.
 *
 *   on gemini-3.5-flash-lite, the hedge's front leg, the stall race's fallback under
 *   NATIVELY_VERBAL_HEDGE=0 (2026-09-18 bench: it does NOT honour
 *   LOW — probes reported no thought tokens on 3 of 4 calls — and at HIGH it TIED 3.1 at LOW on
 *   quality, +3 on 117 pairs, while answering far shorter: words p50 74 vs 95. Its apparent
 *   latency edge could not be believed, because those arms ran at 03:00 and the 3.1 arms at
 *   10:05. These two arms settle that in the same window.)
 *     captured-high     captured prompts at HIGH — pairs with captured-low on app bytes
 *     high              the bare verbal prompt at HIGH — pairs with low on bare bytes
 *     captured-no-cues-high
 *                       captured-high's no-cue twin: same model, same level, same bytes, only the
 *                       cue rule stripped (answers.mjs --no-cues; cue mode, spec 2026-09-20 §8).
 *                       RUN THREE TIMES (-r2, -r3) like the other twins, and only on an hour that
 *                       flew with cues (hasCueRule). Under the hedge default (h40c, 2026-09-29)
 *                       3.5-lite HIGH writes almost every answer (44 of 45), so the cue-vs-no-cue
 *                       band has to be read on that model; 3.1-lite is only the back leg.
 *
 * ~155 lite calls, split across the two models' separate quotas. Captured arms are skipped,
 * loudly, when the hour left no capture.
 */
/**
 * Cue mode (spec 2026-09-20): the header line of the shipped CUE_RULE, read out of the hour's
 * captured system prompts to tell a cue hour from a pre-cue one. A string rather than an
 * import of the built prompts, so the flight plans without a dist; the flight test pins it
 * against the real constant.
 *
 * Per id (bundle-1 SPEC 3.2, R6): since the cue gate (cueRuleApplies) sends no cue rule for a short
 * single-part question, EVERY real hour is mixed on purpose. cueRuleIds is the replayable ids
 * (what capturedOnly would replay) whose captured system carries the mark; the no-cue twins are
 * pointed at exactly those with --only, so answers.mjs --no-cues never meets an id without the
 * rule. hasCueRule is true when there is at least one such id; with none the twins skip cleanly.
 */
export const CUE_RULE_MARK = '[CUES FIRST]';
export const cueRuleIds = (captured) => capturedOnly(captured).filter((id) => String(captured[id].system ?? '').includes(CUE_RULE_MARK));
export const hasCueRule = (captured) => cueRuleIds(captured).length > 0;

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
    // Cue mode (spec 2026-09-20 §8): captured-high's no-cue twins, three reps, on the hedge's front
    // leg (the doc block above says why). Gated on the bytes: on a pre-cue hour captured-high
    // already is the no-cue band, and answers.mjs would refuse the variant anyway; the flight
    // skips the arms with one log line instead.
    { model: ANSWER_MODELS[1], tag: 'captured-no-cues-high', captured: true, args: ['--thinking', 'HIGH', '--no-cues'], when: hasCueRule, only: cueRuleIds },
    { model: ANSWER_MODELS[1], tag: 'captured-no-cues-high-r2', captured: true, args: ['--thinking', 'HIGH', '--no-cues'], when: hasCueRule, only: cueRuleIds },
    { model: ANSWER_MODELS[1], tag: 'captured-no-cues-high-r3', captured: true, args: ['--thinking', 'HIGH', '--no-cues'], when: hasCueRule, only: cueRuleIds },
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

/**
 * NATIVELY_FLIGHT_ARMS (live-router plan Task 13): a comma list of paired-arm tags. Set, it returns exactly those
 * arms from `arms` in that order; unset or empty returns `arms` unchanged. An unknown, duplicated or empty tag
 * throws, so a typo can neither fly the wrong arm nor silently skip one. main() calls it before anything is spent.
 */
export function selectArms(arms, env) {
    const raw = env.NATIVELY_FLIGHT_ARMS;
    if (raw === undefined || raw === '') return arms;
    const known = new Map(arms.map((a) => [a.tag, a]));
    const seen = new Set();
    return raw.split(',').map((t) => {
        const tag = t.trim();
        if (!known.has(tag)) throw new Error(`NATIVELY_FLIGHT_ARMS names ${JSON.stringify(tag)}, which is not an arm tag. Known: ${[...known.keys()].join(', ')}`);
        if (seen.has(tag)) throw new Error(`NATIVELY_FLIGHT_ARMS names ${JSON.stringify(tag)} twice`);
        seen.add(tag);
        return known.get(tag);
    });
}

/**
 * Everything main() derives from the arms, as one pure function, so the selection (I5) reaches the file moves, the
 * arms loop, the judge exports and done.toGrade from the SAME list.
 *   arms       the answers.mjs passes to run, in order ({ model, args, tag? }; untagged = ANSWER_MODELS / focused)
 *   paired     the tagged arms among them (done.pairedArms and the judge pair files come from it)
 *   skipped    selected-or-default paired arms that cannot fly this hour: [{ tag, why: 'no-capture' | 'no-cue-rule' }]
 *   moveAside  answers file NAMES to move aside before the passes (the passes resume from an existing file)
 *   toGrade    judge pair file names to grade
 * NATIVELY_FLIGHT_ARMS set: only the selected paired arms; no ANSWER_MODELS, focused or chains pass; their files only.
 * Unset: byte-identical to what main() built inline before this function existed (pinned against a snapshot).
 * `capturedJson` is the hour's captured prompts, or null when there are none (not a dry run); `dry` skips the capture gates.
 * @param {Record<string, string | undefined>} env
 * @param {Record<string, any> | null} capturedJson
 * @param {boolean} dry
 * @param {{ promptsFile: string, roster?: string }} opts
 */
export function flightPlan(env, capturedJson, dry, { promptsFile, roster = ROSTER_NAME }) {
    const selected = env.NATIVELY_FLIGHT_ARMS ? selectArms(PAIRED_ARMS, env) : null;
    const candidates = selected ?? PAIRED_ARMS;
    const focusedOnly = focusedFor(roster, env);
    const focusedCaptured = dry || capturedJson !== null;
    const focusedArgs = ['--only', focusedOnly ?? '', ...(focusedCaptured ? ['--captured', promptsFile] : [])];
    const capturedIds = capturedJson ? capturedOnly(capturedJson) : [];
    const replayable = (a) => !a.captured || (focusedCaptured && (dry || capturedIds.length));
    const wanted = (a) => !a.when || dry || a.when(capturedJson);
    const skipped = candidates.flatMap((a) => (!replayable(a) ? [{ tag: a.tag, why: 'no-capture' }] : !wanted(a) ? [{ tag: a.tag, why: 'no-cue-rule' }] : []));
    const paired = candidates.filter((a) => replayable(a) && wanted(a))
        .map((a) => ({ model: a.model, tag: a.tag, args: ['--tag', a.tag, ...a.args, ...(a.captured ? ['--captured', promptsFile, ...(dry ? [] : ['--only', (a.only ? a.only(capturedJson) : capturedIds).join(',')])] : [])] }));
    const pairFile = (a) => `interview60.judge.pairs.${a.model}_${a.tag}.json`;
    if (selected) {
        return {
            arms: paired, paired, skipped,
            moveAside: selected.map((a) => answersFileFor(a.model, a.tag)),
            toGrade: ['interview60.judge.pairs.json', ...paired.map(pairFile)],
        };
    }
    return {
        arms: [...ANSWER_MODELS.map((model) => ({ model, args: [] })), ...(focusedOnly ? FOCUSED_MODELS.map((model) => ({ model, args: focusedArgs })) : []), ...paired],
        paired, skipped,
        moveAside: [...ANSWER_MODELS.map((m) => answersFileFor(m)), ...FOCUSED_MODELS.map((m) => answersFileFor(m)), ...PAIRED_ARMS.map((a) => answersFileFor(a.model, a.tag)), 'interview60.chains.json'],
        toGrade: ['interview60.judge.pairs.json', ...ANSWER_MODELS.map((m) => `interview60.judge.pairs.${m}.json`), ...paired.map(pairFile)],
    };
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
    // One read of the env value: it gates the arms (focusedOnly) and decides the FOCUSED log line below.
    const focusedEnv = { NATIVELY_FLIGHT_FOCUSED: process.env.NATIVELY_FLIGHT_FOCUSED };
    let focusedOnly;
    try { focusedOnly = focusedFor(ROSTER_NAME, focusedEnv); } catch (e) { log(`ABORT ${e.message}`); return 2; }
    // NATIVELY_FLIGHT_ARMS names are checked before anything is spent: a typo aborts here, not after the hour.
    try { selectArms(PAIRED_ARMS, process.env); } catch (e) { log(`ABORT ${e.message}`); return 2; }
    const armsEnv = process.env.NATIVELY_FLIGHT_ARMS || null;
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
    if (focusedEnv.NATIVELY_FLIGHT_FOCUSED === 'off') log(`FOCUSED  off by NATIVELY_FLIGHT_FOCUSED=off - skipping the ${FOCUSED_MODELS.length} focused arms`);
    else if (!focusedOnly) log(`FOCUSED  roster ${ROSTER_NAME} has no focused five — skipping the ${FOCUSED_MODELS.length} focused arms`);
    const capturedJson = focusedCaptured && !dry ? JSON.parse(fs.readFileSync(promptsFile, 'utf8')) : null;
    const capturedIds = capturedJson ? capturedOnly(capturedJson) : [];
    if (focusedCaptured && !dry) log(`paired captured arm: ${capturedIds.length} spoken items have a replayable prompt this hour`);
    // One plan for the arms loop, the file moves, the judge exports and done.toGrade (I5): with NATIVELY_FLIGHT_ARMS
    // set they all use the SAME selected list. Moving files aside here rather than before the prompts step changes
    // nothing: prompts.mjs writes into the run folder, not into the answers files that are moved.
    const plan = flightPlan(process.env, capturedJson, dry, { promptsFile });
    if (!dry) for (const f of plan.moveAside) moveAside(path.join(HERE, f), stamp);
    // Named in numbers, once, rather than per arm: how many of the replayable captured prompts
    // carry the rule at all (0 on a pre-cue hour) or how many of them lack it (a mixed hour).
    const ruleCount = capturedJson ? cueRuleIds(capturedJson).length : 0;
    if (focusedCaptured && !dry) log(`paired no-cues twins: ${ruleCount} of ${capturedIds.length} replayable prompts carry the cue rule; the twins replay those ids only`);
    const ruleSummary = `${ruleCount} of ${capturedIds.length} carry the cue rule`;
    for (const s of plan.skipped) {
        if (s.why === 'no-capture') log(`WARN  paired arm ${s.tag} skipped — it replays the hour's captured prompts and there are none`);
        else log(`paired arm ${s.tag} skipped — ${ruleSummary}, so --no-cues would refuse an id mid-flight instead`);
    }
    const { arms, paired } = plan;
    if (armsEnv) log(`ARMS  ${arms.map((a) => a.tag).join(',')} (NATIVELY_FLIGHT_ARMS); untagged arms and chains skipped`);
    for (const { model, tag, args } of arms) {
        await run([path.join(HERE, 'interview60.answers.mjs'), '--model', model, ...args], { dry });
        const src = path.join(HERE, answersFileFor(model, tag));
        const dest = path.join(runDir, answersFileFor(model, tag));
        if (dry) { answersFiles.push(dest); continue; }
        if (!fs.existsSync(src)) { log(`WARN  no answers file for ${model} — the pass wrote nothing`); continue; }
        fs.copyFileSync(src, dest);
        answersFiles.push(dest);
    }
    if (!armsEnv) {
        await run([path.join(HERE, 'interview60.chains.mjs')], { dry });
        const chains = path.join(HERE, 'interview60.chains.json');
        if (!dry && fs.existsSync(chains)) fs.copyFileSync(chains, path.join(runDir, 'interview60.chains.json'));
    }

    // 4. Judge exports: the hour's own answers, then each arm.
    const judge = path.join(HERE, 'interview60.judge.mjs');
    await run([judge, runDir, '--export'], { dry });
    for (const f of answersFiles) await run([judge, runDir, '--answers', f, '--export'], { dry });

    const done = {
        label, roster: ROSTER_NAME, rosterLabel: rosterLabel(), startedAt, finishedAt: new Date().toISOString(), liveModel, autoExit, runDir, answersFiles,
        commit, stt: process.env.NATIVELY_STT_PROVIDER ?? null,
        // 'captured' = the focused arms replayed the app's own system + user turn; 'own-framing'
        // = they sent the arm's bare question text, which is not the same experiment.
        focusedPrompts: focusedCaptured ? 'captured' : 'own-framing', focusedOnly: armsEnv ? null : focusedOnly,
        ...(armsEnv ? { arms: armsEnv } : {}),
        pairedArms: paired.map((a) => a.tag),
        toGrade: plan.toGrade,
        next: 'grade each pairs file with its rubric into interview60.judge.verdicts[.<model>].json, then interview60.judge.mjs <run> [--answers <file>] --verdicts <that file> --model <the exact model id the grading agent ran on, from its transcript>',
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
