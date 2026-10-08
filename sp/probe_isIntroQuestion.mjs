const INTRO_PATTERNS = [
    'introduce yourself',
    'tell me about yourself',
    'describe yourself',
    'about yourself',
    'tell me who you are',
    'give me your introduction',
    'walk me through your background',
    'brief introduction',
    'self introduction',
];
const SENTENCE_BREAK = /[.!?？]+\s+/;
const PLEASANTRY_MAX_WORDS = 4;

function isIntroQuestion(questionLower) {
    const sentences = questionLower.split(SENTENCE_BREAK).map((s) => s.trim()).filter(Boolean);
    const at = sentences.findIndex((s) => INTRO_PATTERNS.some((pattern) => s.includes(pattern)));
    if (at < 0) return false;
    return sentences.slice(0, at).every((s) => s.split(/\s+/).length <= PLEASANTRY_MAX_WORDS);
}

const cases = [
    // no punctuation at all between a long scenario and the intro phrase
    ["so it's late in the sprint and the client wants a demo tomorrow tell me about yourself", null],
    // "e.g." abbreviation before the intro phrase
    ["give me an example, e.g. tell me about yourself.", null],
    // "etc." abbreviation before the intro phrase
    ["we cover languages, frameworks, etc. tell me about yourself.", null],
    // decimal number with no space (should NOT split)
    ["our uptime is 99.9 percent. tell me about yourself.", null],
    // decimal-like with a space after the point (contrived)
    ["we shipped v2. 0 last week. tell me about yourself.", null],
    // all 10 brief fixtures, for a sanity cross-check
    ["someone changed a resource by hand and now your stack will not update. what do you do?", false],
    ["what do you do?", false],
    ["who are you reporting to in that role?", false],
    ["tell me about yourself", true],
    ["so, to start, could you tell me a little bit about yourself?", true],
    ["could you walk me through your background?", true],
    ["please introduce yourself.", true],
    ["thanks for joining. tell me about yourself.", true],
    ["great! describe yourself in three words.", true],
    ["we run a three-person platform team. could you tell me about yourself?", false],
    ["tell me about a time you handled a resource constraint problem.", false],
];

for (const [q, expected] of cases) {
    const sentences = q.split(SENTENCE_BREAK).map((s) => s.trim()).filter(Boolean);
    const result = isIntroQuestion(q);
    const mark = expected === null ? '(edge case, no fixed expectation)' : (result === expected ? 'OK' : 'MISMATCH vs brief expectation');
    console.log(JSON.stringify({ q, sentences, result, expected, mark }));
}
