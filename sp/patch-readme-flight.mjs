// README rows for the three-arm comparison and the unattended flight.
// usage: node patch-readme-flight.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';
const R = path.join(process.argv[2], 'electron/test/golden/README.md');
let r = fs.readFileSync(R, 'utf8');
const nl = r.includes('\r\n') ? '\r\n' : '\n';
const once = (a, b, label) => { const n = r.split(a).length - 1; if (n !== 1) throw new Error(`${label}: matched ${n}`); r = r.replace(a, () => b); console.log('ok ' + label); };

once('| `interview60.answers.mjs` | answer-only pass over the same questions: scored quality + latency, no Live |',
     '| `interview60.answers.mjs` | answer-only pass over the same questions: scored quality + latency, no Live. `--model <id>` runs the same pass on another arm into `interview60.answers.<id>.json` — the three-arm comparison (3.1 Flash Lite, 3.5 Flash Lite, Gemma 4 31B) — and every item records its `model` |',
     'answers row');
once('and `--verdicts <file>` writes the same judge file; resumable; run AFTER the hour, never during it |',
     'and `--verdicts <file>` writes the same judge file. `--answers <file>` grades an answers-pass arm instead of the hour\'s log, with every file suffixed `.<model>`; resumable; run AFTER the hour, never during it |',
     'judge row');
once('| `interview60.metrics.mjs` |',
     '| `interview60.live-probe.cjs` | one Live session with the app\'s exact config against the 34 s probe clip: exit 0 = tool call seen, 3 = connected but silent (the 3.x daily-allowance failure), 1 = could not connect, 2 = no key. A yes/no before a build and a launch |' + nl +
     '| `interview60.flight.mjs` | unattended flight for a scheduled task: live-probe → Live model for the hour (3.x, or 2.5 via `NATIVELY_LIVE_MODEL` when 3.x is silent) → `auto <label>` → the three answer arms + chains into the run folder → judge exports; `--dry-run` logs every command and runs none. Logs to `interview60.run.flight.log`, leaves `interview60.flight.done.json` in the run folder |' + nl +
     '| `interview60.metrics.mjs` |',
     'new rows');

r = r.replace(/\r?\n$/, '') + nl + nl + [
    '### Unattended flight',
    '',
    'The free-tier day resets at 07:00 UTC, so the hour of record is scheduled, not started by hand.',
    'A Windows Task Scheduler task runs `interview60.flight.mjs` in the logged-on user\'s desktop session',
    '(the app needs a desktop and an output device; the task runs only while the user is logged on).',
    'Prove the plumbing with a `--dry-run` task first — it must reach the script with the repo as cwd',
    'and write `interview60.run.flight.log` — then register the real one:',
    '',
    '```powershell',
    '$repo = \'C:\\path\\to\\natively-cluely-ai-assistant\'',
    '$action = New-ScheduledTaskAction -Execute (Get-Command node).Source -Argument \'electron\\test\\golden\\interview60.flight.mjs after4\' -WorkingDirectory $repo',
    '$trigger = New-ScheduledTaskTrigger -Once -At \'2026-09-04 10:05\'   # 07:05 UTC in Europe/Istanbul',
    '$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 5)',
    'Register-ScheduledTask -TaskName \'Natively-flight-after4\' -Action $action -Trigger $trigger -Settings $settings',
    '# cancel: Unregister-ScheduledTask -TaskName \'Natively-flight-after4\' -Confirm:$false',
    '```',
    '',
    'When it is done, `interview60.flight.done.json` in the run folder lists the four pairs files to grade',
    '(the hour\'s own answers and the three arms). Grading is the no-key judge route above; the gate reads',
    'the hour\'s `interview60.judge.json`, and the three `interview60.judge.<model>.json` files are the comparison.',
].join(nl) + nl;
fs.writeFileSync(R, r);
console.log('ok unattended section');
