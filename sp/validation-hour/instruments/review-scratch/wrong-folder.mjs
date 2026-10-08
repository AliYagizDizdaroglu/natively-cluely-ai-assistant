// Reviewer: run each REAL launcher from a wrong folder (this scratch folder) with TEMP redirected here, so the real
// %TEMP%\natively-h40d-launcher-error.log is never created. Each must stop at its first line check (exit 9 / 13 / 12).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.resolve(HERE, '..', '..');
const errLog = path.join(HERE, 'natively-h40d-launcher-error.log');
fs.rmSync(errLog, { force: true });
for (const [f, args] of [['launch-h40d.cmd', []], ['launch-h40d-dry.cmd', []], ['launch-h40d-prestart.cmd', []], ['h40d-merge.cmd', ['claude-opus-5-5', 'electron\\test\\golden\\interview60.runs\\x-h40d']], ['h40d-merge.cmd', []]]) {
  const r = spawnSync('cmd.exe', ['/d', '/c', path.join(VH, f), ...args], { cwd: HERE, env: { ...process.env, TEMP: HERE, TMP: HERE }, encoding: 'utf8' });
  console.log(`${f} ${args.length ? '(args)' : '(no args)'} exit ${r.status}  stdout: ${r.stdout.trim().slice(0, 100)}`);
}
console.log('error log lines:', fs.existsSync(errLog) ? fs.readFileSync(errLog, 'utf8').trim().split(/\r?\n/).map((l) => l.slice(0, 90)).join(' | ') : '(none)');
fs.rmSync(errLog, { force: true });
