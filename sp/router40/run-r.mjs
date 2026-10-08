// P2 run-r.mjs: the router40 R runner = live40's run.mjs with anchored changes (PREREGISTER-router40 section 3.2, A1.1, A1.6, A2.2-A2.4, A3.1, A3.4):
//   system = R_SYSTEM of the chosen --variant (sha-guarded; the real run is variant B only, A1.1); items and clips read from live40 (read only); outputs to R40/runs;
//   end-of-answer detection = L38R's (ANSWER_WORDS 1: the item ends 6 s after any completed turn; 30 s with no output = silent; cap 90 s);
//   the P9 guard before the run, before EVERY chain attempt (retries included) and Σ-est at the start; health STOP; a stopped run named router40-R is kept as router40-R-<hhmm> (m4).
//   node run-r.mjs --variant B --only C02 --name router40-R-smoke     (one chain: the smoke)
//   node run-r.mjs --variant B --name router40-R                       (all 31 chains)
//   node run-r.mjs --dry --variant B [--dry-fail C05] [--dry-fail-always C04,C05,C06] [--stub-*...] --out-dir <dir> --name <n>   (no network, no key, virtual clock)
// A real run exits 2 when ANY stub input is set. The key is read in-process from MAIN/.env only after every guard passed, and never printed or saved.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { MAIN, R40, L40, sha12, stubsSet, argOf, buildRSystem, loadItems, readJson } from './r40-common.mjs';
import { guard, allChainEsts, remainingR } from './pre-run-r40.mjs';

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const DRY = flag('--dry');
const set = stubsSet(argv);
if (set.length && !DRY) { console.log(`REFUSED (exit 2): stub input(s) set in a real run: ${set.join(', ')}`); process.exit(2); }

const MODEL = 'gemini-3.8-live';
const VARIANT = argOf(argv, '--variant');
if (!['A', 'B'].includes(VARIANT)) { console.log('REFUSED (exit 2): --variant A|B is required'); process.exit(2); }
if (!DRY && VARIANT !== 'B') { console.log('REFUSED (exit 2): a real run is variant B (A1.1)'); process.exit(2); }
let RS;
try { RS = buildRSystem(VARIANT, { tamper: DRY && flag('--dry-tamper-block') }); } catch (e) { console.log(`REFUSED (exit 2): ${e.message}`); process.exit(2); }
if (argOf(argv, '--expect-sha') && argOf(argv, '--expect-sha') !== RS.systemSha) { console.log('REFUSED (exit 2): --expect-sha differs from the built R_SYSTEM sha'); process.exit(2); }
const SYSTEM = RS.system;

const NAME = argOf(argv, '--name') ?? (DRY ? 'router40-R-dry' : 'router40-R');
const ONLY = argOf(argv, '--only')?.split(',');
const DRY_FAIL = new Set((argOf(argv, '--dry-fail') ?? '').split(',').filter(Boolean));
const DRY_FAIL_ALWAYS = new Set((argOf(argv, '--dry-fail-always') ?? '').split(',').filter(Boolean));
const DRY_SCRIPT = argOf(argv, '--dry-script') ? readJson(argOf(argv, '--dry-script')) : null;
const GAP_MS = 10000, CHAIN_PAUSE_MS = 1500;
const ANSWER_WORDS = 1, QUIET_AFTER_TURN_MS = 6000, NO_OUTPUT_MS = 30000, CAP_MS = 90000; // L38R's timing (registration 3.2)
const CHUNK = 1920; // 60 ms of 16 kHz mono s16le
const outDir = DRY ? (argOf(argv, '--out-dir') ?? `${R40}/runs`) : `${R40}/runs`;

const { chains: ALL_CHAINS, items: ITEMS } = loadItems();
const MANIFEST = readJson(`${L40}/clips/manifest.json`).clips;
const CHAINS = ONLY ? ONLY.map((c) => { const x = ALL_CHAINS.find((y) => y.chain === c); if (!x) { console.log(`--only ${c}: no such chain`); process.exit(2); } return x; }) : ALL_CHAINS;
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

let mock = null;
if (DRY) mock = await import('./mock-session-r.mjs');
const nowMs = () => (DRY ? mock.vclock.t : Date.now());
const sleep = DRY ? mock.vsleep : (ms) => new Promise((r) => setTimeout(r, ms));
const STUB_BASE = +new Date(argOf(argv, '--now') ?? '2026-10-05T22:00');
const wall = () => (DRY ? new Date(STUB_BASE + mock.vclock.t) : new Date()); // the guard's clock
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;

// ---- stub scripts (dry only): a static array or { initial, after: { "<chains completed>": [...] } } ----
// the key of `after` = the number of chain ATTEMPTS finished so far (sessions.length), so a stub can change between a chain's attempt 1 and its retry
const scripted = (file, parse) => {
    const j = readJson(file);
    if (Array.isArray(j)) return () => parse(j);
    const keys = Object.keys(j.after ?? {}).map(Number).sort((a, b) => a - b);
    return (n) => { let cur = j.initial ?? []; for (const k of keys) if (k <= n) cur = j.after[k]; return parse(cur); };
};
const parseTasks = (a) => a.map((t) => ({ ...t, nextRun: t.nextRun ? new Date(t.nextRun) : null }));
const tasksFn = DRY ? (argOf(argv, '--stub-tasks') ? scripted(argOf(argv, '--stub-tasks'), parseTasks) : () => []) : null;
const procsFn = DRY ? (argOf(argv, '--stub-procs') ? scripted(argOf(argv, '--stub-procs'), (a) => a) : () => []) : null;
const rulingsText = DRY && argOf(argv, '--stub-rulings') ? fs.readFileSync(argOf(argv, '--stub-rulings'), 'utf8') : undefined;
const gsText = DRY ? (argOf(argv, '--stub-gsitting') && fs.existsSync(argOf(argv, '--stub-gsitting')) ? fs.readFileSync(argOf(argv, '--stub-gsitting'), 'utf8') : null) : undefined;
const registry = DRY && argOf(argv, '--stub-registry') ? readJson(argOf(argv, '--stub-registry')) : undefined;
const guardLog = [];
async function guardNow(label, estMs, completed, scope) {
    const stubs = DRY ? { tasks: tasksFn(completed), procs: procsFn(completed), rulingsText, gsittingText: gsText, registry, ownPid: process.pid } : {};
    const g = await guard({ arm: 'R', estMs, scope, stubs, now: wall() });
    guardLog.push({ before: label, ok: g.ok, failed: g.failed });
    return g;
}

// ---- estimates and the start guard (A2.4 guards 4-6) ----
// A5.2: the guard's est is the arm's REMAINING estimate: this chain's worst case + every later chain's realistic est (chains run in order)
const EST_ARR = allChainEsts(CHAINS);
const ESTS = Object.fromEntries(EST_ARR.map((c, i) => [c.chain, remainingR(EST_ARR, i)]));
const SUM_EST = ESTS[CHAINS[0].chain];
console.log(`router40 R runner: variant ${VARIANT}, R_SYSTEM sha12 ${sha12(SYSTEM)} (${RS.chars} chars, registered), ${CHAINS.length} chain(s), dry ${DRY}, name ${NAME}, remaining est (start) ${Math.round(SUM_EST / 1000)} s`);
const start = await guardNow('start', SUM_EST, 0, { drift: true, ledger: false });
if (!start.ok) { console.log(`REFUSED (exit 3): the start guard failed: ${start.failed.join(' | ')}. No chain started; nothing written.`); process.exit(3); }
fs.mkdirSync(outDir, { recursive: true });
for (const f of [`${NAME}.json`, `${NAME}.answers.json`]) if (fs.existsSync(path.join(outDir, f))) { console.log(`REFUSED (exit 2): ${f} already exists in ${outDir} (never overwritten; a graded router40-R is never re-run, m4)`); process.exit(2); }

// ---- clips ----
function clipPcm16k(id) {
    const wav = fs.readFileSync(MANIFEST[id].path);
    const rate = wav.readUInt32LE(24), ch = wav.readUInt16LE(22), bits = wav.readUInt16LE(34);
    if (bits !== 16) throw new Error(`${id}: ${bits}-bit`);
    let off = 12, dataOff = -1, dataLen = 0;
    while (off < wav.length - 8) { const idc = wav.toString('ascii', off, off + 4); const len = wav.readUInt32LE(off + 4); if (idc === 'data') { dataOff = off + 8; dataLen = len; break; } off += 8 + len; }
    if (dataOff < 0) throw new Error(`${id}: no data chunk`);
    const n = Math.floor(Math.min(dataLen, wav.length - dataOff) / 2);
    const src = new Int16Array(n);
    for (let i = 0; i < n; i++) src[i] = wav.readInt16LE(dataOff + 2 * i);
    const frames = Math.floor(src.length / ch), f = rate / 16000; // nearest-sample decimation, as live40
    const out = new Int16Array(Math.floor(frames / f));
    for (let i = 0; i < out.length; i++) out[i] = src[Math.floor(i * f) * ch];
    return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}
// Fail before any network call if a clip is missing or its hash drifted from the manifest.
const CLIPS = {};
for (const c of CHAINS) for (const id of c.items) {
    const m = MANIFEST[id];
    if (!m || !fs.existsSync(m.path)) throw new Error(`${id}: clip missing`);
    if (sha12(fs.readFileSync(m.path)) !== m.sha12) throw new Error(`${id}: clip changed since the manifest`);
    CLIPS[id] = clipPcm16k(id);
}

// ---- the live client (real run only; key read in-process after the guards, name only ever printed) ----
let apiKey = '', GoogleGenAI = null, ai = null;
if (!DRY) {
    GoogleGenAI = createRequire(`${MAIN}/package.json`)('@google/genai').GoogleGenAI;
    const env = fs.readFileSync(`${MAIN}/.env`, 'utf8');
    apiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
    if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }
    ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
}
const scrub = (s) => (apiKey ? String(s).split(apiKey).join('[key]') : String(s));
const CONNECT_MODEL = DRY ? (argOf(argv, '--stub-model') ?? MODEL) : MODEL;

let T0 = nowMs();
const T0_ISO = new Date(Date.now()).toISOString();
const rel = () => nowMs() - T0;
const events = [];
let current = { id: null, clipEndMs: null };
const QUIET_KINDS = new Set(['audio', 'outputTx', 'inputTx', 'text', 'thought']); // never printed (no text on the console)
const ev = (kind, data = {}, secretText) => {
    const e = { t: rel(), item: current.id, sinceClipEnd: current.clipEndMs == null ? null : rel() - current.clipEndMs, kind, ...data };
    if (secretText != null) { e._text = scrub(secretText); e.chars = String(secretText).length; } // _text is dropped when writing the events file
    events.push(e);
    if (!QUIET_KINDS.has(kind)) console.log(`+${(e.t / 1000).toFixed(2)}s [${e.item ?? '-'}${e.sinceClipEnd == null ? '' : ` ${(e.sinceClipEnd / 1000).toFixed(2)}s after end`}] ${kind} ${scrub(JSON.stringify(data)).slice(0, 160)}`);
};
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const sessions = [];
let health = { abnormalAttempts: 0, consecutiveBadChains: 0 };
let stopReason = null, complete = false, finalName = NAME;

// ---- metrics (ms are since the turn's clipEnd), as live40's ----
function metricsFor(label) {
    const mine = events.filter((e) => e.item === label);
    const cs = mine.find((e) => e.kind === 'clipStart'), ce = mine.find((e) => e.kind === 'clipEnd');
    const m = { clipStartMs: cs?.t ?? null, clipEndMs: ce?.t ?? null, firstOutputTextMs: null, firstAudioMs: null, lastOutputTextMs: null, generationCompleteMs: null, turnCompleteMs: null,
        lastTurnCompleteMs: null, words: 0, turnWords: [], earlyOutputTx: 0, earlyAudio: 0, outputTxEvents: 0, generationCompletes: 0, turnCompletes: 0, interrupted: 0, endReason: null, errors: [], closes: [] };
    for (const e of mine) {
        if (e.kind === 'error') m.errors.push(e.message);
        if (e.kind === 'close') m.closes.push({ code: e.code ?? null, reason: e.reason ?? null });
        if (e.kind === 'itemDone') m.endReason = e.reason ?? null;
    }
    if (!ce) return m;
    const k = mine.indexOf(ce);
    let cur = null;
    const closeTurn = (endKind, t) => { if (cur) { m.turnWords.push({ words: words(cur.text), firstMs: cur.first - ce.t, lastMs: cur.last - ce.t, endKind, endMs: t == null ? null : t - ce.t }); cur = null; } };
    for (let j = 0; j < mine.length; j++) {
        const e = mine[j], after = j > k, rt = e.t - ce.t;
        if (!after) { if (e.kind === 'outputTx') m.earlyOutputTx++; if (e.kind === 'audio') m.earlyAudio++; continue; }
        if (e.kind === 'outputTx') {
            m.outputTxEvents++; m.firstOutputTextMs ??= rt; m.lastOutputTextMs = rt;
            if (!cur) cur = { text: '', first: e.t, last: e.t };
            cur.text += e._text ?? ''; cur.last = e.t;
        } else if (e.kind === 'audio') m.firstAudioMs ??= rt;
        else if (e.kind === 'generationComplete') { m.generationCompletes++; m.generationCompleteMs ??= rt; }
        else if (e.kind === 'turnComplete') { m.turnCompletes++; m.turnCompleteMs ??= rt; m.lastTurnCompleteMs = rt; closeTurn('turnComplete', e.t); }
        else if (e.kind === 'interrupted') { m.interrupted++; closeTurn('interrupted', e.t); }
    }
    closeTurn('open', null);
    m.words = m.turnWords.reduce((a, t) => a + t.words, 0);
    return m;
}
/** Per-turn texts (answers file only): the same turn boundaries as metricsFor. */
function turnsFor(label) {
    const mine = events.filter((e) => e.item === label);
    const ce = mine.find((e) => e.kind === 'clipEnd');
    const out = []; if (!ce) return out;
    let cur = null;
    for (const e of mine.slice(mine.indexOf(ce) + 1)) {
        if (e.kind === 'outputTx') cur = { text: (cur?.text ?? '') + (e._text ?? ''), endKind: 'open' };
        else if ((e.kind === 'turnComplete' || e.kind === 'interrupted') && cur) { out.push({ ...cur, endKind: e.kind }); cur = null; }
    }
    if (cur) out.push(cur);
    return out.map((t) => ({ ...t, text: t.text.trim() }));
}
function answerFor(label) {
    const mine = events.filter((e) => e.item === label);
    const ce = mine.find((e) => e.kind === 'clipEnd');
    const cut = ce ? mine.indexOf(ce) : Infinity;
    const out = mine.filter((e, j) => e.kind === 'outputTx' && j > cut).map((e) => e._text ?? '').join('');
    const outEarly = mine.filter((e, j) => e.kind === 'outputTx' && j < cut).map((e) => e._text ?? '').join('');
    const heard = mine.filter((e) => e.kind === 'inputTx').map((e) => e._text ?? '').join('');
    return { text: out.trim(), textBeforeClipEnd: outEarly, heard, turns: turnsFor(label) };
}
const fileBase = () => path.join(outDir, finalName);
function save() {
    const labels = [...new Set(events.map((e) => e.item).filter(Boolean))];
    const metrics = Object.fromEntries(labels.map((l) => [l, metricsFor(l)]));
    const drop = (k, v) => (k === '_text' ? undefined : v);
    fs.writeFileSync(`${fileBase()}.json`, JSON.stringify({ model: MODEL, level: 'none', dry: DRY, name: finalName, variant: VARIANT, rSystemSha12: sha12(SYSTEM), rSystemSha256: RS.systemSha, blockSha256: RS.blockSha, t0Iso: T0_ISO, only: ONLY ?? null,
        chains: CHAINS, gapMs: GAP_MS, answerWords: ANSWER_WORDS, quietAfterTurnMs: QUIET_AFTER_TURN_MS, noOutputMs: NO_OUTPUT_MS, capMs: CAP_MS, complete, stopReason, health, guardLog, sessions, metrics, events }, drop, 1));
    const answers = Object.fromEntries(labels.map((l) => [l, { chain: ITEM[l.replace(/~a\d+$/, '')]?.chain, route: ITEM[l.replace(/~a\d+$/, '')]?.route, class: ITEM[l.replace(/~a\d+$/, '')]?.class, ...answerFor(l), words: metrics[l].words, turnWords: metrics[l].turnWords }]));
    fs.writeFileSync(`${fileBase()}.answers.json`, JSON.stringify({ name: finalName, model: MODEL, variant: VARIANT, complete, answers }, null, 1));
}
/** Save; a run that stopped before completing under the graded name is kept as router40-R-<hhmm> and never graded (A2.1 m4). */
function finalize(reason) {
    stopReason = reason;
    complete = !reason;
    const renamed = !complete && NAME === 'router40-R';
    if (renamed) finalName = `router40-R-${hhmm(wall())}`;
    save();
    if (renamed) for (const f of [`${NAME}.json`, `${NAME}.answers.json`]) fs.rmSync(path.join(outDir, f), { force: true }); // never leave a stopped run under the graded name
    console.log(`${complete ? 'COMPLETE' : `INCOMPLETE (${reason})`}: wrote ${finalName}.json and ${finalName}.answers.json in ${outDir}; chains run ${sessions.length ? new Set(sessions.map((s) => s.chain)).size : 0} of ${CHAINS.length}`);
}
process.on('SIGINT', () => { try { finalize('SIGINT'); } catch { /* noop */ } process.exit(130); });

const silence = Buffer.alloc(CHUNK).toString('base64');
async function runChain(chain, attempt) {
    const ids = chain.items;
    const st = { closed: null, setup: false, turnOpen: false, turnText: '', lastTurn: null, lastEventAt: 0 };
    const generated = new Set(); // turns with a generationComplete after their question ended
    const played = new Set();
    current = { id: null, clipEndMs: null };
    const callbacks = {
        onopen: () => ev('open', { chain: chain.chain, attempt }),
        onmessage: (msg) => {
            const sc = msg.serverContent;
            if (msg.setupComplete) { st.setup = true; ev('setupComplete'); }
            if (sc?.inputTranscription?.text) ev('inputTx', {}, sc.inputTranscription.text);
            if (sc?.outputTranscription?.text) { ev('outputTx', {}, sc.outputTranscription.text); st.turnOpen = true; st.turnText += sc.outputTranscription.text; st.lastEventAt = rel(); }
            for (const p of sc?.modelTurn?.parts ?? []) {
                if (p.thought) ev('thought', {}, String(p.text ?? ''));
                else if (p.text) ev('text', {}, p.text);
                else if (p.inlineData) ev('audio', { bytes: p.inlineData.data?.length ?? 0 }); // counted and discarded: no audio is written or played
            }
            if (sc?.turnComplete || sc?.interrupted) {
                ev(sc.turnComplete ? 'turnComplete' : 'interrupted');
                if (st.turnOpen && current.clipEndMs != null) st.lastTurn = { words: words(st.turnText), error: /system error/i.test(st.turnText) };
                st.turnOpen = false; st.turnText = ''; st.lastEventAt = rel();
            }
            if (sc?.generationComplete) { ev('generationComplete'); if (current.clipEndMs != null) generated.add(current.id); }
            if (msg.usageMetadata) ev('usage', { prompt: msg.usageMetadata.promptTokenCount, response: msg.usageMetadata.responseTokenCount, thoughts: msg.usageMetadata.thoughtsTokenCount, total: msg.usageMetadata.totalTokenCount });
            if (msg.goAway) ev('goAway', msg.goAway);
            if (msg.toolCall) ev('toolCall');
        },
        onerror: (e) => ev('error', { message: scrub(e?.message ?? e) }),
        onclose: (e) => { st.closed = { code: e?.code, reason: scrub(e?.reason ?? '') }; ev('close', st.closed); },
    };
    // the session model is asserted before connect (A2.7 m5)
    if (CONNECT_MODEL !== MODEL) { console.log(`REFUSED (exit 2): the session model is not the registered one (m5)`); process.exit(2); }
    let session;
    try {
        session = DRY
            ? mock.mockConnect(callbacks, { failAfterChunks: (DRY_FAIL.has(chain.chain) && attempt === 1) || DRY_FAIL_ALWAYS.has(chain.chain) ? 40 : 0, kindFor: () => (DRY_SCRIPT?.[current.id]) ?? mock.defaultKind(ITEM[current.id]) })
            : await ai.live.connect({
                model: CONNECT_MODEL,
                config: {
                    responseModalities: ['AUDIO'],
                    systemInstruction: { parts: [{ text: SYSTEM }] },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    contextWindowCompression: { slidingWindow: {} },
                },
                callbacks,
            });
    } catch (e) { ev('connectError', { message: scrub(e?.message ?? e) }); return { closed: 'connect failed', abnormal: true, complete: false }; }
    for (let w = 0; w < 10000 && !st.setup && !st.closed; w += 50) await sleep(50);
    // A session that never set up is an abnormal close before any item played: it takes the one retry too.
    if (!st.setup) { ev('setupTimeout'); try { session.close(); } catch { /* noop */ } return { closed: st.closed ?? 'no setupComplete in 10 s', abnormal: true, complete: false }; }
    for (let n = 0; n < ids.length; n++) {
        const id = ids[n];
        if (st.closed) break;
        const pcm = CLIPS[id];
        if (n > 0) { // the follow-up comes GAP_MS after the previous answer window ended; silence keeps streaming, as the real room would
            const gapFrom = rel();
            ev('gapStart', { gapMs: GAP_MS, after: ids[n - 1] });
            while (!st.closed && rel() - gapFrom < GAP_MS) { session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } }); await sleep(60); }
            if (st.closed) break;
        }
        current = { id, clipEndMs: null };
        st.lastTurn = null;
        let tailZero = 0; for (let i = pcm.length - 2; i >= 0 && pcm[i] === 0 && pcm[i + 1] === 0; i -= 2) tailZero++; // clips end in digital silence
        ev('clipStart', { seconds: +(pcm.length / 32000).toFixed(1), tailSilenceMs: Math.round(tailZero / 16), attempt });
        for (let off = 0; off < pcm.length && !st.closed; off += CHUNK) {
            session.sendRealtimeInput({ audio: { data: pcm.subarray(off, off + CHUNK).toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
            await sleep(60);
        }
        if (st.closed) break; // the question was cut short: this item did not happen
        current.clipEndMs = rel();
        played.add(id);
        ev('clipEnd');
        const waitFrom = rel();
        let reason = 'closed';
        while (!st.closed) { // L38R's end-of-answer detection
            session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } });
            await sleep(60);
            const waited = rel() - waitFrom, quiet = rel() - Math.max(st.lastEventAt, waitFrom);
            if (waited >= CAP_MS) { ev('cap'); reason = 'cap'; break; }
            if (st.turnOpen) continue;
            if (!st.lastTurn) { if (waited >= NO_OUTPUT_MS) { ev('noOutput'); reason = 'noOutput'; break; } continue; }
            if (quiet >= QUIET_AFTER_TURN_MS) { reason = 'quietAfterTurn'; break; }
        }
        ev('itemDone', { waitedMs: rel() - waitFrom, reason });
        const m = metricsFor(id);
        console.log(`   ${id}: firstText ${m.firstOutputTextMs ?? '-'} ms, gen ${m.generationCompleteMs ?? '-'} ms, turn ${m.turnCompleteMs ?? '-'} ms, ${m.words} words, early ${m.earlyOutputTx}, end ${reason}`);
    }
    try { session.close(); } catch { /* noop */ }
    await sleep(CHAIN_PAUSE_MS);
    const abnormal = st.closed && st.closed.code !== 1000;
    const done = ids.every((id) => played.has(id) && generated.has(id));
    return { closed: st.closed, abnormal: !!abnormal, complete: done };
}

let stop = null;
for (const chain of CHAINS) {
    const est = ESTS[chain.chain];
    let g = await guardNow(`${chain.chain}#1`, est, sessions.length, { drift: false, ledger: false });
    if (!g.ok) { stop = `guard before ${chain.chain}: ${g.failed.join(' | ')}`; break; }
    const startIdx = events.length;
    ev('chainStart', { chain: chain.chain, items: chain.items });
    let r = await runChain(chain, 1);
    sessions.push({ chain: chain.chain, items: chain.items, attempt: 1, ...r });
    if (r.abnormal) health.abnormalAttempts++;
    if (health.abnormalAttempts >= 6) { stop = `health STOP: ${health.abnormalAttempts} abnormal chain attempts (>= 6)`; save(); break; }
    if (r.abnormal && !r.complete) {
        for (const e of events.slice(startIdx)) if (chain.items.includes(e.item)) e.item = `${e.item}~a1`;
        current = { id: null, clipEndMs: null };
        g = await guardNow(`${chain.chain}#2 (retry)`, est, sessions.length, { drift: false, ledger: false });
        if (!g.ok) { stop = `guard before the retry of ${chain.chain}: ${g.failed.join(' | ')}`; break; }
        ev('retryChain', { chain: chain.chain });
        r = await runChain(chain, 2);
        sessions.push({ chain: chain.chain, items: chain.items, attempt: 2, ...r });
        if (r.abnormal) health.abnormalAttempts++;
        if (health.abnormalAttempts >= 6) { stop = `health STOP: ${health.abnormalAttempts} abnormal chain attempts (>= 6)`; save(); break; }
    }
    health.consecutiveBadChains = r.abnormal && !r.complete ? health.consecutiveBadChains + 1 : 0;
    if (health.consecutiveBadChains >= 3) { stop = `health STOP: ${health.consecutiveBadChains} consecutive chains still abnormal after their retry`; break; }
    save();
}
finalize(stop);
process.exit(stop ? 3 : 0);
