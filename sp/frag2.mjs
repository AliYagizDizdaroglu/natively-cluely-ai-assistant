import fs from 'node:fs';
import path from 'node:path';

const FRAGMENT_CONJUNCTIONS = /^(and|so|but|or|then|because)\b/i;
const FRAGMENT_OPENERS = new Set(['what','why','how','when','where','which','who','whom','whose','can','could','would','should','do','does','did','is','are','was','were','will','have','has','tell','walk','describe','explain','give','compare','imagine','suppose','say','let']);
const TERMINAL_PUNCTUATION = /[.!?？…]["'”’)\]]*$/;
const TRAILING_FUNCTION_WORDS = new Set(['that','the','a','an','and','or','of','for','to','in','into','on','at','with','without','from','by','as','like','than','because','if','while','your','our','their','its','my','his','her']);

function oldFrag(text) {
    const t = text.trim(); const w = t.split(/\s+/).filter(Boolean);
    if (w.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(t)) return true;
    if (w.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(t)) return false;
    return !FRAGMENT_OPENERS.has(w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, ''));
}
function newFrag(text) {
    const t = text.trim(); const w = t.split(/\s+/).filter(Boolean);
    if (w.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(t)) return true;
    if (!TERMINAL_PUNCTUATION.test(t)) {
        if (w.length <= 6) return true;
        if (TRAILING_FUNCTION_WORDS.has(w[w.length - 1].toLowerCase().replace(/[^a-z']+/g, ''))) return true;
    }
    if (w.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(t)) return false;
    return !FRAGMENT_OPENERS.has(w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, ''));
}

// CALIBRATION of the extractor itself: known answers first.
const KNOWN = [
    ['How would you design a pipeline that', true, true],       // after5 H03 head — must be NEW-frag
    ['What is a DAG, and why does Airflow use that structure?', false, false],
    ['Cross many model services.', true, true],
    ['How would you shrink an eight gigabyte training image', false, false],
];
for (const [t, wantNew] of KNOWN) {
    const got = newFrag(t);
    if (got !== wantNew) { console.log(`EXTRACTOR CALIBRATION FAILED on ${JSON.stringify(t)}: got ${got}, want ${wantNew}`); process.exit(1); }
}
console.log('predicate calibration: 4/4 known cases correct\n');

for (const dir of process.argv.slice(2)) {
    const log = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    // RestSTT logs:  [RestSTT] Transcript: " <text>" id=xxxx   → strip the id and the wrapping quotes
    const rest = [...log.matchAll(/\[RestSTT\] Transcript: "(.*)" id=\w+$/gm)].map((m) => m[1].trim()).filter(Boolean);
    const dg = [...log.matchAll(/\[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]*)"/g)].map((m) => m[1].trim()).filter(Boolean);
    const finals = rest.length ? rest : dg;
    const kind = rest.length ? 'RestSTT' : 'Deepgram';
    const changed = finals.filter((t) => !oldFrag(t) && newFrag(t));
    const noTerm = finals.filter((t) => !TERMINAL_PUNCTUATION.test(t));
    console.log(`### ${path.basename(dir)}  (${kind})`);
    console.log(`  finals n=${finals.length}  unpunctuated=${noTerm.length}  old-frag=${finals.filter(oldFrag).length}  new-frag=${finals.filter(newFrag).length}  newly flagged=${changed.length} (${new Set(changed).size} unique)`);
    [...new Set(changed)].slice(0, 15).forEach((t) => console.log('     ' + JSON.stringify(t)));
    console.log();
}
