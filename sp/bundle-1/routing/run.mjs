// run.mjs: one pass of the offline routing replay (SPEC-bundle-1.md 1.3). THIS CALLS THE GEMINI LIVE API (gemini-3.8-live, one session per pass + resumption reconnects) when run for real.
// --fake uses a scripted stand-in on a virtual clock: no network, no key, and the file it writes is flagged fake:true (the scorer refuses it).
//   node run.mjs --arm B0 --rep 1 --context-file <ctx.txt>          calibration: OLD instruction (e29bf3810128 / e11c240063ea) on live40       (47 clips, 1 session)
//   node run.mjs --arm B1 --rep 1|2 --context-file <ctx.txt>        tuning: NEW instruction (79ad0f464d95 / 3a1da134e4c7) on live40             (47 clips, 1 session each)
//   node run.mjs --arm V  --rep 1 --context-file <ctx.txt>          validation: NEW instruction on scenario50 S1+S2                            (40 clips, 1 session)
//   options: --smoke (first 3 items, file name gets -smoke), --fake, --plan (checks and prints, connects to nothing)
// Refuses: a context that is not sha12 b2a43a2159a2 / 266 chars (no substitution; the user is asked); B1 or V before B0 exists and passed the calibration gate (the replay would prove nothing);
// holdout40 (not a roster here); an existing output file. The key is read in-process (process.env.GEMINI_API_KEY, else MAIN\.env) and never printed.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ARMS, RUNS, BUNDLE, MAIN, DEADLINE_MS, loadRoster, rosterProblems, parseWav, toPcm16k, loadContext, loadSubstitute, systemFor, runFile, routeReader } from './common.mjs';
import { runPass, TIMING } from './engine.mjs';
import { classifyRun } from './classify.mjs';
import { gateProblem } from './score-routing.mjs';
import { makeVirtualClock, makeFake, hardReply, easyReply } from './fake-live.mjs';

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
const arm = arg('--arm'), rep = Number(arg('--rep')), SMOKE = argv.includes('--smoke'), FAKE = argv.includes('--fake'), PLAN = argv.includes('--plan');
if (!ARMS[arm]) refuse(`--arm must be one of ${Object.keys(ARMS).join(', ')}`);
if (!ARMS[arm].reps.includes(rep)) refuse(`arm ${arm} runs rep ${ARMS[arm].reps.join(' and ')} only`);
const outFile = FAKE ? path.join(RUNS, `fake-${arm}-r${rep}.json`) : SMOKE ? runFile(arm, rep).replace('.json', '-smoke.json') : runFile(arm, rep);
if (fs.existsSync(outFile)) refuse(`${outFile} exists: refusing to overwrite`);

const R = routeReader();
const roster = await loadRoster(ARMS[arm].roster);
const bad = rosterProblems(roster);
if (bad.length) refuse(`roster problems: ${bad.join(' | ')}`);
// --substitute-context <file>: NOT the registered context. Only for a user-ruled substitute; allowed only if B0, B1 and V ALL use the identical file (enforced below and by the scorer);
// every output line is marked SUBSTITUTE. The default (--context-file) still refuses anything but sha12 b2a43a2159a2 / 266 chars.
const SUB = arg('--substitute-context');
if (SUB && arg('--context-file')) refuse('--substitute-context and --context-file are exclusive');
if (SUB && FAKE) refuse('--substitute-context is not used with --fake');
if (SUB) { const log0 = console.log; console.log = (...a) => log0('SUBSTITUTE', ...a); }
let ctx, kind = 'real';
if (FAKE) { ctx = 'FAKE-CONTEXT'; kind = 'fake'; } else {
    try { ctx = SUB ? loadSubstitute(SUB) : loadContext(arg('--context-file')); } catch (e) { refuse(e.message); }
}
let sys;
try { sys = FAKE ? { system: `fake system for ${arm}`, shas: { fake: true } } : await systemFor(arm, ctx); } catch (e) { refuse(e.message); }

// ---- the calibration gate: B1 and V mean nothing unless B0 (the OLD instruction) reproduced >= 2 of r1's 4 misroutes
if (!FAKE && arm !== 'B0') {
    const f = runFile('B0', 1);
    const gp = gateProblem(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null, (await loadRoster('live40')).map((i) => i.id), R, { label: `${arm}r${rep}`, ctx: sys.shas.ctx, substitute: !!SUB });
    if (gp) refuse(gp);
    console.log("calibration gate read: B0 reproduced >= 2 of r1's 4 misroutes: passed");
}
let items = roster.map((i) => ({ id: i.id, parent: i.parent, pcm: toPcm16k(parseWav(fs.readFileSync(i.wav))) }));
if (SMOKE) items = items.slice(0, 3);
console.log(`routing replay: arm ${arm} rep ${rep} (${ARMS[arm].role}); roster ${ARMS[arm].roster} ${items.length} clips${SMOKE ? ' (SMOKE)' : ''}; ${kind}; system sha12 ${sys.shas.system ?? '-'}; deadline Q+${DEADLINE_MS} ms; out ${path.basename(outFile)}`);
if (PLAN) { console.log('PLAN only: nothing connected'); process.exit(0); }

fs.mkdirSync(RUNS, { recursive: true });
const meta = { schema: 'b1-routing-run/1', arm, rep, roster: ARMS[arm].roster, role: ARMS[arm].role, fake: FAKE, smoke: SMOKE, model: 'gemini-3.8-live', substitute: !!SUB, startedAt: new Date().toISOString(), deadlineMs: DEADLINE_MS, timing: TIMING, shas: sys.shas };
const save = (res, partial) => fs.writeFileSync(outFile, JSON.stringify({ ...meta, partial, ...res }, null, 1));

let connect, clock, hooks = {};
if (FAKE) {
    clock = makeVirtualClock();
    const f = makeFake(clock, (id) => (roster.find((r) => r.id === id)?.key === 'HARD' ? hardReply(900) : easyReply(1000, 30)));
    connect = f.connect; hooks = { ...f.hooks };
} else {
    const envTxt = (() => { try { return fs.readFileSync(`${MAIN}/.env`, 'utf8'); } catch { return ''; } })();
    const apiKey = process.env.GEMINI_API_KEY?.trim() || (envTxt.match(/^GEMINI_API_KEY=(.+)$/m) ?? [])[1]?.trim().replace(/^["']|["']$/g, '');
    if (!apiKey) refuse('GEMINI_API_KEY: not in the environment and not in MAIN\\.env');
    const { GoogleGenAI } = createRequire(`${BUNDLE}/package.json`)('@google/genai');
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });          // the app's own connect (GeminiLiveRouter.ts defaultConnect)
    connect = (config, callbacks) => ai.live.connect({ model: 'gemini-3.8-live', config, callbacks });
    clock = { now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };
}
hooks.onItemDone = (res) => save(res, true);
const res = await runPass({ items, system: sys.system, connect, clock, hooks, log: (l) => console.log(l) });
save(res, false);
const cls = classifyRun({ items: res.items }, R);
const n = (c) => Object.values(cls).filter((x) => x.cls === c).length;
console.log(`wrote ${outFile}; items played ${res.items.filter((i) => i.played).length}/${items.length}; EASY ${n('EASY')} HARD ${n('HARD')} LATE ${n('LATE')} NONE ${n('NONE')}; reconnects ${res.reconnects}; unplanned ${res.unplanned}; stopped ${res.stopped ?? 'no'}`);
process.exit(res.stopped ? 5 : 0);
