// Throwaway (Task 3, fix round 1): the Edit tool unescapes a typed backslash-u sequence, so my M1 line landed in the STAGED
// test file with two real U+0301 characters instead of the six literal characters backslash,u,0,3,0,1 the coordinator required
// ("Keep the escapes literally in the source. Do not paste a decomposed character"). This turns each U+0301 character in the
// staged test back into the literal escape. Both are built from char codes, so no tool has to pass an escape through.
// Refuses unless there are exactly 2 combining marks (the starting file had none; the file is otherwise NFC).
//   node t3-r1-fix-escape.mjs
import fs from 'node:fs';
const FILE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair/stage/electron/audio/deepgramBoundaryRepair.test.ts';
const COMBINING_ACUTE = String.fromCharCode(0x0301);
const LITERAL_ESCAPE = `${String.fromCharCode(92)}u0301`;      // backslash, u, 0, 3, 0, 1
const text = fs.readFileSync(FILE, 'utf8');
const parts = text.split(COMBINING_ACUTE);
console.log(`combining marks found: ${parts.length - 1}`);
if (parts.length !== 3) { console.log('REFUSED: expected exactly 2'); process.exit(1); }
fs.writeFileSync(FILE, parts.join(LITERAL_ESCAPE));
const after = fs.readFileSync(FILE, 'utf8');
console.log(`after: combining marks ${after.split(COMBINING_ACUTE).length - 1}, literal escapes ${after.split(LITERAL_ESCAPE).length - 1}, NFC ${after === after.normalize('NFC')}`);
