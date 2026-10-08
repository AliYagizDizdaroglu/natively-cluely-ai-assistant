// Throwaway: exact event order for the four wrong answers of the after4 hour —
// every STT final, Live question, detector chip, dispatch, engine log and
// answer inside each item's play window, in arrival order, so the design is
// argued from the real sequence rather than a sketch.
// usage: node trace-four-cases.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split('\n');
const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const KEEP = /\[DeepgramStreaming\] Transcript event — isFinal=true|\[Main\] Live question|\[QuestionDetector\] chip|\[Main\] dispatch|\[IntelligenceEngine\] runWhatShouldISay|\[IntelligenceEngine\] Injecting|\[QD-timing\] debounce elapsed|\[QuestionDetector\] merged|\[Answer\] full|\[Main\] Live question replaced/;
for (const id of ['M26', 'M27', 'M28', 'H09']) {
    const it = timeline.items.find((i) => i.id === id);
    const start = it.playedAt - 1000, end = it.playedAt + Math.round(it.clipSecs * 1000) + 25000;
    console.log('\n=== ' + id + ' (' + it.clipSecs + 's)  script: ' + it.q);
    for (const line of dbg) {
        const m = line.match(/^(\S+) /);
        if (!m) continue;
        const at = Date.parse(m[1]);
        if (!(at >= start && at <= end) || !KEEP.test(line)) continue;
        const rel = ((at - it.playedAt) / 1000).toFixed(1).padStart(6);
        console.log(rel + 's  ' + line.replace(/^\S+ \[LOG\] /, '').replace(/^\S+ \[WARN\] /, 'WARN ').slice(0, 230));
    }
}
