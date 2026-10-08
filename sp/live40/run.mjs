// live40 runner: l20d/run.mjs adapted. gemini-3.8-live BARE answers a 47-turn interview set ON ITS OWN (no router, no pipeline), hearing each clip in real time
// (PCM16k), one Live session per CHAIN (SET-draft section 5: 31 chains, chain order), and the harness records text-timing metrics per turn.
// Unchanged from L20d: model, responseModalities AUDIO, input+output transcription, contextWindowCompression slidingWindow, the system instruction (l20d/instruction.txt,
// sha256 e29bf381... checked) + "\n\n" + a CONTEXT block, 60 ms real-time chunks, the end-of-answer detection (6 s quiet after a turn of >= 25 words or a system-error
// message, 30 s after shorter turns, 60 s no output = no answer, cap 150 s), and ONE retry of a chain whose session closes abnormally (code != 1000) before every played turn has a
// generationComplete (the failed attempt's events stay in the file relabelled `<id>~a1`).
// Changes: chains instead of pairs; a follow-up is played GAP_MS (10 s, silence streamed) after the previous turn's answer window ended; CONTEXT is one fixed block taken from
// the captured s50k prompt of --context-from (default S1Q02) because the new turns have no captured prompt of their own; the events file carries NO text (transcripts go to
// <name>.answers.json only); per-turn metrics (all ms are SINCE clipEnd): firstOutputTextMs, firstAudioMs, lastOutputTextMs, generationCompleteMs, turnCompleteMs, words, ...
//   node run.mjs --only C02 --name live40-smoke        (one chain)
//   node run.mjs --name live40-r1                      (all 31 chains)
//   node run.mjs --dry [--dry-fail C05] --name live40-dry   (no network: fake session on a virtual clock; see dry-check.mjs)
// The key is read in-process from MAIN/.env and never printed or written (every string saved or logged is scrubbed of it).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/live40`;
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const flag = (k) => process.argv.includes(k);
const DRY = flag('--dry');
const NAME = arg('--name') ?? (DRY ? 'live40-dry' : 'live40-r1');
const ONLY = arg('--only')?.split(',');
const CONTEXT_FROM = arg('--context-from') ?? 'S1Q02';
const GAP_MS = Number(arg('--gap-ms') ?? 10000);
const CHAIN_PAUSE_MS = Number(arg('--chain-pause-ms') ?? 1500);
const DRY_FAIL = arg('--dry-fail');
const MODEL = 'gemini-3.8-live';
const ANSWER_WORDS = 25, QUIET_AFTER_ANSWER_MS = 6000, QUIET_AFTER_SHORT_MS = 30000, NO_OUTPUT_MS = 60000, CAP_MS = 150000;
const CHUNK = 1920; // 60 ms of 16 kHz mono s16le

const { chains: ALL_CHAINS, items: ITEMS } = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const MANIFEST = JSON.parse(fs.readFileSync(`${HERE}/clips/manifest.json`, 'utf8')).clips;
const CHAINS = ONLY ? ONLY.map((c) => { const x = ALL_CHAINS.find((y) => y.chain === c); if (!x) { console.log(`--only ${c}: no such chain`); process.exit(2); } return x; }) : ALL_CHAINS;

let apiKey = '', GoogleGenAI = null, mock = null;
if (DRY) mock = await import(`file:///${HERE}/mock-session.mjs`);
else {
    GoogleGenAI = createRequire(`${MAIN}/package.json`)('@google/genai').GoogleGenAI;
    const env = fs.readFileSync(`${MAIN}/.env`, 'utf8');
    apiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
    if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }
}
const scrub = (s) => (apiKey ? String(s).split(apiKey).join('[key]') : String(s));

// System instruction: L20d's instruction.txt (hash-checked) + CONTEXT, appended exactly as L20d's systemFor() does.
const P = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`, 'utf8'));
const INSTRUCTION_SHA256 = 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f';
const INSTRUCTION = fs.readFileSync(`${SP}/l20d/instruction.txt`, 'utf8').replace(/\r\n/g, '\n');
if (createHash('sha256').update(INSTRUCTION).digest('hex') !== INSTRUCTION_SHA256) { console.log('l20d/instruction.txt does not match its registered sha256: refusing to run'); process.exit(2); }
function systemFor(main) {
    const p = P[main];
    if (!p?.system || !p?.user) throw new Error(`${main}: no captured s50k prompt`);
    const a = p.user.indexOf('CONTEXT:'), b = p.user.indexOf('USER QUESTION:');
    if (a < 0 || b < a) throw new Error(`${main}: CONTEXT / USER QUESTION markers not found in the captured prompt`);
    return `${INSTRUCTION}\n\n${p.user.slice(a, b).trim()}`;
}
const SYSTEM = systemFor(CONTEXT_FROM);
const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

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
    const frames = Math.floor(src.length / ch), f = rate / 16000; // nearest-sample decimation, as L20d
    const out = new Int16Array(Math.floor(frames / f));
    for (let i = 0; i < out.length; i++) out[i] = src[Math.floor(i * f) * ch];
    return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}
// Fail before any network call if a clip is missing or its hash drifted from the manifest.
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const CLIPS = {};
for (const c of CHAINS) for (const id of c.items) {
    const m = MANIFEST[id];
    if (!m || !fs.existsSync(m.path)) throw new Error(`${id}: clip missing`);
    if (sha12(fs.readFileSync(m.path)) !== m.sha12) throw new Error(`${id}: clip changed since the manifest`);
    CLIPS[id] = clipPcm16k(id);
}

const now = () => (DRY ? mock.vclock.t : Date.now());
const sleep = DRY ? mock.vsleep : (ms) => new Promise((r) => setTimeout(r, ms));
let T0 = now();
const T0_ISO = new Date(Date.now()).toISOString();
const rel = () => now() - T0;
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
const outDir = `${HERE}/runs`;
fs.mkdirSync(outDir, { recursive: true });

// ---- metrics (ms are since the turn's clipEnd) ----
function metricsFor(label) {
    const idx = events.map((e, i) => (e.item === label ? i : -1)).filter((i) => i >= 0);
    const mine = idx.map((i) => events[i]);
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
function answerFor(label) {
    const mine = events.filter((e) => e.item === label);
    const ce = mine.find((e) => e.kind === 'clipEnd');
    const cut = ce ? mine.indexOf(ce) : Infinity;
    const out = mine.filter((e, j) => e.kind === 'outputTx' && j > cut).map((e) => e._text ?? '').join('');
    const outEarly = mine.filter((e, j) => e.kind === 'outputTx' && j < cut).map((e) => e._text ?? '').join('');
    const heard = mine.filter((e) => e.kind === 'inputTx').map((e) => e._text ?? '').join('');
    return { text: out, textBeforeClipEnd: outEarly, heard };
}
function save() {
    const labels = [...new Set(events.map((e) => e.item).filter(Boolean))];
    const metrics = Object.fromEntries(labels.map((l) => [l, metricsFor(l)]));
    const drop = (k, v) => (k === '_text' ? undefined : v);
    fs.writeFileSync(`${outDir}/${NAME}.json`, JSON.stringify({ model: MODEL, level: 'none', dry: DRY, name: NAME, instruction: INSTRUCTION_SHA256, contextFrom: CONTEXT_FROM, systemSha12: sha12(SYSTEM), t0Iso: T0_ISO, only: ONLY ?? null,
        chains: CHAINS, gapMs: GAP_MS, answerWords: ANSWER_WORDS, quietAfterAnswerMs: QUIET_AFTER_ANSWER_MS, quietAfterShortMs: QUIET_AFTER_SHORT_MS, noOutputMs: NO_OUTPUT_MS, capMs: CAP_MS, sessions, metrics, events }, drop, 1));
    const answers = Object.fromEntries(labels.map((l) => [l, { chain: ITEM[l.replace(/~a\d+$/, '')]?.chain, route: ITEM[l.replace(/~a\d+$/, '')]?.route, class: ITEM[l.replace(/~a\d+$/, '')]?.class, ...answerFor(l), words: metrics[l].words, turnWords: metrics[l].turnWords }]));
    fs.writeFileSync(`${outDir}/${NAME}.answers.json`, JSON.stringify({ name: NAME, model: MODEL, answers }, null, 1));
}
process.on('SIGINT', () => { try { save(); } catch { /* noop */ } process.exit(130); });

const ai = DRY ? null : new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
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
                else if (p.inlineData) ev('audio', { bytes: p.inlineData.data?.length ?? 0 });
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
    let session;
    try {
        session = DRY
            ? mock.mockConnect(callbacks, DRY_FAIL === chain.chain && attempt === 1 ? { failAfterChunks: 40 } : {})
            : await ai.live.connect({
                model: MODEL,
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
        let tailZero = 0; for (let i = pcm.length - 2; i >= 0 && pcm[i] === 0 && pcm[i + 1] === 0; i -= 2) tailZero++; // clips end in digital silence: clipEnd is that long after the last speech sample
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
        while (!st.closed) {
            session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } });
            await sleep(60);
            const waited = rel() - waitFrom, quiet = rel() - Math.max(st.lastEventAt, waitFrom);
            if (waited >= CAP_MS) { ev('cap'); reason = 'cap'; break; }
            if (st.turnOpen) continue;
            if (!st.lastTurn) { if (waited >= NO_OUTPUT_MS) { ev('noOutput'); reason = 'noOutput'; break; } continue; }
            const answerLike = st.lastTurn.words >= ANSWER_WORDS || st.lastTurn.error;
            if (quiet >= (answerLike ? QUIET_AFTER_ANSWER_MS : QUIET_AFTER_SHORT_MS)) { reason = answerLike ? 'quietAfterAnswer' : 'quietAfterShort'; break; }
        }
        ev('itemDone', { waitedMs: rel() - waitFrom, reason });
        const m = metricsFor(id);
        console.log(`   ${id}: firstText ${m.firstOutputTextMs ?? '-'} ms, firstAudio ${m.firstAudioMs ?? '-'} ms, lastText ${m.lastOutputTextMs ?? '-'} ms, gen ${m.generationCompleteMs ?? '-'} ms, turn ${m.turnCompleteMs ?? '-'} ms, ${m.words} words, early ${m.earlyOutputTx}`);
    }
    try { session.close(); } catch { /* noop */ }
    await sleep(CHAIN_PAUSE_MS);
    const abnormal = st.closed && st.closed.code !== 1000;
    const complete = ids.every((id) => played.has(id) && generated.has(id));
    return { closed: st.closed, abnormal: !!abnormal, complete };
}

for (const chain of CHAINS) {
    const startIdx = events.length;
    ev('chainStart', { chain: chain.chain, items: chain.items });
    let r = await runChain(chain, 1);
    sessions.push({ chain: chain.chain, items: chain.items, attempt: 1, ...r });
    if (r.abnormal && !r.complete) {
        for (const e of events.slice(startIdx)) if (chain.items.includes(e.item)) e.item = `${e.item}~a1`;
        current = { id: null, clipEndMs: null };
        ev('retryChain', { chain: chain.chain });
        r = await runChain(chain, 2);
        sessions.push({ chain: chain.chain, items: chain.items, attempt: 2, ...r });
    }
    save();
}
save();
console.log(`wrote ${outDir}/${NAME}.json and ${NAME}.answers.json`);
process.exit(0);
