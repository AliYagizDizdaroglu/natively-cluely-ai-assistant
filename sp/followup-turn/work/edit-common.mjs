// one-shot patcher for R/scripts/common.mjs (throwaway)
import fs from 'node:fs';
const f = 'R/scripts/common.mjs';
let s = fs.readFileSync(f, 'utf8');
const rep = (from, to) => { if (s.split(from).length !== 2) throw new Error(`anchor not exactly once: ${from.slice(0, 60)}`); s = s.replace(from, () => to); };

rep(`// (default: the registered PREREGISTER-turn-followup.md; before the OK, section2-filled.md).`,
`// (default: the registered PREREGISTER-turn-followup.md; before the OK, a test sets it to section2-filled.md explicitly).`);

rep(`export const PRIMARY_HOURS = ['s50m', 's50l'];`,
`export const PRIMARY_HOURS = ['s50m', 's50l'];
// Amendment A1 point 7 / A2 point 3: every primary-hour call finishes before 09:30 local 2026-10-04 (= 06:30Z). Hard-coded; the runner's
// \`--stop-at\` overrides it for the s50k re-run only (each re-run record carries its own \`stopAt\`).
export const HARD_STOP = '2026-10-04T06:30:00.000Z';
export const CALL_TIMEOUT_MS = 120000;                           // A2 point 3: per-call timeout on the whole request + stream`);

rep(`export const OLD_REF_SHA = `, `// A2 point 6 (M1): the grader dispatch text is pinned (it is "verbatim h40d's"), beside the judge module's section 2 row.
export const DISPATCH_FILE = path.join(SP, 'validation-hour/h40d-grader-dispatch.txt');
export const DISPATCH_SHA = 'f8d646701e6ee3b160ef4ade64961db82851720d020838d8559bc89bcd5981cd';
export const DISPATCH_BYTES = 9064;
export const JUDGE_REL = 'MAIN/electron/test/golden/interview60.judge.mjs';
export const DISPATCH_REL = '../validation-hour/h40d-grader-dispatch.txt';
export const OLD_REF_SHA = `);

// answerFiles + stop markers + record end
rep(`export const answerFiles = (dir = OUT_DIR) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^interview60\.answers\./.test(f)) : []);`,
`export const answerFiles = (dir = OUT_DIR) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^interview60\.answers\./.test(f)) : []);
/** A2 point 3: \`R/STOPPED-<leg>.txt\` marks a pass that hit the hard stop; the blind builder and decide refuse while one exists. */
export const stoppedMarkers = (dir = OUT_DIR) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^STOPPED-.+\.txt$/.test(f)) : []);
/** Why a stored record cannot be graded under the hard stop (null = fine). \`end\` is written by the runner; a record without one falls back to at + total.
 *  Primary hours are always held to HARD_STOP; the re-run's records to their own \`stopAt\`. */
export function recordEndProblem(rec) {
    const end = rec.end ? Date.parse(rec.end) : rec.at ? Date.parse(rec.at) + (Number.isFinite(rec.total) ? rec.total : 0) : NaN;
    if (!Number.isFinite(end)) return 'has neither end nor at';
    const limit = Date.parse(PRIMARY_HOURS.includes(rec.hour) ? HARD_STOP : (rec.stopAt ?? HARD_STOP));
    return end >= limit ? \`ends \${new Date(end).toISOString()}, at or after the stop \${new Date(limit).toISOString()}\` : null;
}`);

// MAIN/ rel resolve
rep(`        const f = path.resolve(FT, rel);
        if (!fs.existsSync(f)) { problems.push(\`\${rel}: file missing\`); continue; }`,
`        const f = rel.startsWith('MAIN/') ? path.join(MAIN, rel.slice(5)) : path.resolve(FT, rel);
        if (!fs.existsSync(f)) { problems.push(\`\${rel}: file missing\`); continue; }`);

rep(`'../dist-snapshots/main-precue-73d7f01/dist-electron/electron/llm/verbalStreamFilter.js']) {
        if (!files.has(rel))`, `'../dist-snapshots/main-precue-73d7f01/dist-electron/electron/llm/verbalStreamFilter.js', JUDGE_REL, DISPATCH_REL]) {
        if (!files.has(rel))`);

rep(`    const flt = files.get(`, `    const disp = files.get(DISPATCH_REL);
    if (disp && (disp.sha !== DISPATCH_SHA || disp.bytes !== DISPATCH_BYTES)) problems.push(\`the dispatch-text row is not \${DISPATCH_SHA.slice(0, 8)}...\${DISPATCH_SHA.slice(-4)}, \${DISPATCH_BYTES} bytes\`);
    const flt = files.get(`);

// unlisted scripts helper
rep(`/** Every file the table lists must exist`, `/** The *.mjs under R/ and R/scripts/ that section 2 of \`preregPath\` does not list (day-steps decide refuses on any, without printing VOID). */
export function unlistedScripts(preregPath = PREREG) {
    const { files } = parseSection2(fs.readFileSync(preregPath, 'utf8'));
    return [...mjsIn(R_DIR), ...mjsIn(HERE)].filter((rel) => !files.has(rel));
}
/** Every file the table lists must exist`);
fs.writeFileSync(f, s);
console.log('patched');
