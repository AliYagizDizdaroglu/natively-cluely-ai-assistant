// Which spans does the hold release, char by char, for the s50k sentence?
const HOLD = /(\*\*|[*\\]|\$\\[A-Za-z]*(?:\{[^{}]{0,40}\}?)*\$?|\$[\d,]*(?:\.\d*)?\$?\s*[/^\\]?\s*|\\[a-z]*(?:\{[^}]{0,40})?)$/;
const raw = 'That gives a recall of $\\frac{3,000}{9,500}$, or about $31.5\\%$.';
let carry = '';
const spans = [];
for (const ch of raw) {
    let s = carry + ch;
    carry = '';
    const held = s.match(HOLD);
    if (held) { carry = held[0]; s = s.slice(0, -carry.length); }
    if (s) spans.push(s);
}
if (carry) spans.push(carry);
console.log('spans released:');
for (const s of spans) console.log('  ' + JSON.stringify(s));
