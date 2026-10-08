// Rule 8 on the reference's tests: each mutant of earlierQuestion.ref.mjs must make earlierQuestion.ref.test.mjs FAIL.
// Writes earlierQuestion.mutant.mjs beside the reference (so its relative import of the hashed design-2 reference
// resolves), runs the test against it through EQ_REF, deletes it. Also runs the test on the UNMUTATED reference first:
// a test that is red on the real file would "catch" every mutant for the wrong reason.
//   node ref-mutate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const refPath = path.join(HERE, 'earlierQuestion.ref.mjs'), mutPath = path.join(HERE, 'earlierQuestion.mutant.mjs'), testPath = path.join(HERE, 'earlierQuestion.ref.test.mjs');
const src = fs.readFileSync(refPath, 'utf8');
const runTest = (ref) => spawnSync(process.execPath, [testPath], { encoding: 'utf8', env: { ...process.env, EQ_REF: ref, EQ_QUIET: '1' }, cwd: HERE });

const base = runTest(refPath);
console.log(`unmutated reference: ${/EARLIER-QUESTION REF TESTS: (\d+)\/(\d+) passed$/m.test(base.stdout) && base.status === 0 ? 'green' : 'RED'} -- ${(base.stdout.match(/EARLIER-QUESTION REF TESTS.*$/m) ?? [''])[0]}`);
if (base.status !== 0) { console.log('REFUSED: the tests are red on the real reference'); process.exit(2); }

const MUTANTS = [
    ['gate cue ignored', "if (cue === 'none') return silent('no-cue', cue);", ''],
    ['supersede check dropped', "if (supersede) return silent('supersede', cue);", ''],
    ['turnId null check dropped (blocks on chip/answer-now/manual paths)', "if (turnId == null) return silent('no-turn', cue);", ''],
    ['containment check dropped', "if (np.length >= 3 && nq.includes(np)) return silent('parent-in-pinned', cue);", ''],
    ['containment reversed (pinned inside parent)', 'nq.includes(np)', 'np.includes(nq)'],
    ['prompt check dropped', "if (promptLines.some((l) => sameAnchor(l, parent))) return silent('parent-in-prompt', cue);", ''],
    ['prompt check by exact equality (fragment no longer counts)', 'sameAnchor(l, parent)', 'l === parent'],
    ['selector reads the grandparent', 'ledger[ledger.length - 1].text', 'ledger[Math.max(0, ledger.length - 2)].text'],
    ['selector reads the oldest entry', 'ledger[ledger.length - 1].text', 'ledger[0].text'],
    ['ledger depth 4', 'export const LEDGER_DEPTH = 3;', 'export const LEDGER_DEPTH = 4;'],
    ['supersede replaces in place instead of remove-and-push', 'const rest = turnId != null ? ledger.filter((e) => e.turnId !== turnId) : ledger;\n    return [...rest, { text, turnId, seq }].slice(-LEDGER_DEPTH);',
        'if (turnId != null && ledger.some((e) => e.turnId === turnId)) return ledger.map((e) => (e.turnId === turnId ? { text, turnId, seq } : e));\n    return [...ledger, { text, turnId, seq }].slice(-LEDGER_DEPTH);'],
    ['text dedup on write (review C1)', 'const rest = turnId != null ? ledger.filter((e) => e.turnId !== turnId) : ledger;', 'const rest = ledger.filter((e) => (turnId != null && e.turnId === turnId) || e.text !== text);'],
    ['null turn ids treated as one turn (removes the older null entry)', 'const rest = turnId != null ? ledger.filter((e) => e.turnId !== turnId) : ledger;', 'const rest = ledger.filter((e) => e.turnId !== turnId);'],
    ['flag off still writes the ledger', 'if (!enabled || typeof text', 'if (typeof text'],
    ['flag off still builds a block', "if (!enabled) return silent('off');", ''],
    ['blank pinned text still writes', "|| !text.trim()) return ledger;", ') return ledger;'],
    ['clip: head only', 'return `${t.slice(0, CLIP_HEAD)}…${t.slice(t.length - CLIP_TAIL)}`;', 'return `${t.slice(0, PARENT_MAX_CHARS - 1)}…`;'],
    ['clip: tail 300 (451 chars)', 'export const CLIP_TAIL = 299;', 'export const CLIP_TAIL = 300;'],
    ['clip: cap 400', 'export const PARENT_MAX_CHARS = 450;', 'export const PARENT_MAX_CHARS = 400;'],
    ['clip: no whitespace collapse', "const t = text.replace(/\\s+/g, ' ').trim();", 'const t = text;'],
    ['label says answered', "'EARLIER QUESTION (asked earlier; context only,", "'EARLIER QUESTION (asked and answered; context only,"],
    ['label loses "do not answer it again"', 'do not answer it again; ', ''],
    ['block carries a second line (the grandparent)', 'return { block: formatBlock(parent), cue, why: \'\', parent };', 'return { block: `${formatBlock(parent)}\\n- ${ledger[0].text}`, cue, why: \'\', parent };'],
    ['exceptions escape (no catch)', '    } catch {\n        return silent(\'error\');\n    }', '    } finally {\n    }'],
    ['blank parent accepted', "if (typeof parent !== 'string' || !parent.trim()) return silent('no-parent', cue);", "if (typeof parent !== 'string') return silent('no-parent', cue);"],
    ['gate cue reported as none on a block', "return { block: formatBlock(parent), cue, why: '', parent };", "return { block: formatBlock(parent), cue: 'none', why: '', parent };"],
];
let ok = true;
for (const [name, from, to] of MUTANTS) {
    if (src.split(from).length !== 2) { console.log(`ANCHOR NOT FOUND EXACTLY ONCE: ${name}`); ok = false; continue; }
    fs.writeFileSync(mutPath, src.replace(from, () => to));
    const r = runTest(mutPath);
    const caught = r.status !== 0;
    ok &&= caught;
    const first = (r.stdout.match(/EARLIER-QUESTION REF TESTS.*$/m) ?? [`crash: ${(r.stderr || '').split('\n')[0].slice(0, 100)}`])[0];
    console.log(`${caught ? 'caught ' : 'MISSED '} ${name}  (${first})`);
}
if (fs.existsSync(mutPath)) fs.unlinkSync(mutPath);
console.log(ok ? `\nEVERY MUTANT CAUGHT (${MUTANTS.length}): the tests can fail` : '\nA MUTANT SURVIVED');
process.exitCode = ok ? 0 : 1;
