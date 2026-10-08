// THROWAWAY: pause structure of the s50a hour as the STT saw it. For every question window,
// the Deepgram finals inside it and the gaps between consecutive finals (silences INSIDE a
// question, where an early answer would fire), versus the gap from a question's last final
// to the next question's first final (the true end of the turn). Also which speech-boundary
// events the log carries at all. Read-only over the run snapshot.
import fs from 'node:fs';
import path from 'node:path';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a';
const dbg = fs.readFileSync(path.join(RUN, 'natively_debug.log'), 'utf8');
const tl = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.timeline.json'), 'utf8'));
const ts = (s) => Date.parse(s);
const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/gm)]
    .map((m) => ({ at: ts(m[1]), text: m[2] })).filter((f) => f.text.trim() && f.at >= tl.startedMs);
const count = (re) => (dbg.match(re) ?? []).length;
console.log(`finals with text since the hour started: ${finals.length}`);
console.log(`boundary events in the log: UtteranceEnd ${count(/UtteranceEnd/g)}, SpeechStarted ${count(/SpeechStarted/g)}, vad ${count(/\bvad\b/gi)}, "speech_final" ${count(/speech_final/g)}, "turn" lines ${count(/turnComplete|turn complete|turn_complete/gi)}`);

const items = tl.items.map((i) => ({ ...i, playedAt: tl.startedMs + i.startSec * 1000, spokeEnd: tl.startedMs + (i.startSec + i.clipSecs) * 1000 }));
const inside = [], between = [];
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[Math.min(s.length - 1, Math.floor(p * s.length))] / 1000).toFixed(2) : '—'; };
console.log('\nper question: finals inside the clip window, and the gaps between them (s)');
for (let k = 0; k < items.length; k++) {
    const it = items[k];
    const w = finals.filter((f) => f.at >= it.playedAt - 500 && f.at <= it.spokeEnd + 4000);
    const gaps = w.slice(1).map((f, i) => f.at - w[i].at);
    inside.push(...gaps);
    const next = items[k + 1];
    if (next) {
        const nextFirst = finals.find((f) => f.at >= next.playedAt - 500);
        const last = w.at(-1);
        if (last && nextFirst) between.push(nextFirst.at - last.at);
    }
    const ends = w.map((f) => f.text.trim().slice(-1)).join('');
    console.log(`  ${it.id.padEnd(7)} ${String(it.level).padEnd(11)} clip ${it.clipSecs.toFixed(1).padStart(5)}s  finals ${String(w.length).padStart(2)}  gaps ${gaps.map((g) => (g / 1000).toFixed(1)).join(' ').padEnd(28)} last-chars "${ends}"`);
}
console.log(`\ngaps INSIDE a question (between consecutive finals): n=${inside.length}  p50 ${pct(inside, .5)}s  p90 ${pct(inside, .9)}s  max ${pct(inside, 1)}s`);
console.log(`gaps BETWEEN questions (last final → next first final): n=${between.length}  min ${pct(between, 0)}s  p10 ${pct(between, .1)}s`);
const bigInside = inside.filter((g) => g > 1000).length;
console.log(`inside gaps over 1.0 s: ${bigInside}; over 1.5 s: ${inside.filter((g) => g > 1500).length}; over 2.5 s: ${inside.filter((g) => g > 2500).length}`);
