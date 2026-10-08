// Task 5 Step 4 end to end: the MODIFIED extractor (the mirror tree's copy, PLAN-v4 edits applied by r4-tree.mjs)
// over MAIN's s50a run and its tts dir, output into this scratch folder; its `finals` vs the committed fixture's.
// Then the same run over a SYNTHETIC log (s50a's log with one repair line injected after a real final) to
// confirm the extractor itself (not only finalsFrom) carries the restored word through.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const GOLDEN = path.join(MAIN, 'electron/test/golden');
const EXTRACTOR = path.join(HERE, 'tree/electron/test/golden/interview60.turns-fixture.mjs');
const RUN = path.join(GOLDEN, 'interview60.runs/2026-09-09T15-00-55-s50a');
const TTS = path.join(GOLDEN, 'scenario50-tts-local');
const out = path.join(HERE, 's50a-turns.check.json');
const r = spawnSync(process.execPath, [EXTRACTOR, RUN, TTS, '--offset-ms', '1150', '--out', out], { encoding: 'utf8' });
console.log(`extractor exit ${r.status}: ${(r.stdout + r.stderr).trim().replace(HERE, '<scratch>')}`);
const mine = JSON.parse(fs.readFileSync(out, 'utf8'));
const fx = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'fixtures/2026-09-09T15-00-55-s50a-turns.json'), 'utf8'));
console.log(`finals deep-equal: ${JSON.stringify(mine.finals) === JSON.stringify(fx.finals)} (${mine.finals.length} vs ${fx.finals.length}); items deep-equal: ${JSON.stringify(mine.items) === JSON.stringify(fx.items)}; actual deep-equal: ${JSON.stringify(mine.actual) === JSON.stringify(fx.actual)}`);

// synthetic: copy the run dir's two inputs into scratch, inject one repair line after the 10th in-window final
const syn = path.join(HERE, 'syn-run');
fs.mkdirSync(syn, { recursive: true });
fs.copyFileSync(path.join(RUN, 'interview60.timeline.json'), path.join(syn, 'interview60.timeline.json'));
const lines = fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8').split('\n');
const idx = lines.map((l, i) => (/\[DeepgramStreaming\] Transcript event — isFinal=true, text="[^"]/.test(l) ? i : -1)).filter((i) => i >= 0);
const at = idx[40];
const stamp = lines[at].split(' ')[0];
const raw = lines[at].match(/text="((?:[^"\\]|\\.)*)"/)[1];
lines.splice(at + 1, 0, `${stamp} [LOG] [DeepgramStreaming] boundary repair: restored "SYNTHETIC" before "${raw.slice(0, 40)}"`);
fs.writeFileSync(path.join(syn, 'natively_debug.log'), lines.join('\n'));
const out2 = path.join(HERE, 'syn-turns.check.json');
const r2 = spawnSync(process.execPath, [EXTRACTOR, syn, TTS, '--offset-ms', '1150', '--out', out2], { encoding: 'utf8' });
console.log(`synthetic extractor exit ${r2.status}`);
const syn2 = JSON.parse(fs.readFileSync(out2, 'utf8'));
const changed = syn2.finals.filter((f, i) => f.text !== fx.finals[i]?.text);
console.log(`synthetic: ${syn2.finals.length} finals, changed ${changed.length}: ${JSON.stringify(changed)}; raw was ${JSON.stringify(raw)}`);
