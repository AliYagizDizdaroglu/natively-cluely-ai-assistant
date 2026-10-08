import fs from 'node:fs';
import path from 'node:path';

const FRAGMENT_CONJUNCTIONS = /^(and|so|but|or|then|because)\b/i;
const FRAGMENT_OPENERS = new Set([
    'what','why','how','when','where','which','who','whom','whose',
    'can','could','would','should','do','does','did','is','are','was','were','will','have','has',
    'tell','walk','describe','explain','give','compare','imagine','suppose','say','let',
]);
const TERMINAL_PUNCTUATION = /[.!?？…]["'”’)\]]*$/;
const TRAILING_FUNCTION_WORDS = new Set([
    'that','the','a','an','and','or','of','for','to','in','into','on','at','with','without',
    'from','by','as','like','than','because','if','while','your','our','their','its','my','his','her',
]);

function oldFrag(text) {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, '');
    return !FRAGMENT_OPENERS.has(first);
}
function newFrag(text) {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (!TERMINAL_PUNCTUATION.test(trimmed)) {
        if (words.length <= 6) return true;
        const last = words[words.length - 1].toLowerCase().replace(/[^a-z']+/g, '');
        if (TRAILING_FUNCTION_WORDS.has(last)) return true;
    }
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, '');
    return !FRAGMENT_OPENERS.has(first);
}

const RUNS = process.argv.slice(2);
for (const dir of RUNS) {
    const log = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const finals = [...log.matchAll(/\[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]*)"/g)].map((m) => m[1]).filter((t) => t.trim());
    const interims = [...log.matchAll(/\[DeepgramStreaming\] Transcript event — isFinal=false, text="([^"]+)"/g)].map((m) => m[1]);
    const rest = [...log.matchAll(/\[RestSTT\] Transcript: (.*)$/gm)].map((m) => m[1].trim()).filter(Boolean);
    const liveQ = [...log.matchAll(/\[Main\] Live question \(\w+, mode=\w+\): "([^"]*)"/g)].map((m) => m[1]);
    const heur = [...log.matchAll(/\[QuestionDetector\] degraded: chip from heuristic \(detector unavailable\): "([^"]*)"/g)].map((m) => m[1]);

    const report = (name, arr) => {
        const changed = arr.filter((t) => !oldFrag(t) && newFrag(t));
        const uniq = [...new Set(changed)];
        console.log(`  ${name}: n=${arr.length}  old-frag=${arr.filter(oldFrag).length}  new-frag=${arr.filter(newFrag).length}  newly-flagged=${changed.length} (${uniq.length} unique)`);
        return uniq;
    };
    console.log(`\n### ${path.basename(dir)}`);
    const cf = report('DG finals', finals);
    const ci = report('DG interims', interims);
    const cr = report('RestSTT finals', rest);
    const cl = report('Live question (<=80 chars, may be truncated)', liveQ);
    const ch = report('heuristic chips', heur);
    const show = (label, arr, n = 12) => { if (arr.length) { console.log(`   -- ${label} newly flagged (first ${n}):`); arr.slice(0, n).forEach((t) => console.log(`      ${JSON.stringify(t)}`)); } };
    show('finals', cf);
    show('interims', ci, 8);
    show('rest', cr);
    show('liveQ', cl);
    show('heuristic', ch);
}

// the script itself
const { INTERVIEW } = await import('file://' + path.resolve('electron/test/golden/interview60.questions.mjs'));
const qs = INTERVIEW.map((i) => i.q ?? i.question ?? '');
console.log(`\n### script questions: n=${qs.length}  old-frag=${qs.filter(oldFrag).length}  new-frag=${qs.filter(newFrag).length}`);
qs.filter((q) => newFrag(q)).forEach((q) => console.log('   FLAGGED: ' + JSON.stringify(q)));
