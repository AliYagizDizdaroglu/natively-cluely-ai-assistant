// exact copy of electron/services/containment.ts normalizeForContainment
function normalizeForContainment(text) {
  return text
    .toLowerCase()
    .replace(/\b([a-z]{1,3}) (\d+)\b/g, '$1$2')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const show = (s) => JSON.stringify(normalizeForContainment(s));
console.log('--- ordering: punctuation between token and digits ---');
console.log('p 99 ->', show('has p 99 latency'));
console.log('p. 99->', show('has p. 99 latency'));
console.log('P99  ->', show('has P99 latency'));
console.log('up. 99->', show('creeping up. 99 percent'));
console.log('up 99 ->', show('creeping up 99 percent'));
console.log('--- apostrophes: straight vs typographic ---');
console.log("straight:", show("What's the difference?"));
console.log("curly   :", show('What’s the difference?'));
console.log('contains?', normalizeForContainment('What’s the difference?').includes(normalizeForContainment("What's the difference?")));
console.log('--- other joins ---');
console.log('top 10   ->', show('the top 10 results'));
console.log('in 5     ->', show('answer in 5 minutes'));
console.log('gpt 4    ->', show('use gpt 4 for this'));
console.log('s 3      ->', show('store it in s 3 buckets'));
console.log('--- empty / digits only ---');
console.log('empty ->', show(''));
console.log('punct ->', show('?!.'));
console.log('digits->', show('10,000'));
console.log('--- containment across "10,000" vs "ten thousand" ---');
console.log(show('serving 10,000 requests'), '||', show('serving ten thousand requests'));
