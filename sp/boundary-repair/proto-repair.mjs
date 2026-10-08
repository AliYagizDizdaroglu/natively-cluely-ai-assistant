// Throwaway prototype of the planned electron/audio/deepgramBoundaryRepair.ts (plan 2026-09-29).
// (1) runs the rule on the plan's fixtures against the outputs the plan will assert;
// (2) replays it over every run log (every Transcript event, empties included, as the adapter
//     will feed it) and prints each fire — must be 17 non-holdout + 4 holdout, all known losses;
// (3) diffs its tokeniser against boundary-loss-truth.mjs's on every logged string.
// Read-only over the logs.
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const REPAIR_WINDOW_MS = 5000, RESUME_WORDS_MAX = 3, RESUME_WORDS_MIN = 2;
const WORD = /(?:[A-Za-z0-9']|(?<=\d),(?=\d))+/g;
const words = (text) => (text.match(WORD) ?? []).map((raw) => ({ raw, norm: raw.toLowerCase().replace(/,/g, '') }));

class DeepgramBoundaryRepair {
    latestInterim = null;
    cut = null;
    observe(text, isFinal, atMs) {
        if (!isFinal) { this.latestInterim = words(text); return { text, restored: null }; }
        const final = words(text);
        let restored = null;
        if (this.cut && atMs - this.cut.atMs <= REPAIR_WINDOW_MS) {
            const skipped = this.cut.interim[this.cut.kept];
            const resumed = this.cut.interim.slice(this.cut.kept + 1);
            const n = Math.min(RESUME_WORDS_MAX, resumed.length, final.length);
            if (n >= RESUME_WORDS_MIN && resumed.slice(0, n).every((w, i) => w.norm === final[i].norm)) restored = skipped.raw;
        }
        this.cut = null;
        const interim = this.latestInterim;
        if (interim && final.length > 0 && final.length < interim.length && final.every((w, i) => w.norm === interim[i].norm)) {
            this.cut = { interim, kept: final.length, atMs };
        }
        this.latestInterim = null;
        return { text: restored === null ? text : `${restored} ${text}`, restored };
    }
}

// ---------- (1) fixtures: [text, isFinal, atMs] ; expected = emitted text of every FINAL, in order
let bad = 0;
function check(name, events, expectedFinals) {
    const r = new DeepgramBoundaryRepair();
    const got = [];
    for (const [text, isFinal, atMs] of events) { const o = r.observe(text, isFinal, atMs); if (isFinal) got.push(o.text); }
    const ok = JSON.stringify(got) === JSON.stringify(expectedFinals);
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
    if (!ok) console.log('   got      ' + JSON.stringify(got) + '\n   expected ' + JSON.stringify(expectedFinals));
}
const I = (t) => [t, false, 0], F = (t, ms) => [t, true, ms];

check('R22 (design)', [
    I('How do you cut hallucinations in a rag answer without just making'),
    F('How do you cut', 27826),
    F('in a rag answer without just making it refuse?', 29373),
], ['How do you cut', 'hallucinations in a rag answer without just making it refuse?']);

check('after7 M13 infrastructure', [
    I('How do you manage secrets in infrastructure'),
    I('How do you manage secrets in infrastructure as code without'),
    F('How do you manage secrets in', 26574),
    I('as code without'),
    F('as code without committing them?', 27470),
], ['How do you manage secrets in', 'infrastructure as code without committing them?']);

check('s50d S1Q01F prefer', [
    I('Under what conditions would you prefer a'),
    I('Under what conditions would you prefer logistic regression?'),
    F('Under what conditions would you', 10124),
    I('logistic regression?'),
    I('logistic regression,'),
    I('logistic regression, a neural network,'),
    I('logistic regression, a neural network,'),
    I('logistic regression, a neural network, or a rules based'),
    F('logistic regression, a neural network, or a rules based approach?', 13808),
], ['Under what conditions would you', 'prefer logistic regression, a neural network, or a rules based approach?']);

check('s50d S1Q10 platform', [
    I('Secure the churn platform without'),
    I('Secure the churn platform without embedded'),
    F('Secure the churn', 30156),
    I('without embedded credentials'),
    I('without embedded credentials,'),
    I('without embedded credentials. How would your inference'),
    I('without embedded credentials. How would your inference service access'),
    F('without embedded credentials. How would your inference service access the model', 33665),
], ['Secure the churn', 'platform without embedded credentials. How would your inference service access the model']);

check('s50g S2Q07 support', [
    I('service over 10,000,000 documents. It has to support document updates'),
    F('service over 10,000,000 documents, it has to', 7316),
    I('document updates and deletions'),
    I('document updates and deletions,'),
    I('support document updates and deletions, access controlled'),
    I('document updates and deletions, access controlled retrieval,'),
    F('document updates and deletions, access controlled retrieval,', 10348),
], ['service over 10,000,000 documents, it has to', 'support document updates and deletions, access controlled retrieval,']);

check('after6 H11 after (751 ms)', [
    I('Your training job costs tripled after a code change'),
    F('Your training job costs tripled', 37647),
    I('a code change with no accuracy'),
    F('a code change with no accuracy gain.', 38398),
], ['Your training job costs tripled', 'after a code change with no accuracy gain.']);

// negatives
check('after7 07:13:51 continues where the cut stopped', [
    I('To start, what is the difference'),
    F('To start,', 51887),
    I('what is the difference between a'),
    I('what is the difference between a Docker image and a'),
    F('what is the difference between a Docker image and a container?', 53728),
], ['To start,', 'what is the difference between a Docker image and a container?']);

check('after7 07:13:32 interim holds only the one word after the cut', [
    I('How would you handle auto scaling'),
    F('How would you handle auto', 32786),
    I('scaling for a model in for'),
    I('scaling for a model inference service on'),
    F('for a model inference service on Kubernetes?', 34852),
], ['How would you handle auto', 'for a model inference service on Kubernetes?']);

check('after7 07:20:23 previous final longer than its interim', [
    I('What problem'),
    I('What problem does infrastructure'),
    F('What problem does infrastructure as code', 24825),
    F('solve?', 25986),
], ['What problem does infrastructure as code', 'solve?']);

check('unrelated next final', [
    I('How do you cut hallucinations in a rag answer without just making'),
    F('How do you cut', 27826),
    F('What about the cost?', 29373),
], ['How do you cut', 'What about the cost?']);

check('two words skipped', [
    I('How do you cut hallucinations in a rag answer without just making'),
    F('How do you', 27826),
    F('in a rag answer without just making it refuse?', 29373),
], ['How do you', 'in a rag answer without just making it refuse?']);

check('5000 ms restores, 5001 does not', [
    I('How do you cut hallucinations in a rag answer without just making'),
    F('How do you cut', 1000),
    F('in a rag answer without just making it refuse?', 6000),
    I('How do you cut hallucinations in a rag answer without just making'),
    F('How do you cut', 10000),
    F('in a rag answer without just making it refuse?', 15001),
], ['How do you cut', 'hallucinations in a rag answer without just making it refuse?', 'How do you cut', 'in a rag answer without just making it refuse?']);

check('one-word next final', [
    I('How do you cut hallucinations in a rag answer without just making'),
    F('How do you cut', 27826),
    F('in', 29373),
], ['How do you cut', 'in']);

check('empty interim between the cut interim and the final ends the cut', [
    I('How do you cut hallucinations in a rag answer without just making'),
    I(''),
    F('How do you cut', 27826),
    F('in a rag answer without just making it refuse?', 29373),
], ['How do you cut', 'in a rag answer without just making it refuse?']);

check('a cut is checked against the next final only', [
    I('How do you cut hallucinations in a rag answer without just making'),
    F('How do you cut', 27826),
    F('Okay.', 28000),
    F('in a rag answer without just making it refuse?', 29373),
], ['How do you cut', 'Okay.', 'in a rag answer without just making it refuse?']);

check('normalisation: case, punctuation, 10,000 one word, original spelling restored', [
    I('It has to support 10,000 customers, nightly'),
    F('it has to support', 1000),
    F('customers nightly and on demand', 2000),
    I('Deploy the Model on Kubernetes, then scale it'),
    F('deploy the model on', 3000),
    F('then scale it out', 4000),
], ['it has to support', '10,000 customers nightly and on demand', 'deploy the model on', 'Kubernetes then scale it out']);

check('the cut of a repaired final is taken from its own words (a second loss is repaired too)', [
    I('one two three four five six'),
    F('one two', 1000),
    I('four five six seven eight'),
    F('four five', 1500),
    F('seven eight nine', 2000),
], ['one two', 'three four five', 'six seven eight nine']);

console.log(`fixtures: ${bad === 0 ? 'ALL OK' : bad + ' FAILED'}`);

// ---------- (2) replay over every run log, (3) tokeniser diff
const tok = (s) => String(s).toLowerCase().replace(/(\d),(\d)/g, '$1$2').match(/[a-z0-9']+/g) ?? [];
const unq = (s) => JSON.parse(`"${s}"`);
const fires = { holdout: 0, other: 0 };
let tokDiff = 0, events = 0;
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const bucket = /h40/.test(dir) ? 'holdout' : 'other';
    const r = new DeepgramBoundaryRepair();
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (!m) continue;
        const text = unq(m[3]);
        events++;
        if (JSON.stringify(tok(text)) !== JSON.stringify(words(text).map((w) => w.norm))) { tokDiff++; if (tokDiff <= 5) console.log(`TOKDIFF ${JSON.stringify(text)}`); }
        const o = r.observe(text, m[2] === 'true', Date.parse(m[1]));
        if (o.restored !== null) { fires[bucket]++; console.log(`${bucket === 'holdout' ? 'H ' : '  '}${dir} ${m[1]} restored "${o.restored}" before "${text.slice(0, 40)}"`); }
    }
}
console.log(`\nFIRES ${JSON.stringify(fires)} (expected other 17, holdout 4); tokeniser differences ${tokDiff} of ${events} event texts`);
