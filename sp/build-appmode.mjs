// Throwaway: the system prompt flight s50b REALLY sent, now including the piece every earlier
// arm missed — the active General mode's prompt, appended as "## ACTIVE MODE" between the
// knowledge swap and the notes (LLMHelper.streamChat ACTIVE MODE INJECTION).
//   sys-appmode.txt = LANG + (knowledge rules + budget tail) + "\n\n## ACTIVE MODE\n" + MODE_GENERAL_PROMPT + notes
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WT = process.argv[2];
const require = createRequire(path.join(WT, 'package.json'));
const P = require(path.join(WT, 'dist-electron/electron/llm/prompts.js'));
const { userContextBlock } = require(path.join(WT, 'dist-electron/electron/llm/userContext.js'));

const LANG = fs.readFileSync(path.join(HERE, 'sys-appexact.txt'), 'utf8').split('[END LANGUAGE INSTRUCTION]')[0] + '[END LANGUAGE INSTRUCTION]\n\n';
const notes = fs.readFileSync(path.join(HERE, 'notes.txt'), 'utf8');
const notesBlock = userContextBlock(notes);
const swap = fs.readFileSync(path.join(HERE, 'sys-swap.txt'), 'utf8');
if (!swap.endsWith(notesBlock)) { console.error('sys-swap.txt does not end with the notes block'); process.exit(3); }
const swapNoNotes = swap.slice(0, -notesBlock.length);

const sys = `${LANG}${swapNoNotes}\n\n## ACTIVE MODE\n${P.MODE_GENERAL_PROMPT}${notesBlock}`;
fs.writeFileSync(path.join(HERE, 'sys-appmode.txt'), sys);
console.log('sys-appmode.txt', sys.length, 'chars; mode prompt', P.MODE_GENERAL_PROMPT.length, 'chars; has "Full working code block":', sys.includes('Full working code block'));
