import fs from 'node:fs';

// 1. the preflight regex against the two real start lines
const RE = /\[Main\] Using (\w+) for interviewer/g;
for (const line of [
    '[Main] Using DeepgramStreamingSTT for interviewer',
    '[Main] Using RestSTT (groq) for interviewer',
    '[Main] Using SonioxStreamingSTT for interviewer',
    '[Main] Using ElevenLabsStreamingSTT for interviewer',
    '[Main] Using OpenAIStreamingSTT for interviewer (WebSocket+REST fallback)',
    '[Main] Using RestSTT (azure) for interviewer',
]) {
    const m = [...line.matchAll(RE)].pop();
    console.log((m ? 'MATCH  ' + m[1] : 'NO MATCH').padEnd(28), line);
}

// 2. F1: does any corpus text end on a word with a straight apostrophe?
// 3. F2: how many Deepgram finals lack terminal punctuation?
const TERMINAL = /[.!?？…]["'”’)\]]*$/;
for (const dir of [
    'electron/test/golden/interview60.runs/2026-09-04T08-09-38-after4',
    'electron/test/golden/interview60.runs/2026-09-02-before',
    'electron/test/golden/interview60.runs/2026-09-04T22-43-34-after5',
]) {
    const log = fs.readFileSync(dir + '/natively_debug.log', 'utf8');
    const dg = [...log.matchAll(/\[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]*)"/g)].map((m) => m[1]).filter((t) => t.trim());
    const rest = [...log.matchAll(/\[RestSTT\] Transcript: (.*)$/gm)].map((m) => m[1].trim()).filter(Boolean);
    const all = [...dg, ...rest];
    const noTerm = all.filter((t) => !TERMINAL.test(t.trim()));
    const apos = all.filter((t) => /'\s*$/.test(t.trim()));
    console.log(`\n${dir.split(/[\\/]/).pop()}: finals n=${all.length}  without terminal punctuation=${noTerm.length}  ending on a straight apostrophe=${apos.length}`);
    if (noTerm.length) console.log('   sample unpunctuated:', noTerm.slice(0, 3).map((t) => JSON.stringify(t)).join(' | '));
}
