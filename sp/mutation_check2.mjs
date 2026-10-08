import { pathToFileURL } from 'node:url';
const target = pathToFileURL('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.questions.mjs').href;
const { SPOKEN } = await import(target);

const FRAGMENT_CONJUNCTIONS = /^(and|so|but|or|then|because)\b/i;
const FRAGMENT_OPENERS = new Set([
    'what', 'why', 'how', 'when', 'where', 'which', 'who', 'whom', 'whose',
    'can', 'could', 'would', 'should', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'will', 'have', 'has',
    'tell', 'walk', 'describe', 'explain', 'give', 'compare', 'imagine', 'suppose', 'say', 'let',
]);

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
for (const item of SPOKEN) cases.push([item.q, false]);

function run(fn, label) {
    let allPass = true;
    for (const [text, expected] of cases) {
        const got = fn(text);
        if (got !== expected) { allPass = false; console.log(`  [CAUGHT by] ${JSON.stringify(text)} -> expected ${expected}, got ${got}`); }
    }
    console.log(`${label}: all ${cases.length} existing assertions still pass? ${allPass}`);
}

// Mutant A: remove rule 2 (conjunction check)
run((text) => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    // if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true; // REMOVED
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !FRAGMENT_OPENERS.has(first);
}, 'Mutant A (rule 2 / conjunction removed)');

// Mutant B: remove words.length > 6 short-circuit (rule 3's word-count ceiling)
run((text) => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    // if (words.length > 6) return false; // REMOVED
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !FRAGMENT_OPENERS.has(first);
}, 'Mutant B (words>6 ceiling removed)');

// Mutant C: remove terminal '?' check
run((text) => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (words.length > 6) return false;
    // if (/[?？]["'”'')\]]*$/.test(trimmed)) return false; // REMOVED
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !FRAGMENT_OPENERS.has(first);
}, 'Mutant C (terminal ? check removed)');

// Mutant D: opener check inverted to always "not fragmentary" (i.e. treat every remaining case as whole)
run((text) => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    return false; // REMOVED opener check, always "whole"
}, 'Mutant D (opener-set check removed, default false)');

// Mutant E: rule 1 removed (repeat from previous script, folded in here for one consolidated report)
run((text) => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    // if (words.length < 4) return true; // REMOVED
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !FRAGMENT_OPENERS.has(first);
}, 'Mutant E (rule 1 / words<4 removed)');
