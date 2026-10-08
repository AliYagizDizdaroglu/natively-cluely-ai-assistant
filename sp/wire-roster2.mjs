// THROWAWAY: two gaps the roster switch itself opens.
//   1. the answers pass resumes a store keyed by item id — an interview60 file
//      resumed under scenario50 keeps 58 foreign answers and the judge exports them
//   2. a flight folder did not record WHICH stimulus produced it
import fs from 'node:fs';

const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
let edits = 0;

function patch(file, pairs) {
    const p = G + file;
    let s = fs.readFileSync(p, 'utf8');
    for (const [from, to] of pairs) {
        const n = s.split(from).length - 1;
        if (n !== 1) throw new Error(`${file}: anchor appears ${n} times, expected 1:\n  ${from.slice(0, 100)}`);
        s = s.replace(from, to);
        edits++;
    }
    fs.writeFileSync(p, s);
    console.log(`  ${file}  ${pairs.length} edit(s)`);
}

// The full roster, before any scenario subset — so building a set scenario by
// scenario accumulates, while a DIFFERENT roster is still refused.
patch('roster.mjs', [
    ['/** The ordered question bank, exactly the shape interview60.questions.mjs exports. */',
        `/** Every item in the selected roster, before any scenario subset. */
export const ROSTER_ITEMS = chosen.items;

/** The ordered question bank, exactly the shape interview60.questions.mjs exports. */`],
]);

patch('interview60.answers.mjs', [
    ["import { INTERVIEW } from './roster.mjs';", "import { INTERVIEW, ROSTER_ITEMS, ROSTER_NAME } from './roster.mjs';"],
    ["const store = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};",
        `const store = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
// A resumed store must belong to THIS roster. It is keyed by item id, so an
// interview60 file resumed under scenario50 would keep every foreign answer and
// hand the judge a mixed export that looks like one run. Checked against the whole
// roster, not the scenario subset, so building a set scenario by scenario still
// accumulates. The flight moves old files aside, so reaching this means a manual
// run against a stale one.
const knownIds = new Set(ROSTER_ITEMS.map((i) => i.id));
const foreign = Object.keys(store).filter((id) => !knownIds.has(id));
if (foreign.length) {
    console.error(\`\\n\${path.basename(OUT)} holds \${foreign.length} answer(s) that are not in roster \${ROSTER_NAME} (\${foreign.slice(0, 3).join(', ')}\${foreign.length > 3 ? ', ...' : ''}).\`);
    console.error('Move it aside before resuming — otherwise it is exported as if it were this roster.');
    process.exit(3);
}`],
]);

patch('interview60.flight.mjs', [
    ["import { fileURLToPath } from 'node:url';", "import { fileURLToPath } from 'node:url';\nimport { rosterLabel, ROSTER_NAME } from './roster.mjs';"],
    ['log(`FLIGHT ${label} start${dry ? \' — DRY RUN, nothing is executed\' : \'\'}   node ${process.version}   cwd ${PROJ}`);',
        'log(`FLIGHT ${label} start${dry ? \' — DRY RUN, nothing is executed\' : \'\'}   node ${process.version}   cwd ${PROJ}`);\n    // Which stimulus produced this folder. Without it a run folder is uninterpretable\n    // the moment a second roster exists.\n    log(`ROSTER ${rosterLabel()}`);'],
    ['        label, startedAt, finishedAt: new Date().toISOString(), liveModel, autoExit, runDir, answersFiles,',
        '        label, roster: ROSTER_NAME, rosterLabel: rosterLabel(), startedAt, finishedAt: new Date().toISOString(), liveModel, autoExit, runDir, answersFiles,'],
]);

console.log(`\n${edits} edits applied`);
