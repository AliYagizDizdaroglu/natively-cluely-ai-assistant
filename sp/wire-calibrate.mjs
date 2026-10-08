// THROWAWAY: the audio calibration gate samples six HARDCODED interview60 ids. Under
// scenario50 every one of those resolves to undefined and the gate would crash — or
// worse, be "fixed" by skipping them and pass an hour it never checked.
import fs from 'node:fs';

const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
let edits = 0;
function patch(file, pairs) {
    const p = G + file;
    let s = fs.readFileSync(p, 'utf8');
    for (const [from, to] of pairs) {
        const n = s.split(from).length - 1;
        if (n !== 1) throw new Error(`${file}: anchor appears ${n} times, expected 1:\n  ${from.slice(0, 100)}`);
        s = s.replace(from, to); edits++;
    }
    fs.writeFileSync(p, s);
    console.log(`  ${file}  ${pairs.length} edit(s)`);
}

patch('roster.mjs', [
    ['/** Every item in the selected roster, before any scenario subset. */',
        `/**
 * The clips the audio calibration gate proves before an hour is committed. Chosen for
 * RISK, not coverage: the renderings most likely to be misheard, plus the extremes of
 * clip length. A sample of easy clips would pass and prove nothing.
 */
const SAMPLES = {
    // a short definition, a design answer, a debugging one, the screenshot cue, and the
    // two longest — the clips most likely to be split into several finals.
    interview60: ['W02', 'M02', 'H03', 'C01', 'L01', 'L04'],
    // S1Q04 and S2Q05 speak a code identifier aloud ("evaluate top k", "select context")
    // — the transform this roster invented, and the one most likely to be misheard.
    // S1Q06 and S5Q04 are SQL, full of table and column names. S2Q01 is the slowest clip
    // rendered anywhere (1.55 w/s). S2Q02 reads CV metrics as numerals ("72.4 percent").
    scenario50: ['S1Q04', 'S1Q06', 'S2Q01', 'S2Q02', 'S2Q05', 'S5Q04'],
};

/**
 * The sampled items, resolved against the roster. A named id that is not in the roster
 * throws: silently sampling five clips instead of six would let the gate pass on a set
 * it never heard.
 */
export function calibrationSample() {
    const ids = SAMPLES[ROSTER_NAME] ?? [];
    if (!ids.length) throw new Error(\`no calibration sample defined for roster \${ROSTER_NAME}\`);
    return ids.map((id) => {
        const item = chosen.items.find((x) => x.id === id);
        if (!item) throw new Error(\`calibration sample names \${id}, which is not in roster \${ROSTER_NAME}\`);
        return item;
    });
}

/** Every item in the selected roster, before any scenario subset. */`],
]);

patch('interview60.calibrate-audio.mjs', [
    ["import { INTERVIEW, TTS_LOCAL_DIR } from './roster.mjs';", "import { calibrationSample, TTS_LOCAL_DIR, rosterLabel } from './roster.mjs';"],
    ["const SAMPLE = ['W02', 'M02', 'H03', 'C01', 'L01', 'L04'].map((id) => INTERVIEW.find((x) => x.id === id));",
        '// Roster-specific and risk-chosen; see SAMPLES in roster.mjs. Throws rather than\n// quietly sampling fewer clips than it names.\nconst SAMPLE = calibrationSample();'],
    ['console.log(`listener: ${LIVE_ROUTER_MODEL}\\nvoice: Windows SAPI (local)\\n`);',
        'console.log(`listener: ${LIVE_ROUTER_MODEL}\\nvoice: Windows SAPI (local)\\nroster: ${rosterLabel()}\\nsample: ${SAMPLE.map((s) => s.id).join(\', \')}\\n`);'],
    // `long` is a level on interview60 and a derived flag on scenario50.
    ["    const isLong = item.level === 'long';", "    const isLong = item.level === 'long' || !!item.long;"],
]);

console.log(`\n${edits} edits applied`);
