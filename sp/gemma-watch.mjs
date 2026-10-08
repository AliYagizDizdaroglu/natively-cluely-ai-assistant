// Throwaway watcher for the Gemma arms: one stdout line per event (a Monitor event stream).
//   ARM_DONE <arm> ...   an arm's answers file holds every question it was given
//   STALL <model> ...    no answers file of that model changed for STALL_MIN minutes
//   ALL_DONE             all twelve arms complete (then exits)
// State survives re-arming: arms already reported are listed in gemma-watch.state.json.
import fs from 'node:fs';

const ARMS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/gemma-arms';
const STATE = `${ARMS}/gemma-watch.state.json`;
const STALL_MIN = 10;
const MODELS = ['gemma-4-31b-it', 'gemma-4-26b-a4b-it'];
const TAGS = [['high', 39], ['min', 39], ['high-r2', 12], ['high-r3', 12], ['min-r2', 12], ['min-r3', 12]];
const reported = new Set(fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : []);
const stallSaid = {};

function check() {
    for (const m of MODELS) {
        let newest = 0;
        for (const [tag, target] of TAGS) {
            const arm = `${m}_${tag}`;
            const f = `${ARMS}/interview60.answers.${arm}.json`;
            if (!fs.existsSync(f)) continue;
            newest = Math.max(newest, fs.statSync(f).mtimeMs);
            if (reported.has(arm)) continue;
            let s; try { s = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; } // mid-write
            const recs = Object.values(s);
            if (recs.length < target) continue;
            const spoken = recs.filter((r) => r.spoken).length;
            const holes = recs.filter((r) => r.transientError).length;
            console.log(`ARM_DONE ${arm} ${recs.length}/${target} spoken=${spoken} empty=${recs.length - spoken - holes} holes=${holes} cuts=${recs.filter((r) => r.cutRetried).length}`);
            reported.add(arm);
            fs.writeFileSync(STATE, JSON.stringify([...reported]));
        }
        const idle = (Date.now() - newest) / 60000;
        const modelDone = TAGS.every(([t]) => reported.has(`${m}_${t}`));
        if (newest && !modelDone && idle > STALL_MIN && !stallSaid[m]) { console.log(`STALL ${m}: no answers file changed for ${idle.toFixed(0)} min`); stallSaid[m] = true; }
        if (idle <= STALL_MIN) stallSaid[m] = false;
    }
    if (MODELS.every((m) => TAGS.every(([t]) => reported.has(`${m}_${t}`)))) { console.log('ALL_DONE'); process.exit(0); }
}

check();
setInterval(check, 30_000);
