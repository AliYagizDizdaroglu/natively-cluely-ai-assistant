// Calibration of check-smoke-cues.mjs v3 (rule 8): fake run folders, each with a known answer, asserted; plus a real
// MAIN run folder with no cues lines (h40b). Exit 1 on any mismatch. Also proves run-with-main-env.mjs delivers the
// key NAME to a worktree child.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const SP = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const tmp = path.join(SP, 'calib-cue-runs');
const cues = (arr) => `x [Answer] cues: ${JSON.stringify(arr)}`;
const FULL = 'x [Answer] full: an answer';
const ABORT = 'x [IntelligenceEngine] _what_to_say stream aborted by new generation';
const FAIL_REPEAT = `x [Answer] full: ${JSON.stringify('Could you repeat that? I want to make sure I address your question properly.')}`;
const FAIL_NOANSWER = `x [Answer] full: ${JSON.stringify('[No answer — the answer model failed: got status: 503]')}`;
const EIGHT = ['Blob Storage for data', 'Azure ML for training', 'Model Registry for versioning', 'ACR for images', 'AKS for inference', 'Data Factory for orchestration', 'Entra ID for security', 'Azure Monitor for observability'];
const TRIM_LONG = `x [Answer] cues trimmed: ${JSON.stringify({ rawLines: 8, dropped: EIGHT.slice(3), cut: [], cleaned: [] })}`;   // > 160 chars
const HEDGE = (m) => `x [LLMHelper] verbal hedge: won by ${m} at 812ms; other=aborted`;
const CASES = [
    ['good', [cues(['9,500 churners, 30% recall', '57% precision vs 60%']), FULL, cues(['index by customer id']), FULL], 0],
    ['boundary-3x5', [cues(['a b c d e', 'f g h i j', 'k l m n o']), FULL], 0],
    ['money-dollar', [cues(['$5M budget cap']), FULL], 0],
    ['trimmed-then-cues', ['x [Answer] cues trimmed: {"rawLines":4,"dropped":["d"],"cut":[]}', cues(['a', 'b', 'c']), FULL], 0, /trimmed 1\b/],
    ['four-lines', [cues(['a', 'b', 'c', 'd']), FULL], 1],
    ['six-words', [cues(['one two three four five six']), FULL], 1],
    ['backtick', [cues(['`kubectl apply` first']), FULL], 1],
    ['latex-log', [cues(['O(\\log n) time']), FULL], 1],
    ['absent-block', [cues([]), FULL], 1, null, /hint:/],   // a REAL answer without a block: no pipeline hint
    ['empty-cue', [cues(['Parquet', '']), FULL], 1],
    ['missing-cues-line', [cues(['Parquet']), FULL, FULL], 1],
    // v3 (re-review N1): a superseded generation logs its block but no full line; failed answers are not cue failures
    ['superseded', [cues(['old block']), ABORT, cues(['new block']), FULL], 0, /superseded 1\b/],
    ['extra-cues-unmatched', [cues(['old block']), cues(['new block']), FULL], 1],
    ['failed-no-cues', [cues(['a']), FULL, FAIL_REPEAT], 0, /failed 1\)/],
    ['failed-with-cues', [cues(['a']), FULL, cues(['b']), FAIL_REPEAT], 0],
    ['failed-no-answer-text', [cues(['a']), FULL, FAIL_NOANSWER], 0, /failed answer: "\[No answer/],
    ['real-missing-cues-beside-failure', [cues(['a']), FULL, FULL, FAIL_REPEAT], 1],
    ['all-failed', [FAIL_REPEAT], 1],
    // recheck R1: a stream that ended with no text logs `cues: []` then the failure text: still NOT CLEAN, with the hint
    ['failed-empty-stream', [cues(['a']), FULL, cues([]), FAIL_REPEAT], 1, /hint: an absent block directly before a failed answer/],
    // the JSON is 176 chars; its end lies past v2's 160-char cut, so only a full print matches
    ['trim-printed-in-full', [TRIM_LONG, cues(['a', 'b', 'c']), FULL], 0, /trimmed: \{"rawLines":8.*"cut":\[\],"cleaned":\[\]\}/],
    ['hedge-split-printed', [HEDGE('gemini-3.5-flash-lite'), cues(['a']), FULL, HEDGE('gemini-3.1-flash-lite'), cues(['b']), FULL], 0, /hedge won by: gemini-3\.5-flash-lite 1, gemini-3\.1-flash-lite 1/],
];
let ok = true;
for (const [name, lines, want, mustOut, mustNotOut] of CASES) {
    fs.rmSync(tmp, { recursive: true, force: true });
    const d = path.join(tmp, `2026-01-01T00-00-00-${name}`);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'natively_debug.log'), lines.join('\n') + '\n');
    const r = spawnSync(process.execPath, [path.join(SP, 'check-smoke-cues.mjs'), name, '--runs', tmp], { encoding: 'utf8' });
    const out = `${r.stdout}${r.stderr}`;   // the FULL output, not only its last lines
    const good = r.status === want && (!mustOut || mustOut.test(out)) && (!mustNotOut || !mustNotOut.test(out));
    ok &&= good;
    console.log(`${good ? 'OK ' : 'BAD'} ${name.padEnd(18)} exit ${r.status} (want ${want})  ${out.trim().split('\n').find((l) => l.includes('answers ')) ?? ''}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
const h = spawnSync(process.execPath, [path.join(SP, 'check-smoke-cues.mjs'), 'h40b', '--runs', 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs'], { encoding: 'utf8' });
const hGood = h.status === 1; ok &&= hGood;
console.log(`${hGood ? 'OK ' : 'BAD'} h40b (no cues lines)  exit ${h.status} (want 1)`);
// run-with-main-env: the child must see GEMINI_API_KEY (name only) although the worktree has no .env
fs.writeFileSync(path.join(SP, 'env-name-check.mjs'), "console.log('GEMINI_API_KEY ' + (process.env.GEMINI_API_KEY ? 'SET' : 'MISSING') + ' in ' + process.cwd());\n");
const e = spawnSync(process.execPath, [path.join(SP, 'run-with-main-env.mjs'), path.join(SP, 'env-name-check.mjs')], { cwd: 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn', encoding: 'utf8' });
const eGood = /GEMINI_API_KEY SET/.test(e.stdout) && e.status === 0; ok &&= eGood;
console.log(`${eGood ? 'OK ' : 'BAD'} env: ${(e.stdout + e.stderr).trim()} (exit ${e.status})`);
console.log(ok ? 'SMOKE CHECK CALIBRATION OK' : 'SMOKE CHECK CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
