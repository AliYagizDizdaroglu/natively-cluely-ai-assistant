// trim.mjs: the displayed cue block of an ARM (SPEC 1.1) and the read-only trimCues version check (SPEC 4.1).
// Arm answer files carry the RAW cues (stripCueBlock's output). The candidate sees trimCues(raw, 3, 5), so the builder applies the SHIPPED trimCues from MAIN's dist.
// Read-only: it requires MAIN's built JS and runs `git show` (a read); it writes nothing. Counts and hashes only are ever printed.
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { MAIN, RUNS, RUN_NAMES, CUE_MAX_LINES, CUE_MAX_WORDS, sha12, wordsOf, readJson } from './lib.mjs';

const rq = createRequire(import.meta.url);
export const DIST_FILTER = `${MAIN}/dist-electron/electron/llm/verbalStreamFilter.js`;
let _dist = null;
/** The shipped trimCues (MAIN's dist). Loaded lazily; throws when the build is missing. */
export function distTrimCues() {
    if (!_dist) { const m = rq(DIST_FILTER); if (typeof m.trimCues !== 'function') throw new Error(`${DIST_FILTER} exports no trimCues`); _dist = m.trimCues; }
    return _dist;
}

/** True when a raw block is over the display limit (more than 3 lines, or a line of more than 5 words). */
export const overLimit = (raw) => raw.length > CUE_MAX_LINES || raw.some((l) => wordsOf(l).length > CUE_MAX_WORDS);

/**
 * The displayed block of a raw arm block: { cues (non-empty displayed lines), shown (all displayed lines incl. ""), emptyDropped, changed, over }.
 * `trim` is injectable so a calibration can break it.
 */
export function displayedArmBlock(raw, trim = distTrimCues()) {
    const t = trim(raw, CUE_MAX_LINES, CUE_MAX_WORDS);
    const shown = t.cues;
    const cues = shown.filter((l) => l !== '');
    return { cues, shown, emptyDropped: shown.length - cues.length, changed: JSON.stringify(shown) !== JSON.stringify(raw), over: overLimit(raw) };
}

// ---------------------------------------------------------------- the trimCues version check
// read-only `git show` against MAIN's object store (shared by every worktree); never a write, whatever the caller's cwd
const git = (...args) => execFileSync('git', ['-C', MAIN, ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
/** The source region from `function cleanNotation(` to the closing brace of trimCues, or null. */
export function trimRegion(ts) {
    const a = ts.indexOf('function cleanNotation(');
    const b = ts.indexOf('export function trimCues(');
    if (a < 0 || b < a) return null;
    const end = ts.indexOf('\n}\n', b);
    return end < 0 ? null : ts.slice(a, end + 3);
}
/** Compiles a region of TS into a callable trimCues (typescript from MAIN's node_modules). */
export function compileRegion(region) {
    const ts = rq(`${MAIN}/node_modules/typescript`);
    const js = ts.transpileModule(region.replace('export function trimCues', 'function trimCues') + '\nglobalThis.__trim = trimCues;', { compilerOptions: { target: 'ES2022', module: 'CommonJS' } }).outputText;
    const ctx = vm.createContext({});
    vm.runInContext(js, ctx);
    return ctx.__trim;
}
/** Every raw cue block of the arm answer files of the given runs (the battery the versions are compared on), as arrays of strings. */
export function rawBattery(runs = ['r1', 'h40d', 'eq']) {
    const out = [];
    for (const r of runs) {
        const dir = `${RUNS}/${RUN_NAMES[r]}`;
        for (const f of fs.readdirSync(dir)) if (/^interview60\.answers\..*\.json$/.test(f) && !/stale/.test(f)) {
            let j; try { j = readJson(`${dir}/${f}`); } catch { continue; }
            for (const v of Object.values(j)) if (v && Array.isArray(v.cues)) out.push(v.cues);
        }
    }
    // a few synthetic lines that exercise the cleanup rules, so a version difference there cannot hide behind clean data
    out.push(['$O(n \\log n)$ time', '**bold** cue', '`code` token here', '\\frac{a}{b} ratio', '$100,000$ budget', 'one two three four five six seven', 'a', 'b', 'c', 'd']);
    return out;
}
/**
 * The version check of SPEC 4.1: the trimCues region of the h40d build, the r1 build and the eq build (git show of the commit each run recorded),
 * plus MAIN's dist, compared by region text hash and by behaviour over the battery. Returns { builds: [{name, commit, regionSha12|null, behaviourSha12}], identicalText, identicalBehaviour }.
 */
export function trimVersionCheck() {
    const battery = rawBattery();
    const behave = (fn) => sha12(JSON.stringify(battery.map((b) => fn(b, CUE_MAX_LINES, CUE_MAX_WORDS))));
    const builds = [];
    for (const r of ['h40d', 'r1', 'eq']) {
        const commit = readJson(`${RUNS}/${RUN_NAMES[r]}/interview60.flight.done.json`).commit;
        let region = null, why = null;
        try { region = trimRegion(git('show', `${commit}:electron/llm/verbalStreamFilter.ts`)); } catch (e) { why = `git show failed (${String(e.message).split('\n')[0].slice(0, 60)})`; }
        builds.push({ name: r, commit: commit.slice(0, 8), regionSha12: region ? sha12(region) : null, behaviourSha12: region ? behave(compileRegion(region)) : null, why: region ? null : (why ?? 'no trimCues region') });
    }
    builds.push({ name: 'dist', commit: 'MAIN dist-electron', regionSha12: null, behaviourSha12: behave(distTrimCues()), why: null });
    const texts = builds.filter((b) => b.regionSha12).map((b) => b.regionSha12), beh = builds.map((b) => b.behaviourSha12);
    return { builds, batteryBlocks: battery.length, identicalText: texts.length > 0 && new Set(texts).size === 1 && builds.every((b) => b.name === 'dist' || b.regionSha12), identicalBehaviour: !beh.includes(null) && new Set(beh).size === 1 };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/trim.mjs')) {
    const r = trimVersionCheck();
    for (const b of r.builds) console.log(`trimCues ${b.name.padEnd(5)} commit ${b.commit}  region ${b.regionSha12 ?? '-'}  behaviour ${b.behaviourSha12 ?? '-'}${b.why ? `  (${b.why})` : ''}`);
    console.log(`battery ${r.batteryBlocks} blocks; region text identical across the three builds: ${r.identicalText}; behaviour identical across the three builds and the dist: ${r.identicalBehaviour}`);
    if (!r.identicalBehaviour) console.log('DIFFERENT: trim each run\'s arm blocks with the function of the build that flew that run (SPEC 4.1) and report it');
}
