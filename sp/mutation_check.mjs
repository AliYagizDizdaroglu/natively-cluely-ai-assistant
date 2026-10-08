const FRAGMENT_CONJUNCTIONS = /^(and|so|but|or|then|because)\b/i;
const FRAGMENT_OPENERS = new Set([
    'what', 'why', 'how', 'when', 'where', 'which', 'who', 'whom', 'whose',
    'can', 'could', 'would', 'should', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'will', 'have', 'has',
    'tell', 'walk', 'describe', 'explain', 'give', 'compare', 'imagine', 'suppose', 'say', 'let',
]);

// ORIGINAL
function looksFragmentary(text) {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !FRAGMENT_OPENERS.has(first);
}

// MUTANT: rule 1 (fewer-than-4-words) short-circuit removed
function mutantNoRule1(text) {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    // if (words.length < 4) return true;  <-- REMOVED
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !FRAGMENT_OPENERS.has(first);
}

const cases = [
    ['And when would you not?', true],
    ['but the input schema is unchanged How do you debug this?', true],
    ['Serving.', true],
    ['Latency is up.', true],
    ['Cross many model services.', true],
    ['Latency is creeping up.', true],
    ['Tell me about yourself.', false],
    ['What is a Pod?', false],
    ['Is that clear enough?', false],
    ['Someone changed the resource by hand and now your stack will not update What do you do', false],
];

console.log('text -> expected | original | mutant(no rule1) | mutant matches expected?');
let mutantWouldStillPassAll = true;
for (const [text, expected] of cases) {
    const orig = looksFragmentary(text);
    const mut = mutantNoRule1(text);
    const origOk = orig === expected;
    const mutOk = mut === expected;
    if (!mutOk) mutantWouldStillPassAll = false;
    console.log(`${JSON.stringify(text)} -> ${expected} | orig=${orig}(${origOk ? 'OK' : 'BROKEN-BASELINE'}) | mutant=${mut}(${mutOk ? 'still passes' : 'FAILS - mutant caught!'})`);
}
console.log('\nWould deleting rule 1 (words.length < 4) still pass ALL of these hand-written test assertions?', mutantWouldStillPassAll);
