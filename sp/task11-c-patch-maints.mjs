import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\main.ts';
const text = fs.readFileSync(file, 'utf8');

const oldImport = `import { describeVerbalHedgeAtStartup } from './llm/verbalHedge'
`;
const newImport = `import { describeVerbalHedgeAtStartup } from './llm/verbalHedge'
import { describeFollowUpParentAtStartup } from './llm/followUpParent'
`;

const oldBlock = `  // Validate the verbal hedge's env once, here — after whenReady (so the log file above already
  // exists) and before credentials, IPC or any window. h40c re-review N1: this used to run right
  // before createWindow(), inside this same async function; a throw there skipped createWindow(),
  // the tray, global shortcuts and the quit-time handlers, leaving a windowless process that
  // still held the single-instance lock until killed — a silent hang, not the loud, clean refusal
  // rule 11 asks for. A bad value now exits the process outright; no modal dialog (one would
  // block an unattended flight's scheduled task).
  try {
    console.log(describeVerbalHedgeAtStartup())
  } catch (e) {
    console.error(\`[Main] \${(e as Error).message} — refusing to start\`)
    app.exit(1)
    return
  }
`;

const newBlock = `  // Validate the verbal hedge's env once, here — after whenReady (so the log file above already
  // exists) and before credentials, IPC or any window. h40c re-review N1: this used to run right
  // before createWindow(), inside this same async function; a throw there skipped createWindow(),
  // the tray, global shortcuts and the quit-time handlers, leaving a windowless process that
  // still held the single-instance lock until killed — a silent hang, not the loud, clean refusal
  // rule 11 asks for. A bad value now exits the process outright; no modal dialog (one would
  // block an unattended flight's scheduled task).
  // The follow-up flag gets the same check (h40c review M4): unvalidated, a junk value threw
  // inside every hands-free answer, mid-interview, instead of refusing to start.
  try {
    console.log(describeVerbalHedgeAtStartup())
    console.log(\`[Main] \${describeFollowUpParentAtStartup()}\`)
  } catch (e) {
    console.error(\`[Main] \${(e as Error).message} — refusing to start\`)
    app.exit(1)
    return
  }
`;

for (const [oldStr, label] of [[oldImport, 'import'], [oldBlock, 'startup block']]) {
    const count = text.split(oldStr).length - 1;
    if (count !== 1) {
        console.error(`FAIL: expected exactly 1 occurrence of the ${label}, found ${count}`);
        process.exit(1);
    }
}
let out = text.split(oldImport).join(newImport);
out = out.split(oldBlock).join(newBlock);
fs.writeFileSync(file, out, 'utf8');
console.log('OK: main.ts patched — follow-up parent startup line added beside the hedge line');
