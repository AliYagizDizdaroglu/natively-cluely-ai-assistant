// Two questions the keeper design still owes before it touches the flight harness:
//  (a) is windowsHide NEEDED — does a plain (no hidden console) child of the detached keeper
//      still lose its output?  If it captures, the hide flag and its risks go away.
//  (b) if it IS needed: node's windowsHide also stamps SW_HIDE into the child's STARTUPINFO —
//      does that reach a GUI grandchild through cmd?  notepad is the naive case: a GUI app
//      that honours the hint.  Its MainWindowHandle is 0 when its window is hidden.
import { spawn } from 'node:child_process';
import { openSync, closeSync, appendFileSync } from 'node:fs';
const out = process.argv[2];
const PROJ = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant';

appendFileSync(out, `--- (a) plain child, windowsHide:false ---\n`);
{
    const fd = openSync(out, 'a');
    const c = spawn('cmd.exe', ['/c', 'npm --version'], { cwd: PROJ, detached: false, windowsHide: false, stdio: ['ignore', fd, fd] });
    closeSync(fd);
    await new Promise((r) => c.on('exit', r));
}
appendFileSync(out, `--- (a) done ---\n--- (b) notepad via cmd, windowsHide:true; parent checks its MainWindowHandle ---\n`);
{
    const fd = openSync(out, 'a');
    const c = spawn('cmd.exe', ['/c', 'notepad.exe'], { detached: false, windowsHide: true, stdio: ['ignore', fd, fd] });
    closeSync(fd);
    await new Promise((r) => c.on('exit', r));
}
appendFileSync(out, `--- (b) notepad closed; keeper exiting ---\n`);
