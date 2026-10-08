// Throwaway (2026-09-29): calibrate br1-read.mjs after the time-and-words pairing change. Five run folders,
// each with a known answer: pass 0, unreached dispatches 1, the pre-fix s50a 1 (no app repair at all), an
// app-only repair 1, a reference-only repair in the middle 4 with the other three still MATCH.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const S50A = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a';
const SYN = path.join(HERE, 'cal', 'br1-synth');
const node = (args, cwd = HERE) => { try { return { code: 0, out: execFileSync(process.execPath, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }; } };
const snapshot = (name) => {
    const d = path.join(HERE, 'cal', `br1v4-${name}`);
    fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
    for (const f of ['natively_debug.log', 'interview60.timeline.json']) fs.copyFileSync(path.join(SYN, f), path.join(d, f));
    return d;
};
const REPAIR = /\[DeepgramStreaming\] boundary repair: restored /;

node([path.join(HERE, 'cal-br1-synth.mjs'), '--break-dispatch']);
const breakDir = snapshot('break');
node([path.join(HERE, 'cal-br1-synth.mjs')]);
const passDir = snapshot('pass');

// app-only: one extra repair line after the first final the reference does NOT repair (inside a question).
const appOnlyDir = snapshot('apponly');
{
    const L = fs.readFileSync(path.join(appOnlyDir, 'natively_debug.log'), 'utf8').split('\n');
    const i = L.findIndex((l, k) => k > 2000 && /Transcript event — isFinal=true, text="[A-Za-z]/.test(l) && !REPAIR.test(L[k + 1] ?? ''));
    const ts = L[i].slice(0, 24);
    L.splice(i + 1, 0, `${ts} [LOG] [DeepgramStreaming] boundary repair: restored "phantom" before "x"`);
    fs.writeFileSync(path.join(appOnlyDir, 'natively_debug.log'), L.join('\n'));
}
// ref-only: drop the SECOND app repair line.
const refOnlyDir = snapshot('refonly');
{
    const L = fs.readFileSync(path.join(refOnlyDir, 'natively_debug.log'), 'utf8').split('\n');
    const idx = L.map((l, k) => (REPAIR.test(l) ? k : -1)).filter((k) => k >= 0);
    L.splice(idx[1], 1);
    fs.writeFileSync(path.join(refOnlyDir, 'natively_debug.log'), L.join('\n'));
}
// stray (from the final review's re-review, fr-rr-br1cal.mjs): a line between a final and its repair line makes
// MAIN's finalsFrom refuse, so only the extractor check can fail.
const strayDir = snapshot('stray');
{
    const L = fs.readFileSync(path.join(strayDir, 'natively_debug.log'), 'utf8').split('\n');
    const k = L.findIndex((l) => REPAIR.test(l));
    L.splice(k, 0, `${L[k].slice(0, 24)} [LOG] [Main] a stray line`);
    fs.writeFileSync(path.join(strayDir, 'natively_debug.log'), L.join('\n'));
}
// pause: an empty final between the first repair's cut and its F2 (the adapter's clear()) — rule v4 then makes no
// repair there, so the app's repair is APP-ONLY and the PAUSE RULE line names it.
const pauseDir = snapshot('pause');
{
    const L = fs.readFileSync(path.join(pauseDir, 'natively_debug.log'), 'utf8').split('\n');
    const k = L.findIndex((l) => REPAIR.test(l));
    L.splice(k - 1, 0, `${L[k - 1].slice(0, 24)} [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=""`);
    fs.writeFileSync(path.join(pauseDir, 'natively_debug.log'), L.join('\n'));
}
const cases = [
    { name: 'pass', dir: passDir, want: 0, must: /SUMMARY app 4 \/ reference 4, app-only 0, ref-only 0; .* 4\/4/ },
    { name: 'stray', dir: strayDir, want: 1, must: /EXTRACTOR finalsFrom REFUSED/ },
    { name: 'pause', dir: pauseDir, want: 1, must: /PAUSE RULE: 1 repair\(s\) the reference makes only without clear\(\)[\s\S]*APP-ONLY|APP-ONLY[\s\S]*PAUSE RULE: 1 repair\(s\)/ },
    { name: 'break', dir: breakDir, want: 1, must: /reaching a dispatched question 0\/4/ },
    { name: 'prefix-s50a', dir: S50A, want: 1, must: /SUMMARY app 0 \/ reference 4, app-only 0, ref-only 4/ },
    { name: 'app-only', dir: appOnlyDir, want: 1, must: /APP-ONLY app "phantom"/ },
    { name: 'ref-only', dir: refOnlyDir, want: 4, must: /app-only 0, ref-only 1; .* 3\/3/ },
];
let bad = 0;
for (const c of cases) {
    const r = node([path.join(HERE, 'br1-read.mjs'), c.dir]);
    const matches = (r.out.match(/^MATCH /gm) ?? []).length;
    const ok = r.code === c.want && c.must.test(r.out);
    if (!ok) bad++;
    const summary = r.out.split('\n').find((l) => l.startsWith('SUMMARY')) ?? '(no summary)';
    console.log(`${ok ? 'OK ' : 'BAD'} ${c.name.padEnd(12)} exit ${r.code} (want ${c.want}) MATCH rows ${matches}: ${summary}`);
}
console.log(bad ? `CALIBRATION FAILED: ${bad}` : 'CALIBRATION OK: br1-read tells pass, unreached, pre-fix, app-only, a mid-hour reference-only, a stray line and a pause apart');
process.exit(bad ? 1 : 0);
