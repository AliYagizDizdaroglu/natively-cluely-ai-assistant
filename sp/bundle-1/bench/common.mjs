// bundle-1 replay bench (SPEC-bundle-1.md section 8): shared constants and pure helpers. NO network, NO model. Prints nothing itself.
// Every id set below is FROZEN by the spec; the helpers refuse (throw) rather than default when an input disagrees with them.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
export const BASE = `${SP}/bundle-1`;
export const BENCH = `${BASE}/bench`;
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const BUNDLE = `${MAIN}/.claude/worktrees/bundle-1`;          // the bundle worktree: its dist is the NEW build, its golden/ holds the runner
export const GOLDEN_MAIN = `${MAIN}/electron/test/golden`;
export const GOLDEN_BUNDLE = `${BUNDLE}/electron/test/golden`;
export const R1_DIR = `${GOLDEN_MAIN}/interview60.runs/2026-10-07T00-22-47-router-default-r1`;
export const REPAIRED = `${BENCH}/r1-repaired`;                      // the COPY the spec re-pairs; r1's own prompts.json is never touched
export const RUNS_DIR = `${BENCH}/runs`;                             // one answers file per arm and rep
export const KEYHOLD = `${BENCH}/keyhold`;                           // the blind key; never inside a dir a grader is pointed at
export const BLIND_DIR = `${BENCH}/blind`;                           // pairs.blind-N.json (what the graders read)

export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const sha12 = (b) => sha256(b).slice(0, 12);
export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const writeJsonNew = (p, v) => { if (fs.existsSync(p)) throw new Error(`${p} exists: refusing to overwrite`); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 1)); };

// ---------------------------------------------------------------- frozen item sets (spec 3.1 and 8)
export const DROPPED_UNCAPTURED = ['EF02', 'RH09', 'RH15', 'EF07', 'RH20'];   // live40's 47 minus these = the 42 (behavioral, never captured)
// The 22 no-cue ids: 23 on r1/smoke heard text (gate-heard.out.txt) minus EF02 (no capture).
export const NOCUE_IDS = ['RE02', 'RE04', 'RE05', 'RE06', 'RE07', 'RE09', 'RE10', 'RE11', 'RE14', 'RE16', 'RE18', 'RE19', 'RE20', 'RH01', 'EF03', 'EF04', 'EF05', 'EF06', 'RH18', 'RH13', 'RH02', 'RH16'];
export const MP = ['RH03', 'RH04', 'RH05', 'RH07', 'RH08', 'RH11', 'RH12', 'RH17', 'RH19'];
export const SH = ['RH06', 'RE10', 'RE14', 'RH16', 'RH19', 'RH13'];
export const SH1 = ['RE10', 'RE14', 'RH16', 'RH13'];
// C1: frozen required cue lines = min(named parts, 3)
export const C1_REQUIRED = { RH03: 1, RH04: 2, RH05: 3, RH07: 3, RH08: 3, RH11: 1, RH12: 3, RH17: 1, RH19: 1 };
// S1: the frozen key each short-answer item must show in its first 5 spoken words
export const S1_KEYS = {
    RH06: /\b(yes|no)\b/, RH16: /\b(yes|no)\b/,
    RE10: /azure functions/, RE14: /parquet/,
    RH19: /real[ -]?time|serverless|batch/,
    RH13: /o of one|constant|o\(1\)|\bo 1\b/,
};

export async function loadLive40() {
    const { LIVE40 } = await import(pathToFileURL(`${GOLDEN_MAIN}/live40.questions.mjs`).href);
    return LIVE40;
}
/** The 42 expected ids in roster order, derived (not typed) from live40; throws if the derivation does not give 42 or the frozen sets do not fit it. */
export function expectedIds(live40) {
    const ids = live40.map((i) => i.id).filter((id) => !DROPPED_UNCAPTURED.includes(id));
    const set = new Set(ids);
    const problems = [];
    if (live40.length !== 47) problems.push(`live40 has ${live40.length} items, need 47`);
    if (ids.length !== 42) problems.push(`expected ids ${ids.length}, need 42`);
    for (const [name, list] of [['NOCUE_IDS', NOCUE_IDS], ['MP', MP], ['SH', SH], ['SH1', SH1]]) for (const id of list) if (!set.has(id)) problems.push(`${name} names ${id}, not in the 42`);
    if (new Set(NOCUE_IDS).size !== 22) problems.push('NOCUE_IDS is not 22 distinct ids');
    for (const id of MP) if (NOCUE_IDS.includes(id)) problems.push(`MP id ${id} is a no-cue id`);
    if (problems.length) throw new Error(`frozen id sets do not fit the roster: ${problems.join('; ')}`);
    return ids;
}
export const cueIds = (ids) => ids.filter((id) => !NOCUE_IDS.includes(id));

// ---------------------------------------------------------------- text helpers (identical to the app's own: promptCapture.ts norm)
export const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const wordCount = (s) => (String(s).trim().match(/\S+/g) || []).length;
/** Jaccard of the word sets of two texts (roster vs heard similarity). */
export function jaccard(a, b) {
    const A = new Set(norm(a).split(' ').filter(Boolean)), B = new Set(norm(b).split(' ').filter(Boolean));
    if (!A.size || !B.size) return 0;
    let n = 0; for (const w of A) if (B.has(w)) n++;
    return n / (A.size + B.size - n);
}

// ---------------------------------------------------------------- stats (declared once; the scorer and its calibration use these)
export const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
/** nearest-rank percentile, p in (0,1] */
export const pctile = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))]; };
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
export const spread = (a) => (a.length ? Math.max(...a) - Math.min(...a) : NaN);

// ---------------------------------------------------------------- the bundle dist (read-only)
const req = createRequire(`${BUNDLE}/package.json`);
export const bundlePrompts = () => req(`${BUNDLE}/dist-electron/electron/llm/prompts.js`);
export const bundleCapture = () => req(`${BUNDLE}/dist-electron/electron/llm/promptCapture.js`);
export const bundleFilter = () => req(`${BUNDLE}/dist-electron/electron/llm/verbalStreamFilter.js`);
/** The r1-era dist (MAIN's dist was not rebuilt since r1): its SPOKEN_LENGTH_AND_DEPTH is the OLD constant. Read-only; verified against the captures themselves by build-arms. */
export const mainPrompts = () => createRequire(`${MAIN}/package.json`)(`${MAIN}/dist-electron/electron/llm/prompts.js`);
