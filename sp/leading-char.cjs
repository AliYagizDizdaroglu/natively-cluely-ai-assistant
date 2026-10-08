// Throwaway: which stage of the verbal answer chain drops the first character when
// the model's first chunk is a single letter ("I" | "’d start…", "S" | "o, my…")?
// Runs the BUILT chain (dist-electron) stage by stage on synthetic chunk sequences.
// usage: node leading-char.cjs <repo-root>
const path = require('node:path');
const root = process.argv[2];
const V = require(path.join(root, 'dist-electron', 'electron', 'llm', 'verbalStreamFilter.js'));
const { WhatToAnswerLLM } = require(path.join(root, 'dist-electron', 'electron', 'llm', 'WhatToAnswerLLM.js'));

async function* gen(chunks) { for (const c of chunks) yield c; }
async function collect(g) { let s = ''; for await (const c of g) s += c; return s; }

const cases = {
    'I|’d': ['I', '’d start by checking the metrics. Then I look at the logs for errors.'],
    'S|o,': ['S', 'o, my initial thought is to break this down. Then I would test it.'],
    'T|o ': ['T', 'o manage the drift I treat infrastructure as code. Then I deploy.'],
    'sentinel then I|’d': ['__model_source:Gemini Flash__', 'I', '’d start by checking the metrics. Then I look at the logs.'],
    'I|’d (one chunk)': ['I’d start by checking the metrics. Then I look at the logs.'],
};
const proto = WhatToAnswerLLM.prototype;
(async () => {
    for (const [name, chunks] of Object.entries(cases)) {
        const s1 = await collect(proto.stripModelSentinel.call({}, gen(chunks)));
        const s2 = await collect(proto.filterCodeFences.call({}, proto.stripModelSentinel.call({}, gen(chunks))));
        const s3 = await collect(V.filterVerbalLines(proto.filterCodeFences.call({}, proto.stripModelSentinel.call({}, gen(chunks)))));
        const s4 = await collect(V.stripSuggestionBlock(V.filterVerbalLines(proto.filterCodeFences.call({}, proto.stripModelSentinel.call({}, gen(chunks)))), () => { }));
        const s5 = await collect(V.stripSpokenNotation(V.stripSuggestionBlock(V.filterVerbalLines(proto.filterCodeFences.call({}, proto.stripModelSentinel.call({}, gen(chunks)))), () => { })));
        console.log(`--- ${name}`);
        console.log('  sentinel   :', JSON.stringify(s1.slice(0, 40)));
        console.log('  codeFences :', JSON.stringify(s2.slice(0, 40)));
        console.log('  verbalLines:', JSON.stringify(s3.slice(0, 40)));
        console.log('  suggestion :', JSON.stringify(s4.slice(0, 40)));
        console.log('  notation   :', JSON.stringify(s5.slice(0, 40)));
    }
})();
