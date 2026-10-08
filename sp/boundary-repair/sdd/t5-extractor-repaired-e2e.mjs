// Task 5 (throwaway): the modified extractor, end to end, on a log that HOLDS boundary-repair lines: the log the real adapter
// wrote in t5-seam-check.mjs (sdd\t5-seam\adapter-natively_debug.log, 17 repairs) wrapped in a synthetic run folder (a timeline
// with no items, so no WAVs are read). The extractor's `finals` must equal the finals the adapter emitted (emitted-finals.json).
// Calibration: the ORIGINAL extractor (sdd\t5-orig, before Task 5) on the same run must differ on exactly the 17 repaired finals.
// Everything is written under sdd\t5-seam\ (not the repo).  Run t5-seam-check.mjs first.
//   node t5-extractor-repaired-e2e.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SEAM = path.join(HERE, 't5-seam');
const RUN = path.join(SEAM, 'run');
const TTS = path.join(SEAM, 'tts');
const log = fs.readFileSync(path.join(SEAM, 'adapter-natively_debug.log'), 'utf8');
const emitted = JSON.parse(fs.readFileSync(path.join(SEAM, 'emitted-finals.json'), 'utf8'));
fs.rmSync(RUN, { recursive: true, force: true });
fs.mkdirSync(RUN, { recursive: true });
fs.mkdirSync(TTS, { recursive: true });
fs.writeFileSync(path.join(RUN, 'natively_debug.log'), log);
// since = startedMs - 2000 = the fake clock's start (2026-09-29T12:00:00.000Z), so every final counts
fs.writeFileSync(path.join(RUN, 'interview60.timeline.json'), JSON.stringify({ startedMs: Date.parse('2026-09-29T12:00:02.000Z'), rosterLabel: 'synthetic-repaired', items: [] }));
const runExtractor = (script, out) => {
    fs.rmSync(out, { force: true });
    const r = spawnSync(process.execPath, [script, RUN, TTS, '--out', out], { cwd: os.tmpdir(), encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`extractor ${script} failed: ${r.stderr || r.stdout}`);
    return { line: r.stdout.trim(), fixture: JSON.parse(fs.readFileSync(out, 'utf8')) };
};
let bad = 0;
const check = (label, ok, detail = '') => { if (!ok) bad++; console.log(`[${ok ? 'ok' : 'FAIL'}] ${label}${detail ? ': ' + detail : ''}`); };
const repairs = log.split('\n').filter((l) => l.includes('boundary repair: restored')).length;
const neu = runExtractor(path.join(MAIN, 'electron/test/golden/interview60.turns-fixture.mjs'), path.join(SEAM, 'out-new.json'));
console.log(`modified extractor: ${neu.line.replace(/^.*?out-new\.json: /, '')}`);
check('MODIFIED extractor: fixture.finals deep-equals the finals the adapter emitted (repaired words included)', isDeepStrictEqual(neu.fixture.finals, emitted), `${neu.fixture.finals.length} vs ${emitted.length}`);
const old = runExtractor(path.join(HERE, 't5-orig', 'interview60.turns-fixture.mjs'), path.join(SEAM, 'out-old.json'));
console.log(`original extractor: ${old.line.replace(/^.*?out-old\.json: /, '')}`);
const oldDiffers = old.fixture.finals.filter((f, i) => !isDeepStrictEqual(f, emitted[i])).length;
check('calibration: the ORIGINAL extractor differs on exactly the repaired finals', old.fixture.finals.length === emitted.length && oldDiffers === repairs, `${oldDiffers} differ vs ${repairs} repair lines`);
const r22 = neu.fixture.finals.find((f) => f.text.startsWith('hallucinations in a rag answer'));
check('R22 in the fixture: "hallucinations in a rag answer without just making it refuse?"', !!r22 && r22.text === 'hallucinations in a rag answer without just making it refuse?', r22 ? JSON.stringify(r22.text) : 'not found');
console.log(bad ? `RESULT: ${bad} problem(s)` : 'RESULT: the extractor replays the repaired finals; the original did not');
process.exit(bad ? 1 : 0);
