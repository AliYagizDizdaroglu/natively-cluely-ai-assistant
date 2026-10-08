// Throwaway: prove the cue scheduler's schedule path (log, pid, render) and run.mjs
// app:stop's kill path, without a real flight. Backs up and restores the golden
// timeline file. The fake cue is 40 s out, so nothing is shown before the kill.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const root = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const golden = path.join(root, 'electron/test/golden');
const timeline = path.join(golden, 'interview60.timeline.json');
const backup = path.join(golden, 'interview60.timeline.json.dryrun-backup');
const logFile = path.join(golden, 'interview60.cues.log');
const pidFile = path.join(golden, 'interview60.cues.pid');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const hadTimeline = fs.existsSync(timeline);
if (hadTimeline) fs.copyFileSync(timeline, backup);
try {
  fs.writeFileSync(timeline, JSON.stringify({ startedAt: new Date().toISOString(), startedMs: Date.now(), items: [
    { id: 'C01', kind: 'screenshot', problem: 'PY4', q: 'Now take a look at this problem on screen.', playedAt: Date.now() + 40000, clipSecs: 5 },
  ] }, null, 1));
  const child = spawn(process.execPath, [path.join(golden, 'interview60.cues.mjs'), 'schedule', timeline], { detached: true, stdio: 'ignore', cwd: root });
  child.unref();
  await sleep(5000);
  console.log('== cues log after 5 s');
  console.log(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim() : 'NO LOG');
  console.log('== pid file:', fs.existsSync(pidFile) ? fs.readFileSync(pidFile, 'utf8') : 'MISSING');
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  console.log('scheduler alive before app:stop:', alive(pid));
  const out = execFileSync(process.execPath, [path.join(golden, 'interview60.run.mjs'), 'app:stop'], { cwd: root, encoding: 'utf8' });
  console.log(out.trim().split('\n').filter((l) => /cue scheduler|APP STOP/.test(l)).join('\n'));
  await sleep(1000);
  console.log('scheduler alive after app:stop:', alive(pid), '| pid file remains:', fs.existsSync(pidFile));
} finally {
  if (hadTimeline) { fs.copyFileSync(backup, timeline); fs.unlinkSync(backup); } else fs.unlinkSync(timeline);
  console.log('timeline restored');
}
