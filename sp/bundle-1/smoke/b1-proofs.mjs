// LAB\bundle-1\smoke\b1-proofs.mjs: the dist proofs of the reduced bundle (AMENDMENT-A1 section 3, S-H), one command. Derived from
// SP\router-default\flight\rd-proofs.mjs (same shape, same exit codes, same --same-as-log rule); the cue build's dist-proof.mjs is NOT
// run here (it pins the pre-bundle ipc/filter markers); the markers and shas of THIS build are checked directly.
//   node b1-proofs.mjs --root <MAIN, absolute> [--same-as-log <launcher log>]
// Prints `B1 PROOF ok|BAD <name> <reading>` lines, `B1 PROOFS <dist file> sha256 <64 hex>` per proof file, and a final
// `B1 PROOFS: ALL PASSED` (exit 0) or `B1 PROOFS: FAILED (<names>)` (exit 1). Usage error: exit 2. Writes nothing; no model call; no secrets read.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
const usage = (m) => { console.log(`B1 PROOFS usage error: ${m}`); console.log('usage: node b1-proofs.mjs --root <MAIN, absolute> [--same-as-log <launcher log>]'); process.exit(2); };
const known = new Set(['--root', '--same-as-log']);
argv.forEach((a, i) => { if (a.startsWith('--') && !known.has(a)) usage(`unknown option ${a}`); if (!a.startsWith('--') && !known.has(argv[i - 1])) usage(`unexpected argument ${a}`); });
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const root = opt('--root');
if (!root || root.startsWith('--')) usage('--root is required');
if (!path.isAbsolute(root)) usage(`--root must be an absolute path: ${root}`);
const D = path.join(root, 'dist-electron', 'electron');
if (!fs.existsSync(D)) usage(`no dist-electron/electron under ${root}`);
const sameAs = opt('--same-as-log');
if (argv.includes('--same-as-log') && (!sameAs || sameAs.startsWith('--'))) usage('--same-as-log needs a file');

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const failed = [];
const row = (ok, name, reading) => { console.log(`B1 PROOF ${ok ? 'ok ' : 'BAD'} ${name} ${reading}`); if (!ok) failed.push(name); };
const rd = (rel) => { const f = path.join(D, rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };

// 1. markers (the task's list) and the absent phrase of the dropped short-answer rule
const MARKERS = [['llm/prompts.js', 'cueRuleApplies'], ['llm/WhatToAnswerLLM.js', 'cue rule: ${cueRuleSent'], ['services/earSilence.js', 'createEarSilenceWatch'],
    ['main.js', 'createEarSilenceWatch'], ['main.js', 'armFaultDrill'], ['main.js', '[Router] flag NATIVELY_LIVE_ROUTER='], ['llm/verbalStreamFilter.js', 'isDanglingCueWord'],
    ['audio/LiveRouterSession.js', 'ROUTER_SHAS_OK'], ['audio/LiveRouterSession.js', 'drillDrop'], ['services/faultDrill.js', 'parseDrill']];
for (const [rel, needle] of MARKERS) { const t = rd(rel); row(t !== null && t.includes(needle), 'marker', `${rel} ${JSON.stringify(needle)}`); }
const ABSENT = 'your FIRST words are that answer itself';
let present = 0;
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js') && fs.readFileSync(p, 'utf8').includes(ABSENT)) present++; } };
walk(D);
row(present === 0, 'absent-phrase', `"${ABSENT}" occurs in ${present} dist file(s), want 0`);

// 2. the shas of the amended build (AMENDMENT-A1 section 1 and 3)
const req = createRequire(path.join(root, 'package.json'));
try {
    const P = req(path.join(D, 'llm', 'prompts.js'));
    const R = req(path.join(D, 'audio', 'LiveRouterSession.js'));
    const RI = req(path.join(D, 'audio', 'routerInstruction.js'));
    row(R.INSTRUCTION_SHA256.slice(0, 12) === 'e29bf3810128', 'router-instruction-sha12', R.INSTRUCTION_SHA256.slice(0, 12));
    row(R.BLOCK_B_SHA256.slice(0, 12) === 'e11c240063ea', 'router-block-b-sha12', R.BLOCK_B_SHA256.slice(0, 12));
    row(R.ROUTER_SHAS_OK === true, 'router-shas-ok', `the built text hashes to its pins: ${R.ROUTER_SHAS_OK}`);
    row(sha256(RI.ROUTER_INSTRUCTION).slice(0, 12) === 'e29bf3810128', 'router-instruction-text', `recomputed ${sha256(RI.ROUTER_INSTRUCTION).slice(0, 12)}`);
    row(sha256(P.VERBAL_TYPED_PROMPT).slice(0, 12) === '4495445db0c2', 'typed-prompt-sha12', sha256(P.VERBAL_TYPED_PROMPT).slice(0, 12));
    row(sha256(P.CUE_RULE).slice(0, 12) === '8e15e4e7dd41', 'cue-rule-sha12', sha256(P.CUE_RULE).slice(0, 12));
    row(sha256(P.SPOKEN_LENGTH_AND_DEPTH).slice(0, 12) === '2cad431fde0c' && P.SPOKEN_LENGTH_AND_DEPTH.length === 2303, 'spoken-length-sha12', `${sha256(P.SPOKEN_LENGTH_AND_DEPTH).slice(0, 12)} ${P.SPOKEN_LENGTH_AND_DEPTH.length} chars`);
    row(P.VERBAL_WHAT_TO_ANSWER_PROMPT === P.VERBAL_TYPED_PROMPT + P.CUE_RULE, 'invariant', 'VERBAL_WHAT_TO_ANSWER_PROMPT === VERBAL_TYPED_PROMPT + CUE_RULE');
    row(typeof P.cueRuleApplies === 'function', 'cueRuleApplies-export', typeof P.cueRuleApplies);
} catch (e) { row(false, 'load', `a built module does not load: ${String(e.message).split('\n')[0]}`); }

// 3. the sha256 of the proof files (before = after the run)
const FILES = ['audio/LiveRouterSession', 'services/routerArbiter', 'services/routeReader', 'services/earSilence', 'services/faultDrill', 'llm/prompts', 'llm/WhatToAnswerLLM'];
const shas = {};
for (const rel of FILES) {
    const f = path.join(D, `${rel}.js`);
    if (!fs.existsSync(f)) { console.log(`B1 PROOFS ${rel}.js MISSING`); failed.push(`${rel}.js missing`); continue; }
    shas[rel] = sha256(fs.readFileSync(f));
    console.log(`B1 PROOFS ${rel}.js sha256 ${shas[rel]}`);
}
// 4. after the run: the dist that flew is the dist that was proven
if (sameAs) {
    let text = ''; let i = -1;
    try { text = fs.readFileSync(sameAs, 'latin1'); i = text.lastIndexOf('=== DIST BEFORE THE RUN ==='); } catch { i = -1; }
    let section = i >= 0 ? text.slice(i) : '';
    const j = section.indexOf('=== DIST AFTER THE RUN ===');
    if (j >= 0) section = section.slice(0, j);
    for (const rel of FILES) {
        const before = i >= 0 ? new RegExp(`B1 PROOFS ${rel}\\.js sha256 ([0-9a-f]{64})`).exec(section)?.[1] ?? null : null;
        if (!before) { console.log(`B1 PROOFS ${rel}.js sha before the run: NOT FOUND in ${sameAs}`); failed.push(`sha-before-not-found ${rel}`); }
        else { const same = before === shas[rel]; console.log(`B1 PROOFS ${rel}.js sha256 unchanged since the run started: ${same ? 'yes' : `NO (${before.slice(0, 12)} before, ${(shas[rel] ?? 'missing').slice(0, 12)} after)`}`); if (!same) failed.push(`sha-changed ${rel}`); }
    }
}
console.log(failed.length ? `B1 PROOFS: FAILED (${failed.join(', ')})` : 'B1 PROOFS: ALL PASSED');
process.exit(failed.length ? 1 : 0);
