// Rule-8 self-test of the runner (followup-turn-run.mjs + gemini.mjs) with a MOCK fetch: no key, no network, no model call. It runs the
// real code path -- request shape, SSE parsing, the shipped filter chain, retries, record shape, files, the leg plan, the interleaving,
// --dry-run, the second-invocation refusal, --crash-resume -- against the real frozen material, in a temp folder (FQ_OUT_DIR).
// Needs section 2 to verify (TURN_PREREG, default: the registered followup-turn/PREREGISTER-turn-followup.md -- A2 C1; before the OK a test sets it to section2-filled.md).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.dirname(HERE);
const FT = path.dirname(R);
process.env.TURN_PREREG ??= path.join(FT, 'PREREGISTER-turn-followup.md');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'turn-runner-'));
process.env.FQ_OUT_DIR = TMP;                                  // BEFORE common.mjs is imported
const C = await import('./common.mjs');
const { runPass, planOrder } = await import('./followup-turn-run.mjs');
if (C.OUT_DIR !== TMP) { console.log('REFUSED: OUT_DIR is not the temp folder'); process.exit(2); }
const v = C.verifySection2();
if (!v.ok) { console.log(`REFUSED: section 2 of ${C.PREREG} does not verify (${v.problems.slice(0, 3).join(' | ')})`); process.exit(2); }
const { G } = await C.loadGated(C.PRIMARY_HOURS);
let ok = true;
const check = (name, pass, detail = '') => { ok &&= !!pass; console.log(`${pass ? 'OK  ' : 'BAD '} ${name}${detail ? `  [${detail}]` : ''}`); };

// ── a mock Gemini: the call index decides what comes back ──
const ANSWER = ['Use a hash ring.', ' It keeps most keys in place when a node leaves.'];
const sse = (chunks) => chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('');
const okStream = ({ usage = { thoughtsTokenCount: 321 }, finish = 'STOP', text = ANSWER } = {}) => {
    const chunks = text.map((t, i) => ({ candidates: [{ content: { parts: [{ text: t }] }, ...(i === text.length - 1 && finish ? { finishReason: finish } : {}) }], ...(i === text.length - 1 && usage ? { usageMetadata: usage } : {}) }));
    return { status: 200, body: sse(chunks) };
};
function mockFetch(decide) {
    const log = [];
    const f = async (url, init) => {
        const body = JSON.parse(init.body);
        const n = log.length;
        log.push({ url, headers: init.headers, body, signal: init.signal });
        const r = decide(n, body, url) ?? okStream();
        // r.hang: a body that never produces a byte and never closes (the hung SSE stream of prep review I1); the mock does not link the
        // request's signal to it, so only the runner's own timeout can end the call.
        const stream = new ReadableStream({ start(c) { if (r.hang) return; const e = new TextEncoder(); const s = r.body ?? ''; for (let i = 0; i < s.length; i += 40) c.enqueue(e.encode(s.slice(i, i + 40))); c.close(); } });
        return new Response(stream, { status: r.status, headers: r.headers });
    };
    f.log = log;
    return f;
}
const userOf = (b) => b.contents[0].parts[0].text;
const sysOf = (b) => b.systemInstruction.parts[0].text;
const counts = { front: 140, back: 48 };
const runLog = [];
const files = () => fs.readdirSync(TMP).filter((f) => /^interview60\.answers\./.test(f));

// ── dry run ──
{
    const lines = [];
    const f = mockFetch(() => null);
    const r = await runPass({ leg: 'front', dryRun: true, fetchImpl: f, log: (s) => lines.push(s) });
    const dry = lines.filter((l) => l.startsWith('DRY #'));
    check('--dry-run --leg front: 140 calls listed, each naming gemini-3.5-flash-lite and thinkingLevel HIGH; no fetch, no file', dry.length === 140 && dry.every((l) => /model gemini-3\.5-flash-lite thinkingLevel HIGH/.test(l)) && f.log.length === 0 && files().length === 0 && r.dryRun === true);
    check('... the header names leg, model, thinkingLevel, temperature, the filter pin', /leg=front {2}model=gemini-3\.5-flash-lite {2}thinkingLevel=HIGH {2}temperature=0\.4/.test(lines[0]) && lines.some((l) => /d8fee6ca0170/.test(l)));
    const lines2 = [];
    await runPass({ leg: 'back', dryRun: true, fetchImpl: f, log: (s) => lines2.push(s) });
    const dry2 = lines2.filter((l) => l.startsWith('DRY #'));
    check('--dry-run --leg back: 48 calls, gemini-3.1-flash-lite, thinkingLevel LOW', dry2.length === 48 && dry2.every((l) => /model gemini-3\.1-flash-lite thinkingLevel LOW/.test(l)) && /leg=back {2}model=gemini-3\.1-flash-lite {2}thinkingLevel=LOW/.test(lines2[0]));
    check('--dry-run: the plan is 2 hours x (4 roster + 3 D) x 5 reps x 2 arms for the front and roster-only x 3 reps for the back', (() => { const fr = planOrder(C.itemsFor(G, 'front', C.PRIMARY_HOURS), 'front'), bk = planOrder(C.itemsFor(G, 'back', C.PRIMARY_HOURS), 'back'); return fr.length === 140 && bk.length === 48 && bk.every((c) => G[c.key].kind === 'roster') && fr.filter((c) => G[c.key].kind === 'dropped').length === 60; })());
    const plan = planOrder(C.itemsFor(G, 'front', C.PRIMARY_HOURS), 'front');
    const items = C.itemsFor(G, 'front', C.PRIMARY_HOURS);
    const expectA = plan.filter((c) => c.pos === 1 && c.arm === 'A').length;
    check('interleaving: A first exactly when (itemIndex + rep) is even, and every (item, rep) holds one A and one B', (() => { let good = true; items.forEach((k, i) => { for (let rep = 1; rep <= 5; rep++) { const pair = plan.filter((c) => c.key === k && c.rep === rep); good &&= pair.length === 2 && pair[0].pos === 1 && pair[0].arm === ((i + rep) % 2 === 0 ? 'A' : 'B') && pair[1].arm !== pair[0].arm; } }); return good && expectA === 35; })());
}

// ── the real front pass against the mock ──
const decide1 = (n, body) => {
    if (n === 0) return okStream({ usage: { thoughtsTokenCount: 321 } });
    if (n === 1) return okStream({ usage: null });                                            // no usageMetadata at all -> thoughts null
    if (n === 2) return okStream({ usage: { promptTokenCount: 5 } });                         // usageMetadata without thoughtsTokenCount -> thoughts null
    if (n === 3) return okStream({ usage: { thoughtsTokenCount: 0 } });                       // an honest 0 stays 0
    return null;
};
const f1 = mockFetch(decide1);
const out1 = [];
const r1 = await runPass({ leg: 'front', fetchImpl: f1, key: 'TESTKEY', pauseMs: 0, log: (s) => out1.push(s), runLog: (s) => runLog.push(s) });
check('front pass: 140 calls to the mock, none refused', !r1.refused && f1.log.length === 140 && r1.calls === 140, r1.refused ?? `${f1.log.length} calls`);
check('request shape: model in the URL, SSE, temperature 0.4, maxOutputTokens 65536, thinkingLevel HIGH, key header', f1.log.every((x) => /\/models\/gemini-3\.5-flash-lite:streamGenerateContent\?alt=sse$/.test(x.url) && x.body.generationConfig.temperature === 0.4 && x.body.generationConfig.maxOutputTokens === 65536 && x.body.generationConfig.thinkingConfig.thinkingLevel === 'HIGH' && x.headers['x-goog-api-key'] === 'TESTKEY'));
const order = planOrder(C.itemsFor(G, 'front', C.PRIMARY_HOURS), 'front');
check('each call carries the plan\'s arm bytes: arm A = userA, arm B = userB = insertBlock(userA, block); system unchanged', f1.log.every((x, n) => { const o = G[order[n].key]; return userOf(x.body) === (order[n].arm === 'A' ? o.userA : o.userB) && sysOf(x.body) === o.system; }));
const store = (leg, h, arm, rep) => JSON.parse(fs.readFileSync(C.fileFor(leg, h, arm, rep), 'utf8'));
const first = order[0], rec0 = store('front', G[first.key].hour, first.arm, first.rep)[first.key];
check('record fields: key, hour, id, kind, leg, model, thinking, label, arm, rep, spoken, words, ttft, total, finish, raw, rawLen, thoughts', rec0 && rec0.key === first.key && rec0.hour === 's50m' && rec0.id === G[first.key].id && rec0.kind === G[first.key].kind && rec0.leg === 'front' && rec0.model === 'gemini-3.5-flash-lite' && rec0.thinking === 'HIGH' && rec0.label === `gemini-3.5-flash-lite_fturn-s50m-${first.arm}` && rec0.arm === first.arm && rec0.rep === first.rep && rec0.spoken === ANSWER.join('').trim() && rec0.words === 14 && Number.isFinite(rec0.ttft) && Number.isFinite(rec0.total) && rec0.finish === 'STOP' && rec0.raw === ANSWER.join('') && rec0.rawLen === ANSWER.join('').length, JSON.stringify({ words: rec0?.words }));
const thoughtsOf = (n) => store('front', G[order[n].key].hour, order[n].arm, order[n].rep)[order[n].key].thoughts;
check('thoughts: a reported count is kept (321), no usageMetadata -> null, usageMetadata without the field -> null (never 0), an honest 0 stays 0', thoughtsOf(0) === 321 && thoughtsOf(1) === null && thoughtsOf(2) === null && thoughtsOf(3) === 0);
check('32 answer files after both legs? front first: 20 files (2 hours x 2 arms x 5 reps), named interview60.answers.<model>_fturn-<hour>-<arm>-r<rep>.json', files().length === 20 && files().every((f) => /^interview60\.answers\.gemini-3\.5-flash-lite_fturn-s50[ml]-[AB]-r[1-5]\.json$/.test(f)));
check('records are keyed <hour>:<id> and each file holds only its hour', files().every((f) => { const h = f.match(/fturn-(s50[ml])-/)[1]; const s = JSON.parse(fs.readFileSync(path.join(TMP, f), 'utf8')); return Object.keys(s).length === 7 && Object.keys(s).every((k) => k.startsWith(`${h}:`)); }));
check('the pass log ends with the arm summaries and "incomplete ... none"', out1.some((l) => /^arm A: answered 70\/70 {2}transient 0/.test(l)) && out1.some((l) => /incomplete .*: none$/.test(l)) && out1.some((l) => /thoughts null 2/.test(l) || /thoughts null/.test(l)));

// ── a second invocation re-calls nothing without --crash-resume ──
{
    const f = mockFetch(() => null);
    const r = await runPass({ leg: 'front', fetchImpl: f, key: 'TESTKEY', pauseMs: 0, log: () => {}, runLog: (s) => runLog.push(s) });
    check('a second invocation without --crash-resume is REFUSED and makes no call', !!r.refused && /re-calls nothing/.test(r.refused) && f.log.length === 0);
}
// ── --crash-resume: logged, and only records with no answer at all ──
{
    const f = mockFetch(() => null);
    const before = runLog.length;
    const r = await runPass({ leg: 'front', crashResume: true, fetchImpl: f, key: 'TESTKEY', pauseMs: 0, log: () => {}, runLog: (s) => runLog.push(s) });
    check('--crash-resume with every record present: logged, 0 calls', !r.refused && f.log.length === 0 && runLog.length === before + 1 && /CRASH-RESUME leg=front.*140 records kept, 0 calls/.test(runLog.at(-1)), runLog.at(-1)?.slice(0, 120));
    // delete ONE record from ONE file, plus mark another as transient: only the deleted one may be called
    const victim = order[17], other = order[40];
    const fv = C.fileFor('front', G[victim.key].hour, victim.arm, victim.rep); const sv = JSON.parse(fs.readFileSync(fv, 'utf8')); delete sv[victim.key]; fs.writeFileSync(fv, JSON.stringify(sv));
    const fo = C.fileFor('front', G[other.key].hour, other.arm, other.rep); const so = JSON.parse(fs.readFileSync(fo, 'utf8')); so[other.key] = { ...so[other.key], spoken: undefined, transientError: 'HTTP 503' }; fs.writeFileSync(fo, JSON.stringify(so));
    const f2 = mockFetch(() => null);
    const r2 = await runPass({ leg: 'front', crashResume: true, fetchImpl: f2, key: 'TESTKEY', pauseMs: 0, log: () => {}, runLog: (s) => runLog.push(s) });
    check('--crash-resume after one record was lost: exactly that one call is made (the right item, arm and rep); a TRANSIENT record is never re-called', f2.log.length === 1 && userOf(f2.log[0].body) === (victim.arm === 'A' ? G[victim.key].userA : G[victim.key].userB) && r2.transient.length === 1 && r2.transient[0] === `${other.key}#${other.rep} ${other.arm}`, `calls ${f2.log.length}, transient ${r2.transient}`);
    check('the lost record is back, with its hour/leg/model/thinking', (() => { const x = store('front', G[victim.key].hour, victim.arm, victim.rep)[victim.key]; return x && x.leg === 'front' && x.hour === G[victim.key].hour && x.thinking === 'HIGH' && x.model === 'gemini-3.5-flash-lite'; })());
}

// ── retries inside the pass: 429/5xx up to 4 times; a cut stream once ──
{
    // A2 M8: the back leg is refused unless all 20 front files exist ("front leg first, then back leg", section 4)
    {
        const moved = path.join(TMP, 'front-r3.moved'), victim = C.fileFor('front', 's50l', 'B', 3);
        fs.renameSync(victim, moved);
        const f = mockFetch(() => null);
        const r = await runPass({ leg: 'back', fetchImpl: f, key: 'TESTKEY', pauseMs: 0, log: () => {}, runLog: () => {} });
        check('--leg back is REFUSED while one of the 20 front files is missing, and makes no call', !!r.refused && /front/.test(r.refused) && f.log.length === 0, r.refused?.slice(0, 80));
        fs.renameSync(moved, victim);
    }
    fs.readdirSync(TMP).filter((f) => /^interview60\.answers\.gemini-3\.1/.test(f)).forEach((f) => fs.unlinkSync(path.join(TMP, f)));
    const seen = {};
    const f = mockFetch((n, body) => {
        const key = userOf(body).length + sysOf(body).length;                                  // not unique per call; use the plan index instead
        void key;
        if (n === 0 || n === 1) return { status: n === 0 ? 503 : 429, body: '' };            // first item's first call: 503, 429, then OK  (2 transients + success = 3 requests)
        if (n >= 3 && n <= 7) return { status: 503, body: '' };                                // the NEXT call: 5 attempts all 503 -> a transient record
        if (n === 8) return okStream({ finish: null });                                       // a cut stream (text, no finishReason) -> one more try
        return null;
    });
    const out = [];
    const r = await runPass({ leg: 'back', fetchImpl: f, key: 'TESTKEY', pauseMs: 0, log: (s) => out.push(s), runLog: () => {} });
    const planB = planOrder(C.itemsFor(G, 'back', C.PRIMARY_HOURS), 'back');
    const rec = (i) => store('back', G[planB[i].key].hour, planB[i].arm, planB[i].rep)[planB[i].key];
    check('back pass: 48 planned calls + 2 retries (call 1) + 4 more attempts (call 2) + 1 cut-stream retry = 55 requests', f.log.length === 55 && !r.refused, `${f.log.length} requests`);
    check('a call that fails with 503, 429 and then succeeds is a normal record', !rec(0).transientError && rec(0).spoken && rec(0).model === 'gemini-3.1-flash-lite' && rec(0).thinking === 'LOW' && rec(0).leg === 'back');
    check('a call whose 5 attempts all fail is a transientError record (no spoken), named as incomplete, and the pass goes on', rec(1).transientError === 'HTTP 503' && !rec(1).spoken && r.transient.length === 1 && r.transient[0] === `${planB[1].key}#${planB[1].rep} ${planB[1].arm}`);
    check('a stream cut with no finishReason is tried once more', !rec(2).transientError && rec(2).finish === 'STOP');
    check('back requests use gemini-3.1-flash-lite and thinkingLevel LOW', f.log.every((x) => /\/models\/gemini-3\.1-flash-lite:/.test(x.url) && x.body.generationConfig.thinkingConfig.thinkingLevel === 'LOW'));
    check('back files: 12 (2 hours x 2 arms x 3 reps)', files().filter((x) => /gemini-3\.1-flash-lite_fturn-/.test(x)).length === 12);
    check('every request carries an AbortSignal (the per-call timeout, A2 point 3) and the registered timeout is 120 s', f.log.every((x) => x.signal instanceof AbortSignal) && C.CALL_TIMEOUT_MS === 120000);
    const r0 = rec(0);
    check('every record carries `end` (>= its `at`) and the stop it was made under', [0, 1, 2, 3].every((i) => { const x = rec(i); return Number.isFinite(Date.parse(x.end)) && Date.parse(x.end) >= Date.parse(x.at) && x.stopAt === C.HARD_STOP; }) && r0.end !== undefined);
}

// ── A2 point 4 (I3): a stream that ends with no text and no finishReason is a transient, never an answer ──
const clearBack = () => fs.readdirSync(TMP).filter((f) => /^interview60\.answers\.gemini-3\.1/.test(f) || /^STOPPED-/.test(f)).forEach((f) => fs.unlinkSync(path.join(TMP, f)));
const planBack = planOrder(C.itemsFor(G, 'back', C.PRIMARY_HOURS), 'back');
const recBack = (i) => store('back', G[planBack[i].key].hour, planBack[i].arm, planBack[i].rep)[planBack[i].key];
const EMPTY_MSG = 'empty stream (no text, no finishReason)';
{
    clearBack();
    const f = mockFetch((n) => {
        if (n <= 4) return { status: 200, body: '' };                                          // call 1: five HTTP 200 streams with nothing in them
        if (n === 5 || n === 6) return { status: 200, body: '' };                               // call 2: two empty streams, then an answer (n = 7)
        if (n === 8) return okStream({ text: [''], finish: 'STOP', usage: { thoughtsTokenCount: 5 } });   // call 3: a finishReason and an empty answer = a REAL 0/0/0, no retry
        if (n === 9) return okStream({ text: [''], finish: null, usage: { thoughtsTokenCount: 300 } });    // call 4: usage only, still no text, no finishReason -> retried
        return null;
    });
    const r = await runPass({ leg: 'back', fetchImpl: f, key: 'TESTKEY', pauseMs: 0, log: () => {}, runLog: () => {} });
    check('empty streams: 5 + 3 + 1 + 2 + 44 = 55 requests (the retry on finish === null no longer needs spoken)', f.log.length === 55 && !r.refused, `${f.log.length} requests`);
    check('five empty streams in a row store transientError "empty stream (no text, no finishReason)", never a completed record; the pair is named incomplete', recBack(0).transientError === EMPTY_MSG && recBack(0).spoken === undefined && r.transient.length === 1 && r.transient[0] === `${planBack[0].key}#${planBack[0].rep} ${planBack[0].arm}`);
    check('two empty streams then an answer is a normal record (retried inside the same 5-attempt budget, like a 503)', !recBack(1).transientError && recBack(1).spoken && recBack(1).finish === 'STOP');
    check('a stream WITH a finishReason and an empty answer stays a real record (spoken "", finish STOP, no retry): section 5 scores it 0/0/0', !recBack(2).transientError && recBack(2).spoken === '' && recBack(2).finish === 'STOP' && recBack(2).thoughts === 5);
    check('a usage-only stream (thoughts reported, no text, no finishReason) is empty too: retried, then the answer is kept', !recBack(3).transientError && recBack(3).spoken && recBack(3).finish === 'STOP');
}

// ── A2 point 3 (I1): the hard stop, mechanical ──
{
    clearBack();
    const cutoff = Date.parse(C.HARD_STOP);
    const marker = path.join(TMP, 'STOPPED-back.txt');
    // (a) refuse to START when now + 120 s >= cutoff (exactly 120 s before: refused; the boundary is >=)
    let now = cutoff - 120000;
    const f = mockFetch(() => null);
    const out = [], rl = [];
    const r = await runPass({ leg: 'back', fetchImpl: f, key: 'TESTKEY', pauseMs: 0, nowFn: () => now, log: (s) => out.push(s), runLog: (s) => rl.push(s) });
    const slotsAll = planBack.map((c) => `${c.key}#${c.rep} ${c.arm}`);
    check('hard stop: now + 120 s >= cutoff -> the first call is not made, nothing is written but the marker', r.stopped === true && f.log.length === 0 && files().filter((x) => /gemini-3\.1/.test(x)).length === 0);
    check('... run.log and the console get "STOPPED AT HARD STOP back <slots not made>" naming all 48 slots', rl.some((l) => /STOPPED AT HARD STOP back /.test(l) && slotsAll.every((s) => l.includes(s))) && out.some((l) => /STOPPED AT HARD STOP back /.test(l)));
    check('... and R/STOPPED-back.txt is written (the same line)', fs.existsSync(marker) && /STOPPED AT HARD STOP back /.test(fs.readFileSync(marker, 'utf8')));
    // (b) one millisecond earlier it starts; the clock then moves: after the 3rd call the 4th is refused, the 3 records stay
    fs.unlinkSync(marker);
    now = cutoff - 120001;
    let made = 0;
    const f2 = mockFetch(() => { made++; if (made === 3) now = cutoff - 100000; return null; });
    const rl2 = [];
    const r2 = await runPass({ leg: 'back', fetchImpl: f2, key: 'TESTKEY', pauseMs: 0, nowFn: () => now, log: () => {}, runLog: (s) => rl2.push(s) });
    const written = files().filter((x) => /gemini-3\.1/.test(x)).flatMap((x) => Object.values(JSON.parse(fs.readFileSync(path.join(TMP, x), 'utf8'))));
    check('hard stop mid-pass: 3 calls made, the 4th refused (now + 120 s >= cutoff), 3 records kept, exit-code signal r.stopped', r2.stopped === true && f2.log.length === 3 && written.length === 3 && rl2.some((l) => /STOPPED AT HARD STOP back /.test(l) && !l.includes(slotsAll[0]) && l.includes(slotsAll[3]) && l.includes(slotsAll[47])), `${f2.log.length} calls, ${written.length} records`);
    check('... the marker exists, and every kept record has end < cutoff', fs.existsSync(marker) && written.every((x) => Date.parse(x.end) < cutoff) && written.every((x) => x.stopAt === C.HARD_STOP));
    // (c) the cutoff is hard-coded for the primary hours: a --stop-at style override is refused there
    const f3 = mockFetch(() => null);
    const r3 = await runPass({ leg: 'back', fetchImpl: f3, key: 'TESTKEY', pauseMs: 0, stopAt: '2099-01-01T00:00:00Z', log: () => {}, runLog: () => {} });
    check('a different stop-at on the primary hours is REFUSED (the override is for the s50k re-run only)', !!r3.refused && /re-run/.test(r3.refused) && f3.log.length === 0);
    // (d) the CLI: --stop-at only with --hours s50k; a stop already past exits non-zero BEFORE any key is read (TURN_ENV_FILE points at nothing)
    const xdir = path.join(TMP, 'x');
    const cli = (args) => spawnSync(process.execPath, [path.join(HERE, 'followup-turn-run.mjs'), ...args], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: xdir, TURN_ENV_FILE: path.join(TMP, 'no-such.env') } });
    const c1 = cli(['--leg', 'front', '--hours', 's50k', '--stop-at', '2020-01-01T00:00:00Z']);
    check('CLI: --hours s50k --stop-at <past> exits 3 with STOPPED AT HARD STOP and writes R/STOPPED-front.txt, reading no key', c1.status === 3 && /STOPPED AT HARD STOP front /.test(c1.stdout) && fs.existsSync(path.join(xdir, 'STOPPED-front.txt')) && !/no GEMINI/.test(c1.stdout), `exit ${c1.status}`);
    const c2 = cli(['--leg', 'front', '--stop-at', '2099-01-01T00:00:00Z']);
    check('CLI: --stop-at without --hours s50k is REFUSED, exit 2', c2.status === 2 && /re-run/.test(c2.stdout));
    const c3 = cli(['--leg', 'front']);
    check('CLI: a normal front start (clock before the cutoff) reaches the key step and stops there because TURN_ENV_FILE holds none: exit 2, no call', c3.status === 2 && /no GEMINI_API_KEY/.test(c3.stdout) && !/STOPPED/.test(c3.stdout), `exit ${c3.status}`);
    fs.rmSync(xdir, { recursive: true, force: true });
}

// ── A2 point 3: a hung stream is cut by the per-call timeout and becomes a transient (the registered 120 s; 40 ms here) ──
{
    clearBack();
    const f = mockFetch((n) => (n < 5 ? { hang: true, status: 200 } : null));
    const r = await runPass({ leg: 'back', fetchImpl: f, key: 'TESTKEY', pauseMs: 0, timeoutMs: 40, log: () => {}, runLog: () => {} });
    check('a stream that never ends: five timed-out attempts -> transientError "timeout 40 ms", the pass goes on (5 + 47 = 52 requests)', /^timeout 40 ms$/.test(recBack(0).transientError ?? '') && f.log.length === 52 && r.transient.length === 1, `${f.log.length} requests, ${recBack(0).transientError}`);
}

// ── A2 M7: Retry-After honoured on 429/5xx, capped at 60 s; without it the registered backoff ──
{
    clearBack();
    const sleeps = [];
    const f = mockFetch((n) => (n === 0 ? { status: 429, body: '', headers: { 'retry-after': '3' } } : n === 1 ? { status: 503, body: '', headers: { 'retry-after': '500' } } : n === 2 ? { status: 429, body: '' } : null));
    await runPass({ leg: 'back', fetchImpl: f, key: 'TESTKEY', pauseMs: 1500, sleepFn: async (ms) => { sleeps.push(ms); }, log: () => {}, runLog: () => {} });
    check('Retry-After 3 -> 3000 ms; Retry-After 500 -> capped at 60000 ms; no header -> 8000 x attempt (24000)', sleeps[0] === 3000 && sleeps[1] === 60000 && sleeps[2] === 24000, JSON.stringify(sleeps.slice(0, 4)));
}

// ── A2 M3: the store is written to .tmp and renamed (a crash mid-write never leaves truncated JSON) ──
{
    clearBack();
    const ops = [];
    const spyFs = { ...fs, writeFileSync: (p, d) => { ops.push(['write', String(p)]); return fs.writeFileSync(p, d); }, renameSync: (a, b) => { ops.push(['rename', String(a), String(b)]); return fs.renameSync(a, b); } };
    await runPass({ leg: 'back', fetchImpl: mockFetch(() => null), key: 'TESTKEY', pauseMs: 0, fsImpl: spyFs, log: () => {}, runLog: () => {} });
    check('48 calls = 48 writes of <file>.tmp, each immediately renamed onto <file>; no direct write to an answer file', ops.length === 96 && ops.every((o, i) => (i % 2 === 0 ? o[0] === 'write' && o[1].endsWith('.tmp') : o[0] === 'rename' && o[1] === ops[i - 1][1] && `${o[2]}.tmp` === o[1])));
    check('no .tmp file is left behind', fs.readdirSync(TMP).every((x) => !x.endsWith('.tmp')));
}

// ── a tampered section 2 is refused by a fresh process ──
{
    const text = fs.readFileSync(process.env.TURN_PREREG, 'utf8');
    const m = /gate-report-turn\.mjs ([0-9a-f]{64})/.exec(text);
    const bad = path.join(TMP, 'flipped.md'); fs.writeFileSync(bad, text.replace(m[1], (m[1][0] === 'a' ? 'b' : 'a') + m[1].slice(1)));
    const r = spawnSync(process.execPath, [path.join(HERE, 'followup-turn-run.mjs'), '--leg', 'front', '--dry-run'], { encoding: 'utf8', env: { ...process.env, TURN_PREREG: bad, FQ_OUT_DIR: path.join(TMP, 'x') } });
    check('the CLI REFUSES (exit 2) when a hash of section 2 differs', r.status === 2 && /REFUSED/.test(r.stdout) && /gate-report-turn\.mjs/.test(r.stdout));
    // A2 C1: r0 no longer reads the registered file itself (once its section 2 is filled, it verifies and the dry run exits 0). It refuses on a
    // TMP COPY of the registered file with every 64-hex hash stripped = an unfilled section 2.
    const registeredText = fs.readFileSync(path.join(FT, 'PREREGISTER-turn-followup.md'), 'utf8');
    const stripped = path.join(TMP, 'registered-no-hashes.md'); fs.writeFileSync(stripped, registeredText.replace(/[0-9a-f]{64}/g, ''));
    const r0 = spawnSync(process.execPath, [path.join(HERE, 'followup-turn-run.mjs'), '--leg', 'front', '--dry-run'], { encoding: 'utf8', env: { ...process.env, TURN_PREREG: stripped, FQ_OUT_DIR: path.join(TMP, 'x') } });
    check('the CLI REFUSES (exit 2) against a copy of the registered file with every hash stripped (an unfilled section 2: not ready = nothing runs)', r0.status === 2 && /REFUSED/.test(r0.stdout), `exit ${r0.status}; the copy dropped ${(registeredText.match(/[0-9a-f]{64}/g) ?? []).length} hashes`);
    const rOk = spawnSync(process.execPath, [path.join(HERE, 'followup-turn-run.mjs'), '--leg', 'front', '--dry-run'], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: path.join(TMP, 'x') } });
    check('... while the same dry run against the file this test started with (TURN_PREREG: the registered file once its section 2 is filled) is exit 0, 140 calls: the check answers differently when the effect is absent', rOk.status === 0 && /DRY RUN: 140 calls/.test(rOk.stdout), `TURN_PREREG ${path.basename(process.env.TURN_PREREG)}`);
    const r3 = spawnSync(process.execPath, [path.join(HERE, 'followup-turn-run.mjs'), '--dry-run'], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: path.join(TMP, 'x') } });
    check('the CLI REFUSES a run without --leg', r3.status === 2 && /--leg must be front or back/.test(r3.stdout));
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(ok ? '\nRUNNER SELF-TEST OK (mock fetch: no key, no network, no model call)' : '\nRUNNER SELF-TEST FAILED');
process.exit(ok ? 0 : 1);
