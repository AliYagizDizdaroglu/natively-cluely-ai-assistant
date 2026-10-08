// Throwaway: CRLF-normalise launch-smoke-cues.cmd, then build two dry-run copies of it that stop
// before the Gemini gate (no request, no app). "good" keeps the S1 stimulus build; "bad" drops it,
// so the new stimulus check must refuse the S1,S2 file on disk (calibration of that guard).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SP = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(SP, 'launch-smoke-cues.cmd');
const text = fs.readFileSync(src, 'latin1');
if (/[^\x09\x0a\x0d\x20-\x7e]/.test(text)) { console.log('NON-ASCII in the launcher'); process.exit(1); }
const lines = text.split(/\r?\n/);
if (lines.at(-1) === '') lines.pop();
fs.writeFileSync(src, lines.join('\r\n') + '\r\n', 'latin1');
console.log(`launcher: ${lines.length} lines, rewritten CRLF`);

const gate = lines.findIndex((l) => l.includes('wait-for-gemini.mjs'));
const logLine = lines.findIndex((l) => l.startsWith('set LOG='));
const build = lines.findIndex((l) => l.includes('build-audio-local.mjs'));
if (gate < 0 || logLine < 0 || build < 0 || build > gate) { console.log('launcher shape unexpected', { gate, logLine, build }); process.exit(1); }

for (const variant of ['good', 'bad']) {
    const copy = lines.slice(0, gate)
        .map((l, i) => (i === logLine ? `set LOG=%~dp0smoke-cues-dryrun-${variant}.log` : l))
        .filter((_, i) => !(variant === 'bad' && i === build));
    copy.push('echo DRYRUN_MARKER_PASSED', 'exit /b 0');
    fs.writeFileSync(path.join(SP, `dryrun-smoke-cues-${variant}.cmd`), copy.join('\r\n') + '\r\n', 'latin1');
    console.log(`dryrun-smoke-cues-${variant}.cmd: ${copy.length} lines, cut before line ${gate + 1}`);
}
