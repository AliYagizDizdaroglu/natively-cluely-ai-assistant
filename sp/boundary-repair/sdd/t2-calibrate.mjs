// Throwaway (Task 2, rule 8): watch EACH assertion of DeepgramStreamingSTT.boundaryRepair.test.ts fail on its own,
// with one small staged mutant per assertion (the brief's Step 5 hoist covers assertion 1 and is done separately).
//   A: repair-line format         -> assertion 3 (`boundary repair:` lines equal the one expected line)
//   B: repaired text leaks into another log line without the 'boundary repair:' marker -> assertion 4b
//   C: the Transcript event line logs the REPAIRED text -> assertion 4a (raw event line count 2)
//   D: confidence hard-coded 1.0  -> assertion 2
// Every mutant is written to sdd/t2-mutants/, copied into MAIN with the byte-exact helper, tested from a temp cwd with
// --root MAIN, and the WIRED staged file is ALWAYS copied back (finally), then MAIN's sha256 is compared with the stage's.
import fs from 'node:fs';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const SDD = `${SP}/boundary-repair/sdd`;
const WIRED = `${SP}/boundary-repair/stage/electron/audio/DeepgramStreamingSTT.ts`;
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const MAIN_FILE = `${MAIN}/electron/audio/DeepgramStreamingSTT.ts`;
const REL = 'electron/audio/DeepgramStreamingSTT.ts';
const TEST_REL = 'electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts';
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const wiredSha = sha(WIRED);
console.log(`wired staged sha256 ${wiredSha}`);
if (sha(MAIN_FILE) !== wiredSha) { console.log('ABORT: MAIN file is not the wired version; nothing touched'); process.exit(5); }

const wired = fs.readFileSync(WIRED, 'utf8');
const swap = (t, from, to, what) => {
    const i = t.indexOf(from);
    if (i < 0 || t.indexOf(from, i + 1) >= 0) throw new Error(`${what}: anchor found ${i < 0 ? 0 : 'more than 1'} times`);
    return t.slice(0, i) + to + t.slice(i + from.length);
};
const EVENT_LOG = "                        console.log(`[DeepgramStreaming] Transcript event — isFinal=${isFinal}, text=\"${transcript ?? '(empty)'}\"`);\n";
const CALL = '                        const repaired = boundaryRepair.onTranscript(transcript, isFinal, Date.now());\n';
const mutants = [
    ['A: repair line keeps only 30 chars of the final (assertion 3)',
        (t) => swap(t, 'transcript.slice(0, 40)', 'transcript.slice(0, 30)', 'A')],
    ['B: repaired text logged on its own line, no marker (assertion 4b)',
        (t) => swap(t, "before \"${transcript.slice(0, 40)}\"`);\n", "before \"${transcript.slice(0, 40)}\"`);\n                            console.log(`[DeepgramStreaming] repaired text=\"${repaired.text}\"`);\n", 'B')],
    ['C: the Transcript event line logs the repaired text (assertion 4a)',
        (t) => swap(swap(t, EVENT_LOG, '', 'C1'), CALL, CALL + "                        console.log(`[DeepgramStreaming] Transcript event — isFinal=${isFinal}, text=\"${repaired.text}\"`);\n", 'C2')],
    ['D: confidence hard-coded to 1.0 (assertion 2)',
        (t) => swap(t, 'confidence: alt?.confidence ?? 1.0,', 'confidence: 1.0,', 'D')],
];

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
function runHelper(src) {
    const r = spawnSync('node', [`${SP}/copy-into-main.mjs`, src, REL, '--overwrite'], { encoding: 'utf8' });
    return `${r.stdout.trim()}${r.stderr ? ' ' + r.stderr.trim() : ''}`;
}
function runTest() {
    const cmd = `npx --prefix "${MAIN}" vitest run --root "${MAIN}" ${TEST_REL}`;
    const r = spawnSync(cmd, { cwd: os.tmpdir(), shell: true, encoding: 'utf8', timeout: 240000 });
    return strip(`${r.stdout}\n${r.stderr}`);
}
function failureBlock(out) {
    const a = out.indexOf('Failed Tests'); const b = out.indexOf('Test Files');
    const lines = (a >= 0 && b > a ? out.slice(a, b) : out).split('\n').map((l) => l.trimEnd());
    // keep the assertion, the -/+ diff lines, and the source frame; drop blank and box-drawing lines
    const keep = lines.filter((l) => /AssertionError|^\s*[-+] |^\s*[❯>] .*test\.ts:\d+|^\s*\d+\|/.test(l));
    const tests = out.split('\n').find((l) => /^\s*Tests /.test(l)) ?? '(no Tests line)';
    return `${keep.join('\n')}\n${tests.trim()}`;
}

fs.mkdirSync(`${SDD}/t2-mutants`, { recursive: true });
try {
    for (const [label, make] of mutants) {
        const file = `${SDD}/t2-mutants/${label[0]}.ts`;
        fs.writeFileSync(file, make(wired));
        console.log(`\n=== mutant ${label} ===`);
        console.log(`helper: ${runHelper(file)}`);
        console.log(failureBlock(runTest()));
    }
} finally {
    console.log('\n=== restore the wired version ===');
    console.log(`helper: ${runHelper(WIRED)}`);
    console.log(`MAIN sha256 ${sha(MAIN_FILE)}`);
    console.log(sha(MAIN_FILE) === wiredSha ? 'RESTORED: MAIN equals the wired staged file' : 'NOT RESTORED: MAIN differs from the wired staged file');
}
