/**
 * Which question bank the harness runs, and where that bank's audio lives.
 *
 * Every consumer (build-audio, calibrate-audio, run, answers, cues) imports the
 * roster from HERE rather than from a question file directly, so one env var
 * moves the whole hour to a different set:
 *
 *   NATIVELY_ROSTER=scenario50            the 5-scenario AI/ML platform screen
 *   NATIVELY_ROSTER=scenario50 NATIVELY_SCENARIOS=S1,S2   just those scenarios
 *   (unset)                               interview60, exactly as before
 *
 * interview60 stays the DEFAULT on purpose: after7/after8/after9 are only
 * comparable to each other because the stimulus never moved, and an env var that
 * silently changed it would end that comparability without anyone noticing.
 *
 * THE AUDIO PATHS MOVE WITH THE ROSTER, and that is not cosmetic. The local TTS
 * builder caches clips by item id and returns early when the file already exists;
 * two rosters sharing a directory would mean a stale clip is spoken instead of
 * the question you think you are asking, for a whole hour, silently. Separate
 * directories make that impossible even if ids ever did collide.
 */
import { INTERVIEW as INTERVIEW60 } from './interview60.questions.mjs';
import { SCENARIO50 } from './scenario50.questions.mjs';

const ROSTERS = {
    interview60: { items: INTERVIEW60, ttsLocal: 'interview60-tts-local', ttsGemini: 'interview60-tts', wav: 'interview60.wav' },
    scenario50: { items: SCENARIO50, ttsLocal: 'scenario50-tts-local', ttsGemini: 'scenario50-tts', wav: 'scenario50.wav' },
};

// Blank counts as unset. `NATIVELY_ROSTER=` is how a shell or a scheduled task
// clears the variable, and `??` alone would take the empty string as a name and
// abort the hour on it.
export const ROSTER_NAME = process.env.NATIVELY_ROSTER?.trim() || 'interview60';

const chosen = ROSTERS[ROSTER_NAME];
if (!chosen) {
    throw new Error(`NATIVELY_ROSTER=${ROSTER_NAME} is not a roster. Known: ${Object.keys(ROSTERS).join(', ')}`);
}

/**
 * An optional scenario subset, for rosters that have scenarios. The full
 * scenario50 set is 2.8 hours of wall clock; two scenarios is a normal hour.
 * A name that matches nothing is a typo that would otherwise run a SHORTER
 * hour and look like a successful flight, so it throws.
 */
const WANTED_SCENARIOS = (process.env.NATIVELY_SCENARIOS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

function subset(items) {
    const want = WANTED_SCENARIOS;
    if (!want.length) return items;
    const have = new Set(items.map((i) => i.scenario).filter(Boolean));
    const missing = want.filter((w) => !have.has(w));
    if (missing.length) {
        throw new Error(`NATIVELY_SCENARIOS names ${missing.join(', ')}, which ${ROSTER_NAME} does not have. Known: ${[...have].join(', ') || '(this roster has no scenarios)'}`);
    }
    return items.filter((i) => want.includes(i.scenario));
}

/**
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
    if (!ids.length) throw new Error(`no calibration sample defined for roster ${ROSTER_NAME}`);
    return ids.map((id) => {
        const item = chosen.items.find((x) => x.id === id);
        if (!item) throw new Error(`calibration sample names ${id}, which is not in roster ${ROSTER_NAME}`);
        return item;
    });
}

/** Every item in the selected roster, before any scenario subset. */
export const ROSTER_ITEMS = chosen.items;

/** The ordered question bank, exactly the shape interview60.questions.mjs exports. */
export const INTERVIEW = subset(chosen.items);

/** Spoken items only — what the harness scores. Screenshot cues are operator-only. */
export const SPOKEN = INTERVIEW.filter((x) => x.kind !== 'screenshot');

export const TTS_LOCAL_DIR = chosen.ttsLocal;
export const TTS_GEMINI_DIR = chosen.ttsGemini;
export const WAV_NAME = chosen.wav;

/**
 * One line naming the stimulus, for the top of a run log — so a flight says what
 * it ran. Built from the selection made at load, never re-read from the
 * environment: the label has to describe the roster that is actually playing.
 */
export const rosterLabel = () =>
    `${ROSTER_NAME}${WANTED_SCENARIOS.length ? ` [${WANTED_SCENARIOS.join(', ')}]` : ''}  ${INTERVIEW.length} items`;
