// THROWAWAY: point every harness consumer at roster.mjs instead of a hardcoded
// question file, and move the TTS/WAV paths with it. Each replacement asserts its
// anchor exists first, so a silent no-op is impossible.
import fs from 'node:fs';

const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
let edits = 0;

function patch(file, pairs) {
    const p = G + file;
    let s = fs.readFileSync(p, 'utf8');
    for (const [from, to] of pairs) {
        const n = s.split(from).length - 1;
        if (n !== 1) throw new Error(`${file}: anchor appears ${n} times, expected 1:\n  ${from.slice(0, 90)}`);
        s = s.replace(from, to);
        edits++;
    }
    fs.writeFileSync(p, s);
    console.log(`  ${file}  ${pairs.length} edit(s)`);
}

patch('interview60.run.mjs', [
    ["import { INTERVIEW } from './interview60.questions.mjs';",
        "import { INTERVIEW, TTS_LOCAL_DIR, WAV_NAME, rosterLabel } from './roster.mjs';"],
    ["const TTS_DIR = path.join(HERE, 'interview60-tts-local');",
        'const TTS_DIR = path.join(HERE, TTS_LOCAL_DIR);'],
    ["/** Byte offset of each item inside interview60.wav, so log events can be attributed. */",
        '/** Byte offset of each item inside the roster WAV, so log events can be attributed. */'],
    // `long` has to reach the timeline or the whole-question metric silently measures nothing.
    ["...(item.problem ? { problem: item.problem } : {}), ...(item.chain ? { chain: item.chain } : {})",
        "...(item.problem ? { problem: item.problem } : {}), ...(item.chain ? { chain: item.chain } : {}), ...(item.long ? { long: true } : {})"],
    ["    ok('interview60.wav built', fs.existsSync(path.join(HERE, 'interview60.wav')));",
        "    ok(`${WAV_NAME} built`, fs.existsSync(path.join(HERE, WAV_NAME)));"],
    ["    playWav(path.join(HERE, 'interview60.wav'));",
        '    playWav(path.join(HERE, WAV_NAME));'],
    ["    ok('all 55 clips present', clips === INTERVIEW.length, `${clips}/${INTERVIEW.length}`);",
        "    ok('all clips present', clips === INTERVIEW.length, `${clips}/${INTERVIEW.length}`);"],
    ['console.log(`APP PASS  ${now()}   ${INTERVIEW.length} items as ONE continuous file, ~60 min`);',
        'console.log(`APP PASS  ${now()}   ${rosterLabel()} as ONE continuous file`);'],
]);

patch('interview60.answers.mjs', [
    ["import { INTERVIEW } from './interview60.questions.mjs';", "import { INTERVIEW } from './roster.mjs';"],
]);

patch('interview60.build-audio-local.mjs', [
    ["import { INTERVIEW } from './interview60.questions.mjs';",
        "import { INTERVIEW, TTS_LOCAL_DIR, WAV_NAME, rosterLabel } from './roster.mjs';"],
    ["const TTS_DIR = path.join(HERE, 'interview60-tts-local');", 'const TTS_DIR = path.join(HERE, TTS_LOCAL_DIR);'],
    ["const OUT_WAV = path.join(HERE, 'interview60.wav');", 'const OUT_WAV = path.join(HERE, WAV_NAME);'],
    ['console.log(`voice: ${VOICE}   rate: ${RATE}\\nBuilding ${INTERVIEW.length} items -> ${path.relative(PROJ, OUT_WAV)}\\n`);',
        'console.log(`voice: ${VOICE}   rate: ${RATE}\\nroster: ${rosterLabel()}\\nBuilding ${INTERVIEW.length} items -> ${path.relative(PROJ, OUT_WAV)}\\n`);'],
    [' * Output: electron/test/golden/interview60.wav  (24 kHz mono 16-bit)',
        " * Output: electron/test/golden/<roster>.wav  (24 kHz mono 16-bit); the roster and\n * its audio directory come from roster.mjs (NATIVELY_ROSTER)."],
]);

patch('interview60.build-audio.mjs', [
    ["import { INTERVIEW } from './interview60.questions.mjs';",
        "import { INTERVIEW, TTS_GEMINI_DIR, WAV_NAME } from './roster.mjs';"],
    ["const TTS_DIR = path.join(HERE, 'interview60-tts');", 'const TTS_DIR = path.join(HERE, TTS_GEMINI_DIR);'],
    ["const OUT_WAV = path.join(HERE, 'interview60.wav');", 'const OUT_WAV = path.join(HERE, WAV_NAME);'],
]);

patch('interview60.calibrate-audio.mjs', [
    ["import { INTERVIEW } from './interview60.questions.mjs';",
        "import { INTERVIEW, TTS_LOCAL_DIR } from './roster.mjs';"],
    ["const TTS_DIR = path.join(HERE, 'interview60-tts-local');", 'const TTS_DIR = path.join(HERE, TTS_LOCAL_DIR);'],
]);

patch('interview60.cues.mjs', [
    ["import { INTERVIEW } from './interview60.questions.mjs';", "import { INTERVIEW } from './roster.mjs';"],
]);

// The whole-question metric keyed only on interview60's `level: 'long'`. scenario50
// carries the same fact as a derived `long` flag, because its `level` names the class.
patch('interview60.metrics.mjs', [
    ["    const longItems = items.filter((i) => i.level === 'long');",
        "    const longItems = items.filter((i) => i.level === 'long' || i.long);"],
]);

console.log(`\n${edits} edits applied`);
