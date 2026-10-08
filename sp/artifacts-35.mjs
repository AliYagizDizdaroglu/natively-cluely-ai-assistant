// Throwaway: how much unspeakable text survives the SHIPPED filter chain per arm. The 3.5 probes
// wrote LaTeX dollar math and a SQL fence, and graders flagged both on 3.5 arms, so count them
// on the filtered `spoken` text (what the app would actually say aloud).
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'bench');
const FENCE = /```/;
const LATEX = /\$[\d\\]|\\frac|\\times|\\%|\\\(/;
const BOLD = /\*\*/;
console.log('arm              answers   code fences   LaTeX math   bold markers   any');
for (const arm of ['control', 'think-low', 'think35-medium', 'think35-high']) {
    let n = 0, fence = 0, latex = 0, bold = 0, any = 0;
    for (const rep of [1, 2, 3]) {
        const f = path.join(OUT, `${arm}.rep${rep}.json`);
        if (!fs.existsSync(f)) continue;
        for (const v of Object.values(JSON.parse(fs.readFileSync(f, 'utf8')))) {
            if (!v.spoken) continue;
            n++;
            const a = FENCE.test(v.spoken), b = LATEX.test(v.spoken), c = BOLD.test(v.spoken);
            if (a) fence++; if (b) latex++; if (c) bold++; if (a || b || c) any++;
        }
    }
    console.log(`${arm.padEnd(16)} ${String(n).padStart(6)} ${String(fence).padStart(13)} ${String(latex).padStart(12)} ${String(bold).padStart(14)} ${String(any).padStart(5)}`);
}
