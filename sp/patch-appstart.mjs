// Give appStart() two things it lacked when the 2026-09-20 19:50 smoke died silently:
// the app's own stdout, and room. Every anchor is asserted present exactly once first,
// so a drifted source refuses instead of producing a half-patched harness (rule 11).
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.run.mjs';

const EDITS = [
    {
        what: 'budget 90s -> 180s',
        from: '    const deadline = Date.now() + 90_000;',
        to: [
            '    // 180s, not 90s: the s50k start needed 55s of the old budget and the 2026-09-20',
            '    // 19:50 smoke still had not reached whenReady at 90s. Three times the known-good',
            '    // time turns a slow start into a pass and leaves a genuine hang plainly over budget.',
            '    const deadline = Date.now() + 180_000;',
        ].join('\n'),
    },
    {
        what: 'capture the app stdout',
        from: "        stdio: 'ignore',",
        to: [
            "        // The app's own stdout is the ONLY place a pre-whenReady exit explains itself:",
            '        // the single-instance-lock line at main.ts:3391, a native-module load failure, a',
            "        // modal dialog. 'ignore' threw that away and left the 2026-09-20 19:50 smoke",
            '        // failure undiagnosable — an exit code and two absent logs, nothing else.',
            '        stdio: [\'ignore\', startFd, startFd],',
        ].join('\n'),
    },
    {
        what: 'open the capture file before the spawn',
        from: '    const child = spawn(\'cmd.exe\', [\'/c\', \'npm\', \'start\'], {',
        to: [
            '    const startLog = path.join(RUNS_DIR, \'app-start.log\');',
            '    const startFd = fs.openSync(startLog, \'w\');',
            '    const child = spawn(\'cmd.exe\', [\'/c\', \'npm\', \'start\'], {',
        ].join('\n'),
    },
    {
        what: 'close our copy of the fd and name the capture in the failure',
        from: "            console.log('APP START  FAILED — natively_debug.log was never reset for this session (app never reached whenReady?)');",
        to: [
            "            console.log('APP START  FAILED — natively_debug.log was never reset for this session (app never reached whenReady?)');",
            '            console.log(`  what the app printed is in ${startLog}`);',
        ].join('\n'),
    },
    {
        what: 'name the capture in the second failure too',
        from: "        console.log('  if the mode line is missing, the app never reached setLiveMode/startMeeting — check the log');",
        to: [
            "        console.log('  if the mode line is missing, the app never reached setLiveMode/startMeeting — check the log');",
            '        console.log(`  what the app printed is in ${startLog}`);',
        ].join('\n'),
    },
    {
        what: 'release the inherited fd once the child owns it',
        from: '    child.unref();',
        to: [
            '    child.unref();',
            '    fs.closeSync(startFd);',
        ].join('\n'),
    },
];

let src = readFileSync(FILE, 'utf8');
if (src.includes('\r')) throw new Error('file is not LF-only');
if (src.includes('app-start.log')) throw new Error('already patched');

for (const e of EDITS) {
    const hits = src.split(e.from).length - 1;
    if (hits !== 1) throw new Error(`${e.what}: anchor found ${hits} times, expected exactly 1`);
    src = src.replace(e.from, e.to);
}
writeFileSync(FILE, src, 'utf8');
console.log(`patched ${EDITS.length} sites`);
