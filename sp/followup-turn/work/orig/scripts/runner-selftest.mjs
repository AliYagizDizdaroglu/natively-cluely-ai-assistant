// Rule-8 self-test of the runner (followup-turn-run.mjs + gemini.mjs) with a MOCK fetch: no key, no network, no model call. It runs the
// real code path -- request shape, SSE parsing, the shipped filter chain, retries, record shape, files, the leg plan, the interleaving,
// --dry-run, the second-invocation refusal, --crash-resume -- against the real frozen material, in a temp folder (FQ_OUT_DIR).
// Needs section 2 to verify (TURN_PREREG, default followup-turn/section2-filled.md).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.dirname(HERE);
const FT = path.dirname(R);
process.env.TURN_PREREG ??= path.join(FT, 'section2-filled.md');
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
        log.push({ url, headers: init.headers, body });
        const r = decide(n, body, url) ?? okStream();
        const stream = new ReadableStream({ start(c) { const e = new TextEncoder(); const s = r.body ?? ''; for (let i = 0; i < s.length; i += 40) c.enqueue(e.encode(s.slice(i, i + 40))); c.close(); } });
        return new Response(stream, { status: r.status });
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
    fs.readdirSync(TMP).filter((f) => /^interview60\.answers\./.test(f)).forEach((f) => fs.unlinkSync(path.join(TMP, f)));
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
}

// ── a tampered section 2 is refused by a fresh process ──
{
    const text = fs.readFileSync(process.env.TURN_PREREG, 'utf8');
    const m = /gate-report-turn\.mjs ([0-9a-f]{64})/.exec(text);
    const bad = path.join(TMP, 'flipped.md'); fs.writeFileSync(bad, text.replace(m[1], (m[1][0] === 'a' ? 'b' : 'a') + m[1].slice(1)));
    const r = spawnSync(process.execPath, [path.join(HERE, 'followup-turn-run.mjs'), '--leg', 'front', '--dry-run'], { encoding: 'utf8', env: { ...process.env, TURN_PREREG: bad, FQ_OUT_DIR: path.join(TMP, 'x') } });
    check('the CLI REFUSES (exit 2) when a hash of section 2 differs', r.status === 2 && /REFUSED/.test(r.stdout) && /gate-report-turn\.mjs/.test(r.stdout));
    const r0 = spawnSync(process.execPath, [path.join(HERE, 'followup-turn-run.mjs'), '--leg', 'front', '--dry-run'], { encoding: 'utf8', env: { ...process.env, TURN_PREREG: path.join(FT, 'PREREGISTER-turn-followup.md'), FQ_OUT_DIR: path.join(TMP, 'x') } });
    check('the CLI REFUSES (exit 2) against the registered file while its section 2 is still empty (not ready = nothing runs)', r0.status === 2 && /REFUSED/.test(r0.stdout));
    const r3 = spawnSync(process.execPath, [path.join(HERE, 'followup-turn-run.mjs'), '--dry-run'], { encoding: 'utf8', env: { ...process.env, FQ_OUT_DIR: path.join(TMP, 'x') } });
    check('the CLI REFUSES a run without --leg', r3.status === 2 && /--leg must be front or back/.test(r3.stdout));
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(ok ? '\nRUNNER SELF-TEST OK (mock fetch: no key, no network, no model call)' : '\nRUNNER SELF-TEST FAILED');
process.exit(ok ? 0 : 1);
