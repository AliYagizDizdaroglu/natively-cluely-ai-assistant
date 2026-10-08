import fs from 'node:fs';
const F=process.argv[2]+'/verbalStreamFilter.ts';
let s=fs.readFileSync(F,'utf8');
const rep=(a,b)=>{ if(s.split(a).length!==2) throw new Error('anchor: '+a.slice(0,50)); s=s.replace(a,()=>b); };
rep(` * A stream whose first non-blank character is "{" is a structured payload,
 * not speech: it passes through whole and counts no words.
`,` * A stream that opens with {" (the start of JSON.stringify of an object) is a
 * structured payload, not speech: it passes through whole and counts no words.
`);
rep(`    // Decided once, on the first non-blank character — the rule stripSpokenNotation uses.
    let decided = false;
    let payload = false;
    for await (const chunk of source) {
        if (SENTINEL_CHUNK.test(chunk)) { yield chunk; continue; } // not words — leaves carry/inWord alone
        if (!decided && chunk.trim()) { decided = true; payload = chunk.trimStart().startsWith('{'); }
        if (payload) { yield chunk; continue; }
`,`    // Decided once, on {" — the start of JSON.stringify of an object, after upstream cleanup. A bare
    // "{" is not enough: a spoken answer may open "{} is the empty dict…" and must stay clamped. So
    // text is held while all that has arrived is blank or one "{", then processed as one chunk.
    let decided = false;
    let payload = false;
    let probe = '';
    for await (let chunk of source) {
        if (SENTINEL_CHUNK.test(chunk)) { yield chunk; continue; } // not words — leaves carry/inWord alone
        if (!decided) {
            const head = (probe += chunk).trimStart();
            if (head === '' || head === '{') continue;
            decided = true;
            payload = head.startsWith('{"');
            chunk = probe;
        }
        if (payload) { yield chunk; continue; }
`);
rep(`    if (carry) {
        if (mode === 'stream') {
            // Same trim as the loop`,`    if (!decided && probe) { emitted += track(probe); yield probe; } // only blanks or a lone "{" ever arrived
    if (carry) {
        if (mode === 'stream') {
            // Same trim as the loop`);
fs.writeFileSync(F,s);
