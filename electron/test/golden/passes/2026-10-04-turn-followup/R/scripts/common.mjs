// Shared constants and the frozen-material loader for the turn-based follow-up context replay
// (followup-turn/PREREGISTER-turn-followup.md). No side effects on import.
//
// The recorded hashes are NOT copied into this file: section 2 of the registered file is the single source, parsed by
// verifySection2(), which refuses an empty table, a missing row, a hash that differs, a *.mjs under R/ or R/scripts/
// that the table does not list, and a gated block hash that differs. `TURN_PREREG` points at the file to verify
// (default: the registered PREREGISTER-turn-followup.md; before the OK, section2-filled.md).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const R_DIR = path.dirname(HERE);                         // SP/followup-turn/R  (the folder every pass writes into)
export const FT = path.dirname(R_DIR);                           // SP/followup-turn
export const SP = path.dirname(FT);
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const PREREG = process.env.TURN_PREREG ?? path.join(FT, 'PREREGISTER-turn-followup.md');
// FQ_OUT_DIR: only for the synthetic end-to-end / runner self-tests; the real run leaves it unset.
export const OUT_DIR = process.env.FQ_OUT_DIR ?? R_DIR;
export const BLIND_DIR = path.join(OUT_DIR, 'blind');

export const HOURS = { s50m: '2026-09-22T08-22-50-s50m', s50l: '2026-09-21T08-22-34-s50l', s50k: '2026-09-20T11-22-43-s50k' };
export const PRIMARY_HOURS = ['s50m', 's50l'];
// Amendment A1 point 7 / A2 point 3: every primary-hour call finishes before 09:30 local 2026-10-04 (= 06:30Z). Hard-coded; the runner's
// `--stop-at` overrides it for the s50k re-run only (each re-run record carries its own `stopAt`).
export const HARD_STOP = '2026-10-04T06:30:00.000Z';
export const CALL_TIMEOUT_MS = 120000;                           // A2 point 3: per-call timeout on the whole request + stream
export const runDir = (hour) => `${MAIN}/electron/test/golden/interview60.runs/${HOURS[hour]}`;

// Registration section 4: the two legs. The hedge sends the same bytes to both; the front is 3.5-lite HIGH (h40c PASS),
// the back 3.1-lite LOW. Reps: 5 front, 3 back. The back leg runs the roster items only (no D-cases).
export const LEGS = {
    front: { model: 'gemini-3.5-flash-lite', thinking: 'HIGH', reps: 5, kinds: ['roster', 'dropped'] },
    back: { model: 'gemini-3.1-flash-lite', thinking: 'LOW', reps: 3, kinds: ['roster'] },
};
export const ARMS = ['A', 'B'];
export const GRADERS = ['g1', 'g2'];
export const PER_FILE = { front: 2, back: 4 };                   // items per blind file: 7 front files (2 items x 10 answers), 2 back files (4 x 6)
export const MAX_PER_FILE = 24;
export const INSTRUMENT = '8564ba96369a';
export const PINNED_GRADER = 'claude-opus-5-5';
export const FILTER_SHA12 = 'd8fee6ca0170';
export const FILTER_JS = path.join(SP, 'dist-snapshots/main-precue-73d7f01/dist-electron/electron/llm/verbalStreamFilter.js');
export const OLD_REF = path.join(SP, 'followup-context/earlierQuestions.ref.mjs');
// A2 point 6 (M1): the grader dispatch text ("h40d's, verbatim") is pinned beside the judge module; both have a section 2 row.
export const DISPATCH_FILE = path.join(SP, 'validation-hour/h40d-grader-dispatch.txt');
export const DISPATCH_SHA = 'f8d646701e6ee3b160ef4ade64961db82851720d020838d8559bc89bcd5981cd';
export const DISPATCH_BYTES = 9064;
export const JUDGE_REL = 'MAIN/electron/test/golden/interview60.judge.mjs';
export const DISPATCH_REL = '../validation-hour/h40d-grader-dispatch.txt';
export const OLD_REF_SHA ='0459f578e47706424df0c41684a46c041fa52109923c1eb25df1c484d0dda256';
export const REF = path.join(FT, 'earlierQuestion.ref.mjs');

export const sha = (b) => createHash('sha256').update(b).digest('hex');
export const fileFor = (leg, hour, arm, rep) => path.join(OUT_DIR, `interview60.answers.${LEGS[leg].model}_fturn-${hour}-${arm}-r${rep}.json`);
export const answerFiles = (dir = OUT_DIR) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^interview60\.answers\./.test(f)) : []);
/** A2 point 3: `R/STOPPED-<leg>.txt` marks a pass that hit the hard stop; the blind builder and decide refuse while one exists. */
export const stoppedMarkers = (dir = OUT_DIR) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^STOPPED-.+\.txt$/.test(f)) : []);
/** Why a stored record cannot be graded under the hard stop (null = fine). `end` is written by the runner; a record without one falls back
 *  to at + total. Primary-hour records are always held to HARD_STOP; the re-run's records to their own `stopAt`. */
export function recordEndProblem(rec) {
    const end = rec.end ? Date.parse(rec.end) : rec.at ? Date.parse(rec.at) + (Number.isFinite(rec.total) ? rec.total : 0) : NaN;
    if (!Number.isFinite(end)) return 'has neither end nor at';
    const limit = Date.parse(PRIMARY_HOURS.includes(rec.hour) ? HARD_STOP : (rec.stopAt ?? HARD_STOP));
    return end >= limit ? `ends ${new Date(end).toISOString()}, at or after the stop ${new Date(limit).toISOString()}` : null;
}

// ── section 2 verification ────────────────────────────────────────────────────────────────────────────────────────
/** The pairs `<path relative to followup-turn> <value>` of one table cell (cells separate pairs with <br>). */
function pairsIn(cell, valueRx) {
    const out = [];
    for (const part of cell.replace(/`/g, '').split(/<br\s*\/?>/i)) {
        const m = new RegExp(`^\\s*(\\S+)\\s+(${valueRx})\\s*$`).exec(part);
        if (m) out.push([m[1], m[2]]);
    }
    return out;
}
/** Parses section 2 of a registration file: { files: Map rel -> {sha, bytes}, blocks: Map key -> {sha, chars} }. */
export function parseSection2(text) {
    const a = text.indexOf('## 2. Material');
    const b = text.indexOf('\n## 3.', a);
    if (a < 0 || b < 0) throw new Error('section 2 not found');
    const files = new Map(), blocks = new Map();
    for (const line of text.slice(a, b).split('\n')) {
        const cells = line.split('|').map((c) => c.trim());
        const bm = /^\|\s*(s50[mlk]:[A-Za-z0-9]+)\s*\|\s*([0-9a-f]{64})\s*\|\s*(\d+)\s*\|/.exec(line);
        if (bm) { blocks.set(bm[1], { sha: bm[2], chars: Number(bm[3]) }); continue; }
        if (cells.length < 5 || !line.startsWith('|')) continue;
        for (const [rel, h] of pairsIn(cells[2], '[0-9a-f]{64}')) files.set(rel, { ...(files.get(rel) ?? {}), sha: h });
        for (const [rel, n] of pairsIn(cells[3], '[\\d,]+')) files.set(rel, { ...(files.get(rel) ?? {}), bytes: Number(n.replace(/,/g, '')) });
    }
    return { files, blocks };
}
const mjsIn = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).map((f) => path.relative(FT, path.join(dir, f)).replace(/\\/g, '/')) : []);
/** The *.mjs under R/ and R/scripts/ that section 2 of `preregPath` does not list (day-steps decide refuses on any, without printing VOID). */
export function unlistedScripts(preregPath = PREREG) {
    const { files } = parseSection2(fs.readFileSync(preregPath, 'utf8'));
    return [...mjsIn(R_DIR), ...mjsIn(HERE)].filter((rel) => !files.has(rel));
}
/** Every file the table lists must exist with that sha256 and size; every *.mjs in R/ and R/scripts/ must be listed. */
export function verifySection2(preregPath = PREREG) {
    const problems = [];
    let parsed;
    try { parsed = parseSection2(fs.readFileSync(preregPath, 'utf8')); } catch (e) { return { ok: false, problems: [`${preregPath}: ${e.message}`], files: 0, blocks: 0 }; }
    const { files, blocks } = parsed;
    if (!files.size) problems.push('section 2 has no hash cells (an empty table is not a verification)');
    for (const [rel, v] of files) {
        const f = rel.startsWith('MAIN/') ? path.join(MAIN, rel.slice(5)) : path.resolve(FT, rel);
        if (!fs.existsSync(f)) { problems.push(`${rel}: file missing`); continue; }
        const buf = fs.readFileSync(f);
        if (!v.sha) problems.push(`${rel}: no sha256 in the table`);
        else if (sha(buf) !== v.sha) problems.push(`${rel}: sha256 ${sha(buf).slice(0, 12)}... is not the registered ${v.sha.slice(0, 12)}...`);
        if (v.bytes !== undefined && buf.length !== v.bytes) problems.push(`${rel}: ${buf.length} bytes, registered ${v.bytes}`);
    }
    for (const rel of [...mjsIn(R_DIR), ...mjsIn(HERE)]) if (!files.has(rel)) problems.push(`${rel}: a script under R/ that section 2 does not list`);
    for (const rel of ['earlierQuestion.ref.mjs', 'earlierQuestion.ref.test.mjs', 'gate-report-turn.mjs', 'stamp-turn.mjs', 'R/s50m-gated-turn.json', 'R/s50l-gated-turn.json', 'R/s50k-gated-turn.json', 'R/turn-parity-s50m.json', 'R/turn-parity-s50l.json', 'R/turn-parity-s50k.json', '../followup-context/earlierQuestions.ref.mjs', '../followup-questions-s50l/followup-replay-build.precue.mjs', '../dist-snapshots/main-precue-73d7f01/dist-electron/electron/llm/verbalStreamFilter.js', JUDGE_REL, DISPATCH_REL]) {
        if (!files.has(rel)) problems.push(`${rel}: required row missing from section 2`);
    }
    if (files.has('../followup-context/earlierQuestions.ref.mjs') && files.get('../followup-context/earlierQuestions.ref.mjs').sha !== OLD_REF_SHA) problems.push('the design-2 reference row is not 0459f578...');
    const disp = files.get(DISPATCH_REL);
    if (disp && (disp.sha !== DISPATCH_SHA || disp.bytes !== DISPATCH_BYTES)) problems.push(`the dispatch-text row is not ${DISPATCH_SHA.slice(0, 8)}...${DISPATCH_SHA.slice(-4)}, ${DISPATCH_BYTES} bytes`);
    const flt = files.get('../dist-snapshots/main-precue-73d7f01/dist-electron/electron/llm/verbalStreamFilter.js');
    if (flt && !(flt.sha ?? '').startsWith(FILTER_SHA12)) problems.push(`the filter row is not ${FILTER_SHA12}`);
    // gated blocks: the registered per-block sha256 must equal the gated files' (checked against the frozen JSON, hash-only)
    for (const hour of Object.keys(HOURS)) {
        const gf = path.join(R_DIR, `${hour}-gated-turn.json`);
        if (!fs.existsSync(gf)) continue;
        const G = JSON.parse(fs.readFileSync(gf, 'utf8'));
        for (const [key, o] of Object.entries(G)) {
            const reg = blocks.get(key);
            if (!reg) problems.push(`${key}: gated block hash missing from section 2`);
            else if (reg.sha !== sha(o.block) || reg.chars !== o.block.length) problems.push(`${key}: block sha256/chars differ from section 2`);
        }
        for (const key of blocks.keys()) if (key.startsWith(`${hour}:`) && !G[key]) problems.push(`${key}: registered block not in the gated file`);
    }
    return { ok: problems.length === 0, problems, files: files.size, blocks: blocks.size };
}

// ── the frozen material ───────────────────────────────────────────────────────────────────────────────────────────
/** Refuses unless section 2 verifies and every arm B is exactly insertBlock(userA, block). Returns { G (key -> item), ref }. */
export async function loadGated(hours = PRIMARY_HOURS, { skipVerify = false } = {}) {
    if (!skipVerify) {
        const v = verifySection2();
        if (!v.ok) throw new Error(`section 2 of ${PREREG} does not verify:\n  ${v.problems.slice(0, 12).join('\n  ')}`);
    }
    if (sha(fs.readFileSync(OLD_REF)) !== OLD_REF_SHA) throw new Error(`${OLD_REF} is not the hashed design-2 reference (${OLD_REF_SHA.slice(0, 8)}...)`);
    const ref = await import(pathToFileURL(REF).href);
    const G = {};
    for (const hour of hours) {
        const part = JSON.parse(fs.readFileSync(path.join(R_DIR, `${hour}-gated-turn.json`), 'utf8'));
        for (const [key, o] of Object.entries(part)) {
            if (key !== `${hour}:${o.id}` || o.hour !== hour) throw new Error(`${key}: key/hour/id disagree`);
            if (!o.system || !o.current || !o.block || !o.userA) throw new Error(`${key}: an empty field in the frozen material`);
            if (ref.insertBlock(o.userA, o.block) !== o.userB) throw new Error(`${key}: userB is not insertBlock(userA, block)`);
            if (!['roster', 'dropped'].includes(o.kind)) throw new Error(`${key}: unknown kind ${o.kind}`);
            G[key] = o;
        }
    }
    return { G, ref };
}
/** The items one leg calls, in walk order: per hour the gated roster ids (file order) then the D-cases (front only). */
export function itemsFor(G, leg, hours) {
    const kinds = LEGS[leg].kinds;
    return hours.flatMap((hour) => Object.keys(G).filter((k) => k.startsWith(`${hour}:`) && kinds.includes(G[k].kind)));
}
