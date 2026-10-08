// Throwaway check: the grader question for each of the 16 frozen items (first 150 chars), and the instrument stamp.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MAIN, IDS, loadGated } from './common.mjs';
import { graderQuestion } from './followup-questions-blind.mjs';
const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
const { G } = await loadGated();
for (const id of IDS) {
    const q = graderQuestion(id, G[id]);
    const cut = q.indexOf(' [Follow-up to: ');
    console.log(`${id.padEnd(6)} ${G[id].kind.padEnd(8)} ${cut >= 0 ? `parent: ${q.slice(cut + 16, cut + 16 + 70)}` : 'bare'} | ${q.slice(0, 80)}`);
}
console.log(`instrument ${J.graderPromptVersion()} (pre-registered 8564ba96369a)`);
