// Task 5 fix round 1 (throwaway): the refusal, end to end through the extractor CLI (the seam where an operator meets it). A run folder
// built from the real adapter's log (t5-seam\adapter-natively_debug.log) with ONE event line dropped (the one directly above a repair)
// is fed to MAIN's modified extractor from %TEMP%: it must exit non-zero, name the line in its error, and write NO fixture.
// Calibration: the same broken run through the ROUND-0 build (the current extractor beside the round-0 module, no refusals) exits 0 and
// silently writes a fixture that holds the wrong final "hallucinations How do you cut", the situation the refusal exists for.
// Output under t5-seam\ only.
//   node t5f1-extractor-refusal.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SEAM = path.join(HERE, 't5-seam');
const lines = fs.readFileSync(path.join(SEAM, 'adapter-natively_debug.log'), 'utf8').split('\n');
const k = lines.findIndex((l) => l.includes('restored "hallucinations"'));       // R22's repair line
if (k < 1) throw new Error('R22 repair line not found in the adapter log');
const RUN = path.join(SEAM, 'run-broken'), TTS = path.join(SEAM, 'tts');
fs.rmSync(RUN, { recursive: true, force: true });
fs.mkdirSync(RUN, { recursive: true });
fs.mkdirSync(TTS, { recursive: true });
fs.writeFileSync(path.join(RUN, 'natively_debug.log'), lines.filter((_, i) => i !== k - 1).join('\n'));   // drop R22's F2 event line
fs.writeFileSync(path.join(RUN, 'interview60.timeline.json'), JSON.stringify({ startedMs: Date.parse('2026-09-29T12:00:02.000Z'), rosterLabel: 'synthetic-broken', items: [] }));
const run = (script, out) => { fs.rmSync(out, { force: true }); const r = spawnSync(process.execPath, [script, RUN, TTS, '--out', out], { cwd: os.tmpdir(), encoding: 'utf8' }); return { ...r, wrote: fs.existsSync(out), out }; };
let bad = 0;
const check = (label, ok, detail = '') => { if (!ok) bad++; console.log(`[${ok ? 'ok' : 'FAIL'}] ${label}${detail ? ': ' + detail : ''}`); };
const neu = run(path.join(MAIN, 'electron/test/golden/interview60.turns-fixture.mjs'), path.join(SEAM, 'out-broken-new.json'));
const msg = (neu.stderr.match(/finalsFrom: line \d+ is a boundary repair[^\n]*/) ?? [''])[0];
check('MODIFIED extractor refuses the broken run: exit code non-zero, names the line, writes no fixture', neu.status !== 0 && /finalsFrom: line \d+ is a boundary repair for another final than line \d+/.test(msg) && !neu.wrote, `exit ${neu.status}, "${msg}", fixture written: ${neu.wrote}`);
check('the line named is R22\'s repair line (1-based ' + (k) + ' in the broken log = ' + (k + 1) + ' in the intact one)', new RegExp(`line ${k} is a boundary repair for another final than line ${k - 1}`).test(msg), msg);
// calibration: the ROUND-0 build (MAIN's current extractor + the round-0 module without refusals, side by side in a scratch folder)
const R0 = path.join(SEAM, 'ext-round0');
fs.rmSync(R0, { recursive: true, force: true });
fs.mkdirSync(R0, { recursive: true });
fs.writeFileSync(path.join(R0, 'interview60.turns-fixture.mjs'), fs.readFileSync(path.join(MAIN, 'electron/test/golden/interview60.turns-fixture.mjs')));
fs.writeFileSync(path.join(R0, 'interview60.turns-finals.mjs'), fs.readFileSync(path.join(HERE, 't5f1-orig', 'interview60.turns-finals.mjs')));
const old = run(path.join(R0, 'interview60.turns-fixture.mjs'), path.join(SEAM, 'out-broken-round0.json'));
let oldText = '(no fixture)';
if (old.wrote) oldText = JSON.parse(fs.readFileSync(old.out, 'utf8')).finals.map((f) => f.text).find((t) => /^hallucinations /.test(t)) ?? '(not found)';
check('calibration: the ROUND-0 extractor (no refusals) accepts the same broken run silently and glues the word onto the wrong final', old.status === 0 && old.wrote && oldText === 'hallucinations How do you cut', `exit ${old.status}; the fixture holds ${JSON.stringify(oldText)}`);
console.log(bad ? `RESULT: ${bad} problem(s)` : 'RESULT: the extractor now refuses a log whose repair line is not under its own final; the round-0 build silently produced a wrong final');
process.exit(bad ? 1 : 0);
