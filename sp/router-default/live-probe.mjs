// Task 3 live probe of gemini-3.8-live on the BUILT LiveRouterSession (PLAN Task 3, spec 9.3).
//   node live-probe.mjs [--dist <dist-electron dir>]            real: one Live connection, 4 clips, one forced reconnect
//   node live-probe.mjs --dry [--dry-break-sha] [--dist <dir>]  no network, no key: a scripted fake replaces ONLY connectFn
// The dry path and the real path are the same code apart from realConnect (and getApiKey, which dry fakes). The dry run still
// REQUIRES the built dist (the TS sources are not loadable from node), so it can run only after the controller's build.
// Prints ids, classes, ms, routes, reasons, word counts and [Router] lines (shas/chars only). Never a key, never transcript text.
// Exit: 0 PROBE PASS, 1 PROBE FAIL <reason>, 2 usage/setup refusal.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const DRY = flag('--dry'), DRY_BREAK = flag('--dry-break-sha');
if (DRY_BREAK && !DRY) { console.log('REFUSED (exit 2): --dry-break-sha needs --dry'); process.exit(2); }

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT_A = `${MAIN}/.claude/worktrees/live-router-a`;
const DIST = path.resolve(argOf('--dist') ?? `${WT_A}/dist-electron`);
const CLIPS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/live40/clips';
const ORDER = ['RE05', 'RH02', 'RE13', 'RH16'];            // spec order; RE = EASY, RH = HARD
const clsOf = (id) => (id.startsWith('RE') ? 'EASY' : 'HARD');
// Fixed fixture: the shape of Task 2's Full-test summary (3 lines). The in-app summary is proven by the smoke (Task 17).
const FIXTURE = 'Candidate: Ada Example.\nSkills: TypeScript, Kubernetes, PostgreSQL.\nTarget role: Senior backend engineer at a payments company.';
const sha12 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lines = [];
const out = (s) => console.log(s);
const fail = (reason) => { out(`PROBE FAIL ${reason}`); return 1; };

const sessionJs = `${DIST}/electron/audio/LiveRouterSession.js`;
const readerJs = `${DIST}/electron/services/routeReader.js`;
const earJs = `${DIST}/electron/audio/GeminiLiveRouter.js`;
for (const f of [sessionJs, readerJs, earJs]) if (!fs.existsSync(f)) { out(`REFUSED (exit 2): built file missing: ${f} (the controller builds first)`); process.exit(2); }
const req = createRequire(sessionJs);
const { LiveRouterSession, ROUTER_MODEL, ROUTER_SHAS_OK, INSTRUCTION_SHA256, BLOCK_B_SHA256 } = req(sessionJs);
const reader = req(readerJs);
const { resampleTo16kMono } = req(earJs);

// ---- the fake (dry only): the one thing that differs from the real run ------------------------------------------------------------
// It listens to the audio the session sends: a run of non-zero chunks is an utterance, the first ~600 ms of zeros after it ends it.
// The n-th utterance gets the n-th class of ORDER, so the probe's own code path is untouched by --dry.
function makeFakeConnect() {
  let utter = 0;
  return async ({ callbacks }) => {
    let speech = false, zeros = 0;
    const sess = {
      sendRealtimeInput({ audio }) {
        const b = Buffer.from(audio.data, 'base64');
        const silent = !b.some((x) => x !== 0);
        if (!silent) { speech = true; zeros = 0; return; }
        if (!speech) return;
        if (++zeros < 10) return;                       // 10 x 60 ms of silence
        speech = false; zeros = 0;
        const cls = clsOf(ORDER[utter++ % ORDER.length]);
        const say = (t) => callbacks.onmessage({ serverContent: { outputTranscription: { text: t } } });
        const parts = cls === 'EASY' ? ['Docker is a ', 'tool that packages an ', 'application with its dependencies ', 'into a portable container so it ', 'runs the same everywhere.'] : ['hard'];
        parts.forEach((p, i) => setTimeout(() => say(p), 40 * (i + 1)));
        setTimeout(() => callbacks.onmessage({ serverContent: { generationComplete: true } }), 40 * parts.length + 40);
        setTimeout(() => callbacks.onmessage({ serverContent: { turnComplete: true } }), 40 * parts.length + 80);
      },
      sendToolResponse() {},
      close() { setTimeout(() => callbacks.onclose({ code: 1000, reason: 'dry close' }), 5); },
    };
    setTimeout(() => callbacks.onmessage({ setupComplete: {} }), 20);
    return sess;
  };
}
async function makeRealConnect() {
  // Same call as GeminiLiveRouter / LiveRouterSession's defaultConnect; the key is read in-process and never printed.
  const env = fs.readFileSync(`${MAIN}/.env`, 'utf8');
  const apiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
  if (!apiKey) { out('GEMINI_API_KEY absent from MAIN .env'); process.exit(2); }
  out('key: GEMINI_API_KEY present in MAIN .env (value not printed)');
  const { GoogleGenAI } = req('@google/genai');
  return { apiKey, connect: async ({ apiKey: k, model, config, callbacks }) => new GoogleGenAI({ apiKey: k, apiVersion: 'v1beta' }).live.connect({ model, config, callbacks }) };
}

async function main() {
  // 1. load and assert
  out(`mode=${DRY ? 'DRY' + (DRY_BREAK ? ' (break-sha)' : '') : 'REAL'} dist=${DIST}`);
  if (ROUTER_MODEL !== 'gemini-3.8-live') return fail(`ROUTER_MODEL is ${ROUTER_MODEL}`);
  if (ROUTER_SHAS_OK !== true) return fail('ROUTER_SHAS_OK is not true');
  out(`model=${ROUTER_MODEL} shas_ok=true instruction_sha12=${INSTRUCTION_SHA256.slice(0, 12)} block_sha12=${BLOCK_B_SHA256.slice(0, 12)}`);

  // clips: exist, sha12 against the manifest, 24 kHz mono 16-bit
  const manifest = JSON.parse(fs.readFileSync(`${CLIPS}/manifest.json`, 'utf8')).clips;
  const pcm16 = {};
  for (const id of ORDER) {
    const wav = fs.readFileSync(`${CLIPS}/${id}.wav`);
    if (sha12(wav) !== manifest[id]?.sha12) return fail(`clip ${id} sha12 differs from manifest`);
    const rate = wav.readUInt32LE(24), di = wav.indexOf(Buffer.from('data'), 12);
    if (rate !== 24000 || wav.readUInt16LE(22) !== 1 || wav.readUInt16LE(34) !== 16) return fail(`clip ${id} is not 24 kHz mono 16-bit`);
    pcm16[id] = resampleTo16kMono(wav.subarray(di + 8, di + 8 + wav.readUInt32LE(di + 4)), rate, 1);
  }

  // 2. construct the session
  let apiKey = 'dry-key', realConnect;
  if (DRY) realConnect = makeFakeConnect(); else { const r = await makeRealConnect(); apiKey = r.apiKey; realConnect = r.connect; }
  let lastReal = null, connects = 0, connectLines = 0;
  const wrap = (fn) => async (p) => { connects++; lastReal = await fn(p); return lastReal; };
  const log = (l) => {
    // dry-break-sha: the fake's SECOND connect reports a different context (rule-8 known-answer for the sha check)
    if (DRY_BREAK && l.includes('session connect') && ++connectLines === 2) l = l.replace(/context_sha12=\w+/, 'context_sha12=ffffffffffff');
    lines.push(l);
  };
  const s = new LiveRouterSession({ getApiKey: () => apiKey, getContext: () => FIXTURE, connectFn: wrap(realConnect), log });

  const turns = new Map();            // seq -> { ev, firstWordAt, firstSeenAt }
  let upEvents = 0, lastUpWaiter = null;
  s.on('turn', (ev) => {
    const t = Date.now();
    const rec = turns.get(ev.seq) ?? { firstSeenAt: t, firstWordAt: null, ev };
    rec.ev = ev;
    if (rec.firstWordAt === null && reader.completeFirstWord(ev.text, !!ev.endKind) !== null) rec.firstWordAt = t;
    turns.set(ev.seq, rec);
  });
  s.on('state', (e) => { if (e.up) { upEvents++; if (lastUpWaiter) lastUpWaiter(); } });
  const waitUp = (ms) => new Promise((res, rej) => {
    const to = setTimeout(() => { lastUpWaiter = null; rej(new Error('no state up')); }, ms);
    lastUpWaiter = () => { clearTimeout(to); lastUpWaiter = null; res(); };
  });

  try {
    // 3. start, wait for up, play the clips
    const up1 = waitUp(15000);
    await s.start();
    try { await up1; } catch { return fail('no state up within 15 s of start'); }
    const results = [];
    for (let i = 0; i < ORDER.length; i++) {
      const id = ORDER[i], pcm = pcm16[id];
      const known = new Set(turns.keys());
      for (let o = 0; o < pcm.length; o += 1920) { s.write(pcm.subarray(o, Math.min(o + 1920, pcm.length)), 16000, 1); await sleep(60); }
      const clipEnd = Date.now();
      for (let k = 0; k < 25; k++) { s.write(Buffer.alloc(1920), 16000, 1); await sleep(60); }   // 1.5 s of silence
      const sentEnd = Date.now();
      const find = () => [...turns.entries()].find(([q]) => !known.has(q));
      // wait until the router turn ends, or 12 s (counted from the end of the silence)
      while (Date.now() - sentEnd < 12000) { const f = find(); if (f && f[1].ev.endKind) break; await sleep(50); }
      const f = find();
      if (!f) results.push({ id, cls: clsOf(id), turn: false });
      else {
        const { ev, firstWordAt } = f[1];
        const ended = !!ev.endKind;
        const route = reader.decisionRoute(ev.text, ev.completed, ended);
        const first = reader.completeFirstWord(ev.text, ended);
        const fw = first === null ? null : reader.routeFirstWord(first);
        const chk = reader.checkCompleted(ev.text, ev.completed, ended);
        results.push({ id, cls: clsOf(id), turn: true, ended, endKind: ev.endKind ?? '-', firstTextMs: ev.firstTextAt - clipEnd, firstWordMs: firstWordAt === null ? null : firstWordAt - clipEnd, route, fwRoute: fw ? fw.route : '-', fwReason: fw ? fw.reason : '-', check: chk.reason, words: chk.words });
      }
      if (i === 1) {    // after clip 2: force one real reconnect through the real session's own close()
        const up2 = waitUp(15000);
        try { lastReal.close(); } catch (e) { return fail(`close() threw ${e?.message}`); }
        try { await up2; } catch { return fail('no state up within 15 s of the forced reconnect'); }
        out(`forced reconnect after ${id}: up again`);
      }
    }

    // 4. print: ids, classes, ms, routes, reasons, word counts only
    for (const r of results) {
      out(!r.turn ? `clip ${r.id} ${r.cls} NO TURN`
        : `clip ${r.id} ${r.cls} firstTextMs=${r.firstTextMs} firstWordMs=${r.firstWordMs} endKind=${r.endKind} route=${r.route} firstWordRoute=${r.fwRoute}/${r.fwReason} check=${r.check} words=${r.words}`);
    }
    for (const r of results) if (r.turn) {
      const want = r.cls === 'EASY' ? 'easy-answer' : 'hard';
      if (r.route !== want) out(`MISMATCH ${r.id} expected ${want} got ${r.route}`);
    }
    for (const l of lines) if (l.startsWith('[Router] session')) out(l);

    // 5. verdict
    const conn = lines.filter((l) => l.startsWith('[Router] session connect'));
    const shas = conn.map((l) => /context_sha12=(\w+)/.exec(l)?.[1]);
    const chars = conn.map((l) => Number(/context_chars=(\d+)/.exec(l)?.[1]));
    const ups = lines.filter((l) => l.startsWith('[Router] session up')).length;
    if (conn.length !== 2) return fail(`${conn.length} session connect lines, expected 2`);
    if (shas[0] !== shas[1]) return fail('context sha changed across the forced reconnect');
    if (shas[0] !== sha12(FIXTURE)) return fail('context sha is not the fixture sha');
    if (chars.some((c) => c !== FIXTURE.length)) return fail('context_chars differs from FIXTURE.length');
    if (ups !== 2) return fail(`${ups} session up lines, expected 2`);
    const missing = results.filter((r) => !r.turn || !r.ended).map((r) => r.id);
    if (missing.length) return fail(`no router turn with an end event for ${missing.join(',')}`);
    if (!results.some((r) => r.cls === 'EASY' && r.route === 'easy-answer')) return fail('no EASY clip read easy-answer');
    out('PROBE PASS');
    return 0;
  } finally {
    try { s.stop(); } catch { /* noop */ }
  }
}

main().then((c) => process.exit(c), (e) => { out(`PROBE FAIL exception ${String(e?.message ?? e).replace(/AIza\S+/g, '[key]')}`); process.exit(1); });
