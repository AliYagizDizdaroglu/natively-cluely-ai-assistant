// Throwaway, read-only: how often the two h40c dispatcher defects occur across EVERY flight run folder,
// holdout40 runs reported separately (never tuned on). Reads natively_debug.log + timeline per run.
//  (1) R05 class: a Live claim dropped by isFragment (<4 words) — `dispatch: drop source=live ... verdict=fragment`.
//      Labelled REAL when its content words match a scripted question of that run (>= 0.8 of the
//      question's content words), else FRAGMENT.
//  (2) R22 class: Deepgram boundary word loss — an interim I, then a final F1 that is a strict word-prefix
//      of I, then the next final F2 that starts with a later part of I; the words of I between are lost.
//  (3) Post-dispatch Live text with content words the dispatched text lacks (answer/supersede from
//      whisper, then a live mark/drop for the same question within 8 s).
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const STOP = new Set('a an the and or but so to of in on at for with without from by as is are was were be been do does did you your i we it its that this what how why when where which who would could should can will just about into than then there their they them me my our us if not no yes more most some any very really also out up down over under all each'.split(' '));
const cw = (s) => (String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP.has(w));
const tok = (s) => String(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
const unq = (s) => JSON.parse(`"${s}"`);

const summary = [];
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const R = path.join(RUNS, dir);
    const holdout = /h40/.test(dir);
    let tl = null; try { tl = JSON.parse(fs.readFileSync(path.join(R, 'interview60.timeline.json'), 'utf8')); } catch { /* ungraded/partial run */ }
    const qs = (tl?.items ?? []).map((i) => ({ id: i.id, q: i.q, cw: new Set(cw(i.q)) }));
    const log = fs.readFileSync(path.join(R, 'natively_debug.log'), 'utf8');
    const lines = log.split('\n');

    // (1) fragment drops
    const frags = [];
    for (const m of log.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: drop source=live anchor="(?:[^"\\]|\\.)*" verdict=fragment question="((?:[^"\\]|\\.)*)"/gm)) {
        const text = unq(m[2]);
        const w = new Set(cw(text));
        let best = null, bestScore = 0;
        for (const q of qs) { if (!q.cw.size) continue; let n = 0; for (const x of q.cw) if (w.has(x)) n++; const s = n / q.cw.size; if (s > bestScore) { bestScore = s; best = q; } }
        frags.push({ at: m[1], text, real: bestScore >= 0.8 ? best.id : null });
    }

    // (2) boundary word loss
    const losses = [];
    let lastInterim = null, pendingF1 = null;
    for (const l of lines) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (!m) continue;
        const text = unq(m[3]);
        if (m[2] === 'false') { lastInterim = { at: m[1], text }; continue; }
        // a final
        if (pendingF1) {
            const { I, f1 } = pendingF1;
            const iw = tok(I), f2w = tok(text);
            // F2 must start with a run of I's words found after F1's end
            const rest = iw.slice(f1.length);
            let k = -1;
            for (let s = 1; s < rest.length; s++) { // s >= 1: at least one word skipped
                const n = Math.min(3, rest.length - s, f2w.length);
                if (n >= 2 && rest.slice(s, s + n).join(' ') === f2w.slice(0, n).join(' ')) { k = s; break; }
            }
            if (k > 0) {
                const lost = rest.slice(0, k);
                losses.push({ at: pendingF1.at, lost: lost.join(' '), content: lost.filter((w) => !STOP.has(w)).join(' '), f1: pendingF1.f1Text, f2: text });
            }
            pendingF1 = null;
        }
        if (lastInterim) {
            const iw = tok(lastInterim.text), fw = tok(text);
            if (fw.length > 0 && fw.length < iw.length && fw.every((w, i) => w === iw[i])) pendingF1 = { I: lastInterim.text, f1: fw, f1Text: text, at: m[1] };
        }
        lastInterim = null;
    }

    // (3) post-dispatch live text with extra content words
    const extras = [];
    const disp = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|supersede) source=whisper anchor="(?:[^"\\]|\\.)*" verdict=\w+ question="((?:[^"\\]|\\.)*)"/gm)].map((m) => ({ at: Date.parse(m[1]), iso: m[1], q: unq(m[3]) }));
    const liveAfter = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (mark|drop) source=live anchor="(?:[^"\\]|\\.)*" verdict=(\w+)[^\n]*? question="((?:[^"\\]|\\.)*)"/gm)].map((m) => ({ at: Date.parse(m[1]), iso: m[1], verdict: m[3], q: unq(m[4]) }));
    for (const d of disp) {
        const dw = new Set(cw(d.q));
        for (const L of liveAfter) {
            if (L.at < d.at || L.at > d.at + 8000) continue;
            const lw = cw(L.q);
            const shared = lw.filter((w) => dw.has(w)).length;
            if (dw.size === 0 || shared / dw.size < 0.8) continue; // not the same question
            const extra = [...new Set(lw.filter((w) => !dw.has(w)))];
            if (extra.length) extras.push({ at: d.iso, extra: extra.join(' '), dispatched: d.q, live: L.q, verdict: L.verdict });
        }
    }

    summary.push({ dir, holdout, frags, losses, extras });
}

for (const s of summary) {
    const real = s.frags.filter((f) => f.real);
    console.log(`\n== ${s.dir}${s.holdout ? '  [HOLDOUT, report only]' : ''}: fragment drops ${s.frags.length} (real questions ${real.length}); boundary losses ${s.losses.length} (with content words ${s.losses.filter((x) => x.content).length}); post-dispatch Live extras ${s.extras.length}`);
    for (const f of s.frags) console.log(`   frag ${f.real ? 'REAL ' + f.real : 'fragment'}: ${JSON.stringify(f.text)}`);
    for (const x of s.losses) console.log(`   loss "${x.lost}"${x.content ? '' : ' (function words only)'}: F1=${JSON.stringify(x.f1.slice(0, 60))} F2=${JSON.stringify(x.f2.slice(0, 60))}`);
    for (const x of s.extras) console.log(`   extra [${x.extra}] live ${x.verdict}: dispatched=${JSON.stringify(x.dispatched.slice(0, 70))} live=${JSON.stringify(x.live.slice(0, 80))}`);
}
const tot = (k, f = () => true) => summary.filter((s) => !s.holdout).reduce((a, s) => a + s[k].filter(f).length, 0);
console.log(`\nNON-HOLDOUT TOTALS over ${summary.filter((s) => !s.holdout).length} runs: fragment drops ${tot('frags')} (real ${tot('frags', (f) => f.real)}), boundary losses ${tot('losses')} (content ${tot('losses', (x) => x.content)}), post-dispatch Live extras ${tot('extras')}`);
