// Throwaway: how much did the after6 hour (Deepgram ear) exercise each fix, and
// what did the four watched items (H03, H09, W02, M19) get? Read-only over the run log.
// usage: node after6-exercise.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';

const R = process.argv[2];
const dbg = fs.readFileSync(path.join(R, 'natively_debug.log'), 'utf8');
const tl = JSON.parse(fs.readFileSync(path.join(R, 'interview60.timeline.json'), 'utf8')).items;
const count = (re) => (dbg.match(re) ?? []).length;
const DISPATCH = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: reason=(\w+))?(?: question=("(?:[^"\\]|\\.)*"))?/gm;
const disp = [...dbg.matchAll(DISPATCH)].map((m) => ({ at: Date.parse(m[1]), action: m[2], source: m[3], anchor: JSON.parse('"' + m[4] + '"'), verdict: m[5], dup: m[6], reason: m[8], q: m[9] ? JSON.parse(m[9]) : null }));

console.log('--- Fix A exercise: reconcile verdicts on Live dispatches');
const live = disp.filter((d) => d.source === 'live');
for (const v of ['match', 'paraphrase', 'replaced', 'unverifiable']) console.log('   ' + v.padEnd(13), live.filter((d) => d.verdict === v).length);
console.log('   "Live question replaced by transcript" lines:', count(/Live question replaced by transcript/g));

console.log('--- Fix B exercise: fragment holds');
const holds = disp.filter((d) => d.action === 'hold');
console.log('   holds:', holds.length);
for (const h of holds) {
    const res = disp.find((d) => d.at > h.at && d.at - h.at <= 2700 && d.action !== 'hold' && d.q === h.q);
    const other = disp.find((d) => d.at > h.at && d.at - h.at <= 2700 && d.source !== h.source && d.action === 'answer');
    console.log('   ' + new Date(h.at).toISOString().slice(11, 19), h.source, 'reason=' + h.reason, JSON.stringify((h.q ?? '').slice(0, 60)), '-> resolved as', res ? res.action + (res.dup ? ' (dup of ' + res.dup + ')' : '') : '?', other ? '| other ear answered inside the hold' : '| no other-ear answer inside the hold');
}

console.log('--- Fix C exercise: intro shortcut');
console.log('   "returning generated intro response" lines:', count(/returning generated intro response/g), '| Intent classified lines:', count(/\[KnowledgeOrchestrator\] Intent classified/g));

console.log('--- the four watched items: answer dispatches (source:question)');
for (const id of ['H03', 'H09', 'W02', 'M19']) {
    const it = tl.find((i) => i.id === id);
    const end = it.playedAt + Math.round((it.clipSecs ?? 0) * 1000) + 60000;
    const a = disp.filter((d) => d.action === 'answer' && d.at >= it.playedAt - 2000 && d.at <= end);
    console.log('   ' + id, a.map((d) => d.source + ':' + JSON.stringify((d.q ?? d.anchor).slice(0, 72))).join(' | ') || 'no answer dispatch');
}

console.log('--- ears');
console.log('   ' + (dbg.match(/\[LiveRouter\][^\n]*(model|connect)[^\n]{0,70}/)?.[0] ?? 'no LiveRouter model line').slice(0, 140));
console.log('   Deepgram finals:', count(/\[DeepgramStreaming\] Transcript event — isFinal=true/g), '| reconnects:', count(/\[DeepgramStreaming\] Connecting/g), '| "1011" mentions:', count(/1011/g));
const answers = disp.filter((d) => d.action === 'answer');
console.log('   answer dispatches:', answers.length, '| by source: live', answers.filter((d) => d.source === 'live').length, 'whisper', answers.filter((d) => d.source === 'whisper').length);
