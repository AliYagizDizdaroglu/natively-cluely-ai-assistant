// bundle-1 offline ROUTING REPLAY (SPEC-bundle-1.md section 1.3): shared constants, rosters, clips, systems. NO network, NO model in this file. Prints nothing.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
export const BASE = `${SP}/bundle-1`;
export const ROUTING = `${BASE}/routing`;
export const RUNS = `${ROUTING}/runs`;
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const BUNDLE = `${MAIN}/.claude/worktrees/bundle-1`;
export const GOLDEN = `${MAIN}/electron/test/golden`;
export const GOLDEN_BUNDLE = `${BUNDLE}/electron/test/golden`;   // the harness tools whose dist imports are current (MAIN's dist predates dcefca0)
export const REPAIRED = `${BASE}/bench/r1-repaired`;     // r1 log copy: the HEARD dispatch text for the guard evaluation (numbers only leave this file)

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const sha12 = (s) => sha256(s).slice(0, 12);

// ---- registered values (spec 1.3)
export const CTX_SHA12 = 'b2a43a2159a2', CTX_CHARS = 266;                       // r1 router context: log "session connect" line
export const OLD = { instruction: 'e29bf3810128', block: 'e11c240063ea' };      // B0 = what r1 flew
export const NEW = { instruction: 'c01eff6ff48e', block: '3a1da134e4c7' };      // B1 / V = the bundle build (fix round aa628f6: short-answer clause; was 79ad0f464d95)
export const DEADLINE_MS = 2000;                                                 // routerArbiter.ts DECIDE_MS (spec 4.3)
export const MISROUTED_R1 = ['RH04', 'RH05', 'RH07', 'RH08'];                    // r1's four HARD items routed EASY
export const GUARD_WORDS = 12;                                                   // spec 1.4: fitted on live40, a dispatched question of MORE than this goes to the pipeline

// ---- the app's own route reader (bundle dist), read-only
const req = createRequire(`${BUNDLE}/package.json`);
export const routeReader = () => req(`${BUNDLE}/dist-electron/electron/services/routeReader.js`);
export const routerSession = () => req(`${BUNDLE}/dist-electron/electron/audio/LiveRouterSession.js`);

// ---- rosters: [{ id, parent, key: 'EASY'|'HARD', wav }]
export async function loadRoster(name) {
    if (name === 'live40') {
        const { LIVE40 } = await import(pathToFileURL(`${GOLDEN}/live40.questions.mjs`).href);
        if (LIVE40.length !== 47) throw new Error(`live40 has ${LIVE40.length} items, need 47`);
        return LIVE40.map((i) => ({ id: i.id, parent: i.parent ?? i.chain ?? null, key: i.route, wav: `${GOLDEN}/live40-tts-local/${i.id}.wav` }));
    }
    if (name === 'scenario50') {
        const { SCENARIO50 } = await import(pathToFileURL(`${GOLDEN}/scenario50.questions.mjs`).href);
        if (SCENARIO50.length !== 100) throw new Error(`scenario50 has ${SCENARIO50.length} items, need 100`);
        const items = SCENARIO50.filter((i) => /^S[12]/.test(i.id));      // S1 + S2 only; holdout40 is NEVER used
        if (items.length !== 40) throw new Error(`scenario50 S1+S2 has ${items.length} items, need 40`);
        return items.map((i) => ({ id: i.id, parent: i.chain ?? i.parent ?? null, key: 'HARD', wav: `${GOLDEN}/scenario50-tts-local/${i.id}.wav` }));
    }
    throw new Error(`unknown roster ${name} (live40 | scenario50); holdout40 is never allowed here`);
}
/** Problems in a roster: order, parents played first, clips present. [] = clean. Pure but for the wav existence check. */
export function rosterProblems(items, { clips = true } = {}) {
    const bad = [], seen = new Set();
    for (const it of items) {
        if (it.parent && !seen.has(it.parent)) bad.push(`${it.id}: parent ${it.parent} is not played before it`);
        if (seen.has(it.id)) bad.push(`${it.id}: twice`);
        seen.add(it.id);
        if (!['EASY', 'HARD'].includes(it.key)) bad.push(`${it.id}: key ${it.key}`);
        if (clips && !fs.existsSync(it.wav)) bad.push(`${it.id}: clip missing`);
    }
    return bad;
}

// ---- clips (24 kHz mono 16-bit wav -> 16 kHz by nearest-sample decimation, the L20d / live-all runners' own method)
export function parseWav(buf) {
    const rate = buf.readUInt32LE(24), ch = buf.readUInt16LE(22), bits = buf.readUInt16LE(34);
    if (bits !== 16 || ch !== 1) throw new Error(`wav: ${bits}-bit ${ch}ch`);
    let off = 12, dataOff = -1, dataLen = 0;
    while (off < buf.length - 8) { const id = buf.toString('ascii', off, off + 4); const len = buf.readUInt32LE(off + 4); if (id === 'data') { dataOff = off + 8; dataLen = len; break; } off += 8 + len; }
    if (dataOff < 0) throw new Error('wav: no data chunk');
    const n = Math.floor(Math.min(dataLen, buf.length - dataOff) / 2);
    const samples = new Int16Array(n);
    for (let i = 0; i < n; i++) samples[i] = buf.readInt16LE(dataOff + 2 * i);
    return { rate, samples };
}
export function toPcm16k({ rate, samples }) {
    const f = rate / 16000, out = new Int16Array(Math.floor(samples.length / f));
    for (let i = 0; i < out.length; i++) out[i] = samples[Math.floor(i * f)];
    return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}

// ---- the systems (spec 1.3 "System = the app's bytes")
/** The r1 router context from a file; refuses unless sha12 b2a43a2159a2 AND 266 chars. No file -> refuse (the run stops and the user is asked; nothing is substituted). */
export function loadContext(file, expect = { sha12: CTX_SHA12, chars: CTX_CHARS }) {
    if (!file) throw new Error(`no --context-file: the r1 router context (sha12 ${CTX_SHA12}, ${CTX_CHARS} chars) must be supplied; it cannot be regenerated without the app's resume store. Stop and ask the user (spec 11); a different context is never substituted`);
    const ctx = fs.readFileSync(file, 'utf8');
    if (sha12(ctx) !== expect.sha12 || ctx.length !== expect.chars) throw new Error(`the context in ${path.basename(file)} is sha12 ${sha12(ctx)} / ${ctx.length} chars, not ${expect.sha12} / ${expect.chars}: refusing (a different context is never substituted)`);
    return ctx;
}
/** A USER-RULED substitute context (run.mjs --substitute-context). Any non-empty text; it is NOT the registered context, so its runs are marked substitute and the scorer demands one identical sha across B0, B1 and V. */
export function loadSubstitute(file, registeredSha12 = CTX_SHA12) {
    if (!file) throw new Error('--substitute-context needs a file');
    const ctx = fs.readFileSync(file, 'utf8');
    if (!ctx.trim()) throw new Error('the substitute context is empty');
    if (sha12(ctx) === registeredSha12) throw new Error('that file IS the registered context: use --context-file');
    return ctx;
}
/** B0's system: the OLD instruction (l20d text) and OLD BLOCK_B (router40), in the app's own composition `${INSTRUCTION}\n\n${CONTEXT}\n\n${BLOCK_B}`. */
export async function oldPieces() {
    const instr = fs.readFileSync(`${SP}/l20d/instruction.txt`, 'utf8').replace(/\r\n/g, '\n');
    const { BLOCK_B } = await import(pathToFileURL(`${SP}/router40/r40-common.mjs`).href);
    if (sha12(instr) !== OLD.instruction) throw new Error(`old instruction sha12 ${sha12(instr)}, expected ${OLD.instruction}`);
    if (sha12(BLOCK_B) !== OLD.block) throw new Error(`old block B sha12 ${sha12(BLOCK_B)}, expected ${OLD.block}`);
    return { instr, block: BLOCK_B };
}
export const composeSystem = (instr, ctx, block) => `${instr}\n\n${ctx}\n\n${block}`;
/** { system, shas } for an arm. B1 and V use the BUILT dist's buildRouterSystem (the app's bytes), after its own sha self-check. */
export async function systemFor(arm, ctx) {
    if (arm === 'B0') {
        const { instr, block } = await oldPieces();
        const system = composeSystem(instr, ctx, block);
        return { system, shas: { instruction: OLD.instruction, block: OLD.block, ctx: sha12(ctx), system: sha12(system) } };
    }
    if (arm === 'B1' || arm === 'V') {
        const S = routerSession();
        if (!S.ROUTER_SHAS_OK) throw new Error('the bundle dist reports ROUTER_SHAS_OK=false');
        if (S.INSTRUCTION_SHA256.slice(0, 12) !== NEW.instruction || S.BLOCK_B_SHA256.slice(0, 12) !== NEW.block) throw new Error(`the bundle dist carries ${S.INSTRUCTION_SHA256.slice(0, 12)}/${S.BLOCK_B_SHA256.slice(0, 12)}, expected ${NEW.instruction}/${NEW.block}`);
        const system = S.buildRouterSystem(ctx);
        return { system, shas: { instruction: NEW.instruction, block: NEW.block, ctx: sha12(ctx), system: sha12(system) } };
    }
    throw new Error(`unknown arm ${arm}`);
}
export const ARMS = {
    B0: { roster: 'live40', reps: [1], role: 'calibration (OLD instruction)' },
    B1: { roster: 'live40', reps: [1, 2], role: 'tuning (NEW instruction)' },
    V: { roster: 'scenario50', reps: [1], role: 'validation (NEW instruction), never tuned on' },
};
export const runFile = (arm, rep) => `${RUNS}/${arm}-r${rep}.json`;
