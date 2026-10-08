// Candidate replacement for the number-led-formula alternative in cleanNotation.
const CURRENT = /\$(?=[^\d\s])|\$(?=\d+(?:\.\d+)?\s*[/^*+](?:\s|\w|\())|(?<=\S)\$/g;
// "^" can never be money, so a word may follow it. "/", "*" and "+" are ambiguous with
// unit rates ("$50/hour", "$0.09/GB") and sums ("$120 + equity"), so they only read as
// formula when a space or "(" follows.
const PROPOSED = /\$(?=[^\d\s])|\$(?=\d+(?:\.\d+)?\s*(?:\^|[/*+](?:\s|\()))|(?<=\S)\$/g;

const cases = [
  ['formula rrf', 'as $1 / (c + rank)$ for each list.'],
  ['formula rrf tight', 'as $1/(c+rank)$ for each list.'],
  ['exponent', 'It runs in $2^n$ time.'],
  ['money plain', 'It cost $5 million.'],
  ['money M', 'Roughly $1.5M a year.'],
  ['money range', 'Between $5-10 million.'],
  ['rate hour', 'We paid $50/hour.'],
  ['rate GB', 'S3 egress is $0.09/GB.'],
  ['money plus', 'The offer was $120 + equity.'],
  ['olog', 'not $O(log n)$.'],
];
for (const [name, t] of cases) {
  console.log(name.padEnd(16), '| cur:', JSON.stringify(t.replace(CURRENT, '')), '| new:', JSON.stringify(t.replace(PROPOSED, '')));
}
