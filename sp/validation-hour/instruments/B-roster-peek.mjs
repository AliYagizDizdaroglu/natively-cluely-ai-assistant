// Builder B scratch (read-only): the holdout40 roster's ids and levels only (never a question text), to source the
// gated-id list (r4 rule 3b: the 40 items that are not R02F R04F R09F R11F R13F) from the roster file itself.
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const MAIN = path.join(os.homedir(), 'OneDrive', 'Masaüstü', 'natively-cluely-ai-assistant');
const { HOLDOUT40 } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/holdout40.questions.mjs')).href);
const items = HOLDOUT40.filter((i) => (i.kind ?? 'spoken') === 'spoken');
console.log(`holdout40: ${HOLDOUT40.length} entries, ${items.length} spoken`);
const byLevel = {};
for (const i of items) (byLevel[i.level] ??= []).push(i.id);
for (const [lv, ids] of Object.entries(byLevel)) console.log(`  level ${lv}: ${ids.length} [${ids.join(' ')}]`);
const EXCL = ['R02F', 'R04F', 'R09F', 'R11F', 'R13F'];
console.log(`excluded five all in roster: ${EXCL.every((id) => items.some((i) => i.id === id))}; all follow-ups: ${EXCL.every((id) => items.find((i) => i.id === id)?.level === 'followup')}; gated = ${items.filter((i) => !EXCL.includes(i.id)).length} of ${items.length}`);
