// Runs the six grader launches in the only allowed order: blind-1.g1 ALONE (the first-launch gate), then, if it exited 0, the other five two at a time. Stops at the first non-zero exit
// (a failed grader is a decision for the user: the 7th session is refused by the launcher anyway). THIS CALLS THE CLAUDE CLI (6 sessions) unless --dry-run.
//   node run-graders.mjs [--dry-run]
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const dry = process.argv.includes('--dry-run');
const launch = (tag) => new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(HERE, 'launch-grader-b1.mjs'), tag, '--model-id', 'claude-opus-5-5', ...(dry ? ['--dry-run'] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => { console.log(`--- ${tag} exit ${code}\n${out.trim().split('\n').filter((l) => !l.startsWith('claude ')).join('\n')}`); resolve(code); });
});
const rest = ['blind-1.g2', 'blind-2.g1', 'blind-2.g2', 'blind-3.g1', 'blind-3.g2'];
if ((await launch('blind-1.g1')) !== 0) { console.log('STOP: the first grader did not come back clean; no other session was launched'); process.exit(1); }
for (let i = 0; i < rest.length; i += 2) {
    const codes = await Promise.all(rest.slice(i, i + 2).map(launch));
    if (codes.some((c) => c !== 0)) { console.log('STOP: a grader failed; ask the user before anything else is launched'); process.exit(1); }
}
console.log('all six graders came back clean');
