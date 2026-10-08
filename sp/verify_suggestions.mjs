const FRAGMENT_CONJUNCTIONS = /^(and|so|but|or|then|because)\b/i;
const FRAGMENT_OPENERS = new Set([
    'what', 'why', 'how', 'when', 'where', 'which', 'who', 'whom', 'whose',
    'can', 'could', 'would', 'should', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'will', 'have', 'has',
    'tell', 'walk', 'describe', 'explain', 'give', 'compare', 'imagine', 'suppose', 'say', 'let',
]);
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
function mutantNoRule1(text) {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !FRAGMENT_OPENERS.has(first);
}
function mutantNoQCheck(text) {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (words.length > 6) return false;
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !FRAGMENT_OPENERS.has(first);
}

console.log('"What now." original =', looksFragmentary('What now.'), '| mutantNoRule1 =', mutantNoRule1('What now.'));
console.log('"Running the tests now?" original =', looksFragmentary('Running the tests now?'), '| mutantNoQCheck =', mutantNoQCheck('Running the tests now?'));
