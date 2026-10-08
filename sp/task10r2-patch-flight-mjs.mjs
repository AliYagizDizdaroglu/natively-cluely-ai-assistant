import fs from 'node:fs';

const path = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.flight.mjs";
let text = fs.readFileSync(path, 'utf8');
text = text.replace(/\r\n/g, '\n');

function applyOnce(label, old, neu) {
    const count = text.split(old).length - 1;
    if (count !== 1) { console.error(`${label}: expected 1 occurrence, found ${count}`); process.exit(1); }
    text = text.replace(old, neu);
    console.log(`${label}: OK`);
}

// M4: flight.mjs:3-4 -- drop the hard-coded "three-arm" count.
applyOnce('M4-header-intro',
` * hands. Probe the Live ear, pick the Live model, run the auto hour, then the
 * three-arm answer passes, the chains pass and the judge exports, and leave a`,
` * hands. Probe the Live ear, pick the Live model, run the auto hour, then the
 * answer passes, the chains pass and the judge exports, and leave a`);

// M4: flight.mjs:22-27 (step 3) -- "the same 52 questions" -> "the roster's questions";
// "the two PAIRED_ARMS" -> "the paired arms (PAIRED_ARMS)", neither hard-codes a count that drifts.
applyOnce('M4-step3',
` *   3. answer passes on gemini-3.1-flash-lite and gemini-3.5-flash-lite, the
 *      same 52 questions, prompt and filters, then the focused
 *      Flash arms and the two PAIRED_ARMS (the hour's captured prompts at the
 *      pre-bench level, the bare prompt at the shipped LOW level), plus the
 *      chains pass, all copied into the run folder. Earlier answers/chains
 *      files are moved aside first: the passes resume from an existing file,
 *      and resuming from yesterday's answers would score yesterday's model.`,
` *   3. answer passes on gemini-3.1-flash-lite and gemini-3.5-flash-lite, the
 *      roster's questions, prompt and filters, then the focused Flash arms
 *      and the paired arms (PAIRED_ARMS) (the hour's captured prompts at the
 *      pre-bench level, the bare prompt at the shipped LOW level), plus the
 *      chains pass, all copied into the run folder. Earlier answers/chains
 *      files are moved aside first: the passes resume from an existing file,
 *      and resuming from yesterday's answers would score yesterday's model.`);

// M5: flight.mjs:46 -- name the hedge's front leg under NATIVELY_VERBAL_HEDGE=1 (controller wording).
// The Gemma paragraph that follows (currently lines 50-55) is untouched -- both old and new text below
// end at "Both Gemma arms are" so the next line attaches identically.
applyOnce('M5-hedge-wording',
`// The first is the app's answer model, the second the stall-fallback model. The Groq
// comparison arms (qwen/qwen3.8-27b, openai/gpt-oss-120b) were dropped from the flight at
// the user's request on 2026-09-26 — answers.mjs still runs a Groq id by hand (ids with a
// "/"; with a placeholder GROQ_API_KEY that pass exits 3 in seconds). Both Gemma arms are`,
`// The first is the app's answer model, the second is the stall-fallback model (the
// hedge's front leg when NATIVELY_VERBAL_HEDGE=1). The Groq comparison arms
// (qwen/qwen3.8-27b, openai/gpt-oss-120b) were dropped from the flight at the user's
// request on 2026-09-26 — answers.mjs still runs a Groq id by hand (ids with a "/";
// with a placeholder GROQ_API_KEY that pass exits 3 in seconds). Both Gemma arms are`);

fs.writeFileSync(path, text, 'utf8');
console.log('WROTE ' + path + '  length=' + text.length);
