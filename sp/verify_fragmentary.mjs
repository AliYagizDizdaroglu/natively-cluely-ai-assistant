import { pathToFileURL } from 'node:url';
const target = pathToFileURL('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.questions.mjs').href;
const { SPOKEN } = await import(target);

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

console.log('SPOKEN.length =', SPOKEN.length);

let flagged = 0;
const wordCounts = [];
for (const item of SPOKEN) {
    const words = item.q.trim().split(/\s+/).filter(Boolean);
    wordCounts.push({ id: item.id, n: words.length, q: item.q });
    const flag = looksFragmentary(item.q);
    if (flag) {
        flagged++;
        console.log('FLAGGED:', item.id, JSON.stringify(item.q));
    }
}
console.log('flagged count =', flagged);

wordCounts.sort((a, b) => a.n - b.n);
console.log('5 shortest:', wordCounts.slice(0, 5).map(w => `${w.id}(${w.n}): ${w.q}`).join('\n  '));

const noQMark = SPOKEN.filter(item => !/[?？]["'”’)\]]*$/.test(item.q.trim()));
console.log('SPOKEN items not ending in ? (closing punct allowed):', noQMark.length, noQMark.map(i => i.id));
