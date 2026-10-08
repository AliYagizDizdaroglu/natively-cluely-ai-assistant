const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function hasWord(lower, term) {
    return new RegExp(`(^|[^a-z0-9])${escapeRe(term)}(?![a-z0-9])`).test(lower);
}

const STRONG_NEGOTIATION = [
    'salary', 'compensation', 'negotiate', 'negotiable', 'equity', 'rsu', 'rsus', 'signing bonus',
    'total comp', 'market rate', 'counteroffer', 'counter offer',
];

function classifyStrongOnly(question) {
    const lower = question.toLowerCase();
    return STRONG_NEGOTIATION.some(kw => hasWord(lower, kw));
}

const cases = [
  ['how would you reduce the payload size of the request?', 'pay', false],
  ['how do you scale the database?', 'base', false],
  ['what signing bonus would make this work for you?', 'signing bonus', true],
  ['when would you use s3 standard versus s3 glacier for training data?', 'rsu', false],
  ['how do you keep base images patched across many model services?', 'base', true],
  ['what is the requirement for the range of a counter in this stock system?', 'requirement', true],
];

let allPass = true;
for (const [str, term, expected] of cases) {
  const got = hasWord(str, term);
  const pass = got === expected;
  allPass = allPass && pass;
  console.log(JSON.stringify({str, term, expected, got, pass}));
}

console.log('---full classifyIntent strong-only check---');
const strongCases = [
  ['What are your salary expectations for this role?', true],
  ['We can offer 140k base plus equity — how does that sound?', true],
  ['Is the compensation package negotiable?', true],
  ['What signing bonus would make this work for you?', true],
  ['What do you expect the base image to contain?', false],
  ['How would you reduce the payload size of the request?', false],
  ['What is the requirement for the range of a counter in this stock system?', false],
  ['How do you scale the database?', false],
];
for (const [q, expected] of strongCases) {
  const got = classifyStrongOnly(q);
  const pass = got === expected;
  allPass = allPass && pass;
  console.log(JSON.stringify({q, expected, got, pass}));
}

console.log(allPass ? 'ALL PASS' : 'SOME FAILED');
