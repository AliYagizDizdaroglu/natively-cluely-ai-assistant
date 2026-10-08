const text = `Head/tail splits whose head ends on a content word (after5 W11: "…Dockerfile for a Python" was answered whole, the tail "model server and why" held then answered at expiry). A REST-chunking class; the head rule cannot see it without punctuation evidence.`;

const width = 93;
const words = text.split(' ');
let lines = [];
let cur = '- '; // first line prefix
let first = true;
for (const w of words) {
    const prefix = cur === '- ' || cur === '  ' ? '' : ' ';
    const candidate = cur + prefix + w;
    if (candidate.length > width && cur !== '- ' && cur !== '  ') {
        lines.push(cur);
        cur = '  ' + w;
    } else {
        cur = candidate;
    }
}
lines.push(cur);
console.log(lines.join('\n'));
console.log('---lengths---');
lines.forEach(l => console.log(l.length, JSON.stringify(l)));
