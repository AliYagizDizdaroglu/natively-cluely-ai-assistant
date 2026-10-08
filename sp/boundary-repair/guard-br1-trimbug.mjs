// Guard for the boundary-repair app probe br1, run from the repo root by launch-br1.cmd.
//   pre   before the build: MAIN is at the registered commit and no tracked source file is modified,
//         so the build (and auto()'s own rebuild) compiles exactly the commit under test;
//   post  after the build: the BUILT module behaves as v4 on real sequences (R22 repaired, a normal
//         cut untouched, a real |T| == 1 loss deliberately untouched, the "92%" digit merge not cut,
//         a pause or speech_final forgetting the cut), the built adapter is wired to it (English gate,
//         speech_final, clear()) and logs its line, and the built hedge is on by default.
//         (check-v4-built.mjs is the full equivalence proof; this is the flight-time smoke of the build.)
// Exit 0 = ready; exit 1 = a named check failed. Each check answers differently when its premise is
// broken (calibrated before arming: the pre-fix build, a wrong commit, a v2 module).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const PROJ = process.cwd();
const mode = process.argv[2];
const fail = (msg) => { console.error(`GUARD br1 ${mode} FAILED: ${msg}`); process.exit(1); };
const git = (...a) => execFileSync('git', a, { cwd: PROJ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
// Check 5: the built verbalHedge module reads "on trigger=5000ms" both with no variables and with the
// launcher's own environment. Returns null when it holds, else the reason.
function hedgeDefaultCheck(require, env) {
    const want = '[Main] verbal hedge: on trigger=5000ms';
    let H;
    try { H = require(`${PROJ}/dist-electron/electron/llm/verbalHedge.js`); } catch (e) { return `the built verbalHedge module does not load: ${e.message}`; }
    try {
        const bare = H.describeVerbalHedgeAtStartup({});
        if (bare !== want) return `the built default is not the hedge: "${bare}"`;
        const mine = H.describeVerbalHedgeAtStartup(env);
        if (mine !== want) return `the launcher's environment does not give the hedge: "${mine}"`;
    } catch (e) { return `describeVerbalHedgeAtStartup threw: ${e.message}`; }
    return null;
}

if (mode === 'pre') {
    const want = process.env.NATIVELY_FLIGHT_COMMIT;
    if (!want || !/^[0-9a-f]{40}$/.test(want)) fail(`NATIVELY_FLIGHT_COMMIT is not a full sha: ${want}`);
    const head = git('rev-parse', 'HEAD');
    if (head !== want) fail(`MAIN HEAD is ${head}, not the registered ${want}`);
    // Not through git(): its .trim() would eat the FIRST line's leading status space (" M x" -> "M x"), shifting
    // slice(3) by one so the golden-folder filter misses that line (2026-09-30: it refused the user's own
    // modified interview60.chains.json).
    const dirty = git('status', '--porcelain', '--untracked-files=no', '--', 'electron', 'src', 'scripts', 'package.json')
        .split('\n').filter((l) => l && !l.slice(3).startsWith('electron/test/golden/'));
    if (dirty.length) fail(`tracked source files are modified, the build would not be the commit: ${dirty.join(' | ')}`);
    console.log(`GUARD br1 pre OK: HEAD ${head.slice(0, 7)}, no modified tracked source`);
} else if (mode === 'post') {
    const require = createRequire(`${PROJ}/package.json`);
    let M;
    try { M = require(`${PROJ}/dist-electron/electron/audio/deepgramBoundaryRepair.js`); } catch (e) { fail(`the built module does not load: ${e.message}`); }
    if (typeof M.createBoundaryRepair !== 'function') fail(`the built module exports ${Object.keys(M).join(', ')}, no createBoundaryRepair`);
    // events: [text, isFinal, atMs, speechFinal?] or the string 'clear' (a pause: empty final / UtteranceEnd).
    const run = (events) => { const r = M.createBoundaryRepair(); let last; for (const e of events) { if (e === 'clear') { r.clear(); continue; } const [t, f, at, sf] = e; last = r.onTranscript(t, f, at, sf); } return last; };
    if (typeof M.createBoundaryRepair().clear !== 'function') fail('the built repair has no clear(): this build is not v4');
    // 1. The symptom, h40c R22, verbatim.
    const r22 = run([['How do you cut hallucinations in a rag answer without just making', false, 0], ['How do you cut', true, 17], ['in a rag answer without just making it refuse?', true, 1564]]);
    if (r22.text !== 'hallucinations in a rag answer without just making it refuse?' || JSON.stringify(r22.restored) !== '["hallucinations"]') fail(`R22 not repaired: ${JSON.stringify(r22)}`);
    // 2. A normal cut (the word moved to the next final) stays untouched: s50/after9 logs, M-series.
    const normal = run([['What does a good CI pipeline for a machine learning', false, 0], ['What does a good CI pipeline for a', true, 20], ['machine learning repository actually test?', true, 1500]]);
    if (normal.text !== 'machine learning repository actually test?' || normal.restored !== null) fail(`a normal cut was changed: ${JSON.stringify(normal)}`);
    // 3. v3, not v2: a real loss where the interim ended at the lost word is deliberately left alone
    //    (after7 M28, 2026-09-06): v2 would restore "between" here.
    const tail = run([['How do you keep feature engineering consistent between', false, 0], ['How do you keep feature engineering consistent', true, 20], ['training and serving?', true, 460]]);
    if (tail.text !== 'training and serving?' || tail.restored !== null) fail(`the |T| == 1 branch fires - this build is not v3: ${JSON.stringify(tail)}`);
    // 3b. v4, not v3 (DESIGN-v4 rule 1, the review's probe): smart_format merges "ninety two percent" into
    //     "92%." - no re-spelling, so no cut; v3 inserted "two percent" before the next sentence.
    const pct = run([['accuracy reaching ninety two percent for each', false, 0], ['accuracy reaching 92%.', true, 20], ['For each of those metrics, define the unit of evaluation,', true, 2000]]);
    if (pct.restored !== null) fail(`the digit merge is treated as a cut - this build is not v4: ${JSON.stringify(pct)}`);
    // 3c. v4 rule 3: a pause between F1 and F2 (clear()) forgets the cut; so does speech_final on F1.
    const paused = run([['How do you cut hallucinations in a rag answer without just making', false, 0], ['How do you cut', true, 17], 'clear', ['in a rag answer without just making it refuse?', true, 1564]]);
    if (paused.restored !== null) fail(`clear() does not forget the cut: ${JSON.stringify(paused)}`);
    const ended = run([['How do you cut hallucinations in a rag answer without just making', false, 0], ['How do you cut', true, 17, true], ['in a rag answer without just making it refuse?', true, 1564]]);
    if (ended.restored !== null) fail(`speech_final on the cut final still leaves a cut: ${JSON.stringify(ended)}`);
    // 4. The built adapter is wired to the module, gated to English, passes speech_final, clears on pauses,
    //    and logs the repair line.
    const adapter = fs.readFileSync(`${PROJ}/dist-electron/electron/audio/DeepgramStreamingSTT.js`, 'utf8');
    if (!adapter.includes('deepgramBoundaryRepair')) fail('the built DeepgramStreamingSTT does not import the repair');
    if (!adapter.includes('boundary repair: restored')) fail('the built DeepgramStreamingSTT does not log the repair line');
    if (!adapter.includes('isEnglishLanguage')) fail('the built DeepgramStreamingSTT does not gate the repair to English');
    if (!adapter.includes('speech_final')) fail('the built DeepgramStreamingSTT does not pass speech_final');
    if (!/\.clear\(\)/.test(adapter)) fail('the built DeepgramStreamingSTT never calls clear()');
    // 5. The hedge is the shipped default in the BUILT app (h40c licensed it; the launcher clears the flag).
    const hedgeErr = hedgeDefaultCheck(require, process.env);
    if (hedgeErr) fail(hedgeErr);
    console.log('GUARD br1 post OK: R22 repaired, normal cut untouched, v3 tail rule, v4 (digit merge, clear, speech_final), adapter wired + gated + logging, hedge on by default');
} else if (mode === 'hedge') {
    // Calibration of check 5 alone: prints what it says about the CURRENT dist (FAIL on a build older than
    // the default flip, OK after the rebuild).
    const err = hedgeDefaultCheck(createRequire(`${PROJ}/package.json`), process.env);
    console.log(err ? `hedge check says FAIL: ${err}` : 'hedge check says OK');
    process.exit(err ? 1 : 0);
} else {
    fail('usage: guard-br1.mjs pre|post');
}
