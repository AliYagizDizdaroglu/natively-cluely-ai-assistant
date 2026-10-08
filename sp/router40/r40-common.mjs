// router40 shared constants and small helpers (a support module of P2, P3, P4, P5, P6, P8, P9; throwaway like the rest).
// Nothing here calls a network or a model. The captured s50k prompt is read in-process and never printed or written.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
// R40 is this folder wherever it is run from: the real one, or a copy (mutation checks run mutated copies of the whole folder; every path below it follows the copy).
export const R40 = path.dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/');
export const L40 = `${SP}/live40`;
export const E = `${SP}/flight-eq`;
export const FT = `${SP}/followup-turn`;
export const FR = `${FT}/R`;
export const PROMPTS = `${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`;
export const CONTEXT_FROM = 'S1Q02';

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');
export const sha12 = (s) => sha256(s).slice(0, 12);
export const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
export const normWords = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

// The date gate (A2.2, moved by A8.2): router40's grading may start on 2026-10-06 at or after 04:15:00 local (A8: 01:15:00Z). A2.2's 10:00 is replaced.
export const GATE_START = new Date(2026, 9, 6, 4, 15, 0);
export const QUOTA_DAY_START_ISO = '2026-10-06T07:00:00.000Z';
// A5 (tonight): R and L run inside [TONIGHT_START, TONIGHT_END) on 2026-10-05; GATE_START above is kept for tomorrow's `grade` only. The window and its line are defined HERE and read by P9 only.
export const TONIGHT_START = new Date(2026, 9, 5, 21, 45, 0);
export const TONIGHT_END = new Date(2026, 9, 5, 23, 15, 0);
export const TONIGHT_QUOTA_START_ISO = '2026-10-05T07:00:00.000Z';
export const TONIGHT_LINE = 'TONIGHT 2026-10-05: flight-eq not armed; G sitting none';
export const THINKING_LEVEL = 'LOW'; // L's pinned thinking level (A6 reverts A5's HIGH); lite-l.mjs sends it, records it, and its cases pin it

// ---- the routing blocks (registration section 3.1; A1.1 makes B the run variant) ----
const FRAME_1_3 = [
    '[LIVE MODE]',
    "You are listening to a live job interview through the interviewer's microphone. The speaker is the INTERVIEWER; the candidate is described in the context below.",
    'When the interviewer finishes a question, decide:',
];
const FRAME_6_7 = [
    'Wait until the interviewer has finished the whole question before replying. If what you heard is not a question for the candidate, output nothing.',
    '[END LIVE MODE]',
];
export const BLOCK_A = [...FRAME_1_3,
    '- If it is a SHORT FACTUAL question with ONE part, which the candidate can answer in one line (an either/or choice, a yes/no, a name, a number, a complexity class), answer it as the instructions above say, and nothing else.',
    '- Otherwise (several parts, a design or a scenario, an explanation, an experience question, a follow-up that builds on an earlier answer), say exactly the single word "hard" and nothing else.',
    ...FRAME_6_7].join('\n');
export const BLOCK_B = [...FRAME_1_3,
    '- If the interviewer names ONE concept and asks what it is, what it does, or how it differs from one other concept, with no reference to earlier questions, the candidate, or a situation, answer it in at most 80 words.',
    '- Otherwise say the single word hard. Anything with that / this / it / your / earlier / why that / tell me about → hard.',
    ...FRAME_6_7].join('\n');
// registered shas (sections 3.1, A1.1)
export const REGISTERED = {
    A: { block: 'c941c7727c393a2fdeb0f88d179d2c10c26636afb0f7be700d598020cbfb475b', system: 'e87db57f383e59bcfb267445eff8e147e593eb8ea2c28a559f799620b6b9b4a2', tooLong: 150 },
    B: { block: 'e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8', system: '4571f563321f6d9cf738c04b05933016bca9521df5e712142c3472d6009041c5', tooLong: 80 },
};
export const BLOCKS = { A: BLOCK_A, B: BLOCK_B };
export const INSTRUCTION_SHA256 = 'e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f';
export const CONTEXT_SHA256 = 'dd74bbdeaec1be672a652c7fd85dffe5338e25f66d05f4aeaa3fcdeb0fd73792';
export const CAPTURED_SYSTEM_SHA256 = 'd2afcc1f051231da82c244ec2a0372bb1f36c9df2d62fb58c4abe5c0ed935a34';

export function loadInstruction() {
    const t = fs.readFileSync(`${SP}/l20d/instruction.txt`, 'utf8').replace(/\r\n/g, '\n');
    if (sha256(t) !== INSTRUCTION_SHA256) throw new Error('l20d/instruction.txt does not match its registered sha256');
    return t;
}
/** The captured S1Q02 prompt: { system, user, context } (the CONTEXT slice of user, trimmed). Read in-process, never printed. */
export function loadCaptured() {
    const P = JSON.parse(fs.readFileSync(PROMPTS, 'utf8'));
    const p = P[CONTEXT_FROM];
    if (!p?.system || !p?.user) throw new Error(`${CONTEXT_FROM}: no captured s50k prompt`);
    const a = p.user.indexOf('CONTEXT:'), b = p.user.indexOf('USER QUESTION:');
    if (a < 0 || b < a) throw new Error('CONTEXT / USER QUESTION markers not found in the captured prompt');
    return { system: p.system, user: p.user, context: p.user.slice(a, b).trim() };
}
/** R_SYSTEM for a variant, with every sha the registration names checked. Returns { system, blockSha, systemSha, chars }; throws on any mismatch. */
export function buildRSystem(variant, { tamper = false } = {}) {
    if (!REGISTERED[variant]) throw new Error(`unknown variant "${variant}"`);
    const cap = loadCaptured();
    if (sha256(cap.context) !== CONTEXT_SHA256) throw new Error('CONTEXT block sha differs from the registered dd74bbde...');
    if (sha256(cap.system) !== CAPTURED_SYSTEM_SHA256) throw new Error('captured system prompt sha differs from the registered d2afcc1f...');
    let block = BLOCKS[variant];
    if (tamper) block += ' ';
    const system = `${loadInstruction()}\n\n${cap.context}\n\n${block}`;
    const r = { system, blockSha: sha256(block), systemSha: sha256(system), chars: system.length };
    if (r.blockSha !== REGISTERED[variant].block) throw new Error(`BLOCK_${variant} sha ${r.blockSha.slice(0, 12)} is not the registered ${REGISTERED[variant].block.slice(0, 12)}`);
    if (r.systemSha !== REGISTERED[variant].system) throw new Error(`R_SYSTEM (${variant}) sha ${r.systemSha.slice(0, 12)} is not the registered ${REGISTERED[variant].system.slice(0, 12)}`);
    return r;
}

export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const loadItems = () => readJson(`${L40}/items.json`);

// ---- stub inputs (A3.4 guard 7): a real run refuses all of them ----
export const STUB_FLAGS = ['--now', '--stub-now', '--stub-tasks', '--stub-procs', '--stub-ledger', '--stub-ledger-exit', '--stub-gsitting', '--stub-rulings', '--stub-deadline',
    '--stub-registry', '--stub-model', '--stub-url-model', '--stub-fr-slots', '--stub-files', '--grading-dir', '--out-dir', '--counter-path', '--attempt-timeout-ms', '--sleep-scale', '--runs-dir', '--stub-answers', '--stub-arms', '--stub-clock-step-ms'];
export const STUB_ENV = ['R40_FAKE_FETCH', 'R40_FAKE_SCENARIO', 'R40_STUB_NOW', 'R40_STUB_TASKS', 'R40_STUB_PROCS', 'R40_STUB_LEDGER', 'R40_STUB_GSITTING', 'R40_STUB_RULINGS', 'R40_STUB_DEADLINE', 'R40_COUNTER_PATH', 'R40_FAKE_CAPTURE', 'TURN_FAKE_CLAUDE', 'TURN_GRADING_DIR', 'TURN_PROJECTS', 'FQ_OUT_DIR'];
/** The stub inputs set on this argv/env (names only). */
export function stubsSet(argv = process.argv.slice(2), env = process.env) {
    const out = [];
    for (const f of STUB_FLAGS) if (argv.includes(f)) out.push(f);
    for (const k of STUB_ENV) if (env[k] !== undefined && env[k] !== '') out.push(k);
    return out;
}
export const argOf = (argv, k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };

// A8 re-review M-1: a sha256 of the reader's per-item output (id, class, words, T), no text printed: build-blind records it, score-r40 recomputes it.
export const readerOutputSha = (rows) => createHash('sha256').update(JSON.stringify(rows.map((r) => [r.id, r.rc, r.w, r.T]))).digest('hex');
