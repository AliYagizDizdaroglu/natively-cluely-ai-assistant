// Throwaway (2026-09-29): calibrate seam-analyze.mjs --v4 on the seam2 recording (known answers):
//   1. the spy's clear() count == utterance-ends + empty finals in the recording, and its speechFinal=true
//      count == the recording's non-empty transcripts with speechFinal (the wiring reaches the module);
//   2. rule-v4 under --v4 makes the same plays more complete as check-v4 counted for seam2 (repairs happen);
//   3. without --v4 the spy sees 0 clear() and 0 speechFinal (the flag is what changes the feed).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAMP = '2026-09-29T13-54-49-614Z';
const ev = fs.readFileSync(path.join(HERE, 'seam-probe', `events-${STAMP}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const wantClear = ev.filter((e) => e.kind === 'utterance-end').length + ev.filter((e) => e.kind === 'transcript' && e.isFinal && !e.text).length;
const wantSf = ev.filter((e) => e.kind === 'transcript' && e.text && e.speechFinal === true).length;
const run = (args) => execFileSync(process.execPath, [path.join(HERE, 'seam-analyze.mjs'), STAMP, ...args], { cwd: HERE, encoding: 'utf8' });
const spyV4 = run(['--repair', path.join(HERE, 'spy-repair.mjs'), '--v4']).match(/SPY clear\(\) (\d+); onTranscript (\d+); speechFinal=true (\d+)/);
const spyOld = run(['--repair', path.join(HERE, 'spy-repair.mjs')]).match(/SPY clear\(\) (\d+); onTranscript (\d+); speechFinal=true (\d+)/);
const v4 = run(['--repair', path.join(HERE, 'rule-v4.mjs'), '--v4']);
const fixed = v4.match(/plays the repair made more complete (\d+)/)?.[1];
const sfLine = v4.split('\n').find((l) => l.startsWith('speech_final:'));
const c1 = spyV4 && +spyV4[1] === wantClear && +spyV4[3] === wantSf;
const c3 = spyOld && +spyOld[1] === 0 && +spyOld[3] === 0;
console.log(`1. --v4 spy: clear() ${spyV4?.[1]} (want ${wantClear}), speechFinal=true ${spyV4?.[3]} (want ${wantSf}) -> ${c1 ? 'OK' : 'BAD'}`);
console.log(`2. rule-v4 --v4: plays made more complete ${fixed}; ${sfLine}`);
console.log(`3. without --v4 the spy sees clear() ${spyOld?.[1]}, speechFinal=true ${spyOld?.[3]} (want 0, 0) -> ${c3 ? 'OK' : 'BAD'}`);
process.exit(c1 && c3 && Number(fixed) > 0 ? 0 : 1);
