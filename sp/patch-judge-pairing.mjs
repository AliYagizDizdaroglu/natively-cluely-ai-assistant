// Judge pairing: an anchor with no content words at all ("And when would you
// not?") is claimed by time alone — the latest item already playing when it was
// dispatched — instead of being dropped. usage: node patch-judge-pairing.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const NL = '\n';
const patch = (file, edits) => {
    const p = path.join(root, file);
    let s = fs.readFileSync(p, 'utf8');
    for (const [a, b, label] of edits) {
        const n = s.split(a).length - 1;
        if (n !== 1) throw new Error(`${file} ${label}: matched ${n}`);
        s = s.replace(a, () => b);
        console.log(`ok ${file} ${label}`);
    }
    fs.writeFileSync(p, s);
};

patch('electron/test/golden/interview60.judge.mjs', [
    ["        const item = best && bestOv >= 0.25 ? best : null;",
     "        // An anchor made only of stop words (\"And when would you not?\" — the tail of a" + NL +
     "        // question STT split in two) overlaps nothing; it is claimed by time alone, the" + NL +
     "        // latest item already playing when it was dispatched. Anchors WITH content words" + NL +
     "        // that still overlap nothing stay unclaimed: those are answers to nobody." + NL +
     "        const byTime = items.filter((it) => it.playedAt <= d.at && d.at <= it.spokeEnd + 60_000).sort((a, b) => b.playedAt - a.playedAt)[0] ?? null;" + NL +
     "        const item = best && bestOv >= 0.25 ? best : contentWords(d.anchor).length === 0 ? byTime : null;",
     'claim by time'],
]);

{
    const p = path.join(root, 'electron/test/golden/interview60.judge.test.ts');
    let t = fs.readFileSync(p, 'utf8');
    const a = "        expect(pairs[2].kind).toBe('cue');" + NL + "    });" + NL + "});";
    if (t.split(a).length !== 2) throw new Error('test anchor');
    t = t.replace(a, () => "        expect(pairs[2].kind).toBe('cue');" + NL + "    });" + NL + NL +
        "    it('claims an anchor with no content words by time — the tail of a question STT split in two — instead of dropping it', () => {" + NL +
        "        // M27 in the 2026-09-04 hour: Deepgram's final was \"And when would you not?\", every word a stop word." + NL +
        "        const split = [" + NL +
        "            '2026-09-04T08:00:44.000Z [LOG] [Main] dispatch: answer source=whisper anchor=\"And when would you not?\" verdict=match'," + NL +
        "            '2026-09-04T08:00:46.000Z [LOG] [Answer] full: \"I would not use it for a single service.\"'," + NL +
        "        ].join('\\n');" + NL +
        "        const pairs = pairAnswers(split, timeline);" + NL +
        "        expect(pairs.map((p) => p.id)).toEqual(['W02']); // W02 played at 40 s; W01 ended long before" + NL +
        "        // An anchor WITH content words that matches nothing still stays unclaimed." + NL +
        "        const noise = '2026-09-04T08:00:44.000Z [LOG] [Main] dispatch: answer source=whisper anchor=\"Configure the printer driver settings\" verdict=match';" + NL +
        "        expect(pairAnswers(noise, timeline).map((p) => p.id)).toEqual(['?']);" + NL +
        "    });" + NL + "});");
    fs.writeFileSync(p, t);
    console.log('ok judge test: split-anchor case');
}
