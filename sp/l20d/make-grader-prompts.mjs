// L20d's graders get L20c's grader prompt VERBATIM, with only the two file paths changed (the pre-registration: same
// graders, same frozen rubric; the anchor check reads br1 again and compares it with L20c's read, so the instrument
// must not move). The L20c prompts were recovered from the session transcript (recover-grader-prompt.mjs). This
// writes l20d/grader-prompts/<packet>-<g>.txt for packets A-D and g1, g2, and proves each one: putting the L20c
// paths back must give the L20c prompt of the same packet and grader, byte for byte.
//   node make-grader-prompts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'l20c-grader-prompts'), OUT = path.join(HERE, 'grader-prompts');
const SEATS = ['A-g1', 'A-g2', 'B-g1', 'B-g2', 'C-g1', 'C-g2', 'D-g1', 'D-g2'];   // the order the L20c graders were dispatched in
const once = (s, from, to, what) => { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`${what}: expected exactly one match, found ${n}`); return s.replace(from, to); };
fs.mkdirSync(OUT, { recursive: true });
let ok = 0;
SEATS.forEach((seat, i) => {
    const [p, g] = seat.split('-');
    const l20c = fs.readFileSync(path.join(SRC, `${String(i + 1).padStart(2, '0')}.txt`), 'utf8');
    const oldPacket = `scratchpad\\l20c\\blind\\packet-${p}.json`, oldVerdicts = `scratchpad\\l20c\\blind\\verdicts-${p}-${g}.json`;
    const newPacket = `scratchpad\\l20d\\blind\\packet-${p}.json`, newVerdicts = `scratchpad\\l20d\\blind\\verdicts-${p}-${g}.json`;
    const et = once(once(l20c, oldPacket, newPacket, `${seat} packet path`), oldVerdicts, newVerdicts, `${seat} verdicts path`);
    if (/l20c/i.test(et)) throw new Error(`${seat}: the L20d prompt still names l20c`);
    const back = once(once(et, newPacket, oldPacket, `${seat} back packet`), newVerdicts, oldVerdicts, `${seat} back verdicts`);
    if (back !== l20c) throw new Error(`${seat}: not L20c's prompt with two paths changed`);
    fs.writeFileSync(path.join(OUT, `${seat}.txt`), et);
    ok++;
});
console.log(`${ok} grader prompts written to ${OUT}: L20c's text, two paths changed in each (checked by putting them back)`);
