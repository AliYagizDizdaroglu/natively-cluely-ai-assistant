// Throwaway: does the BUILT app (dist-electron) carry every recent change, and is it newer than every
// electron/*.ts source? Prints each marker's file + hit, the build time, the newest source file.
//   node check-dist-markers.mjs
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const D = `${MAIN}/dist-electron/electron`;
const MARKERS = [
    ['bb94db4 R09 phrase list', 'knowledge/IntentClassifier.js', '"salary expectation"'],
    ['bb94db4 R09 technical veto', 'knowledge/IntentClassifier.js', '"sequel"'],
    ['6c50ec3 follow-up flag name', 'llm/followUpParent.js', 'NATIVELY_FOLLOWUP_PARENT'],
    ['6c50ec3 engine wiring', 'IntelligenceEngine.js', 'withParentExchange'],
    ['6c50ec3 tracker question arg', 'SessionTracker.js', 'addAssistantMessage(text, questionContext)'],
    ['6c50ec3 engine passes the question', 'IntelligenceEngine.js', 'addAssistantMessage(fullAnswer, settled'],
    ['da28f25 hedge startup describe', 'llm/verbalHedge.js', 'describeVerbalHedgeAtStartup'],
    ['da28f25 hedge race', 'LLMHelper.js', 'streamGeminiWithHedge'],
    ['da28f25 hedge log line', 'LLMHelper.js', 'verbal hedge: front='],
    ['da28f25 winner re-announce', 'llm/WhatToAnswerLLM.js', 'HEDGE_WINNER.exec('],
    ['da28f25 winner sentinel', 'LLMHelper.js', '(hedge)__`;'],
    ['da28f25 answer-source log', 'main.js', 'answer source:'],
    ['da28f25 startup refusal', 'main.js', 'refusing to start'],
    ['9107a93 follow-up startup check', 'main.js', 'describeFollowUpParentAtStartup'],
    ['9107a93 follow-up startup text', 'llm/followUpParent.js', 'follow-up parent: '],
];
let ok = true;
let oldestBuilt = Infinity;
for (const [name, rel, needle] of MARKERS) {
    const f = `${D}/${rel}`;
    if (!fs.existsSync(f)) { console.log(`MISSING FILE  ${name}: ${rel}`); ok = false; continue; }
    const hit = fs.readFileSync(f, 'utf8').includes(needle);
    const t = fs.statSync(f).mtimeMs;
    oldestBuilt = Math.min(oldestBuilt, t);
    console.log(`${hit ? 'ok  ' : 'NO  '} ${name.padEnd(32)} ${rel.padEnd(30)} built ${new Date(t).toTimeString().slice(0, 8)}`);
    if (!hit) ok = false;
}
let newest = { t: 0, f: '' };
const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
        if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name)) continue;
        const t = fs.statSync(p).mtimeMs;
        if (t > newest.t) newest = { t, f: path.relative(MAIN, p) };
    }
};
walk(`${MAIN}/electron`);
const fresh = oldestBuilt >= newest.t;
console.log(`newest non-test electron source: ${newest.f} ${new Date(newest.t).toTimeString().slice(0, 8)}; oldest marker file built ${new Date(oldestBuilt).toTimeString().slice(0, 8)} -> ${fresh ? 'build is newer' : 'SOURCE NEWER THAN BUILD'}`);
console.log(ok && fresh ? 'DIST OK: every marker present, build newer than every source' : 'DIST NOT OK');
process.exit(ok && fresh ? 0 : 1);
