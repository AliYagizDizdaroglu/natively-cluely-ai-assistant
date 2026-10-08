// Throwaway: copies R/launch-grader.mjs to work/lg-nobash-<variant>.mjs with Bash removed from --tools (and, for variant
// "noadd", without --add-dir), imports pointed back at ../R/. For a pilot-only spike; never used for real grading.
import fs from 'node:fs';
const W = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/work';
const src = fs.readFileSync(W + '/../R/launch-grader.mjs', 'utf8');
for (const variant of ['add', 'noadd']) {
    let s = src;
    const rep = (a, b) => { if (!s.includes(a)) throw new Error('anchor missing: ' + a); s = s.split(a).join(b); };
    rep("from './audit-graders.mjs'", "from '../R/audit-graders.mjs'");
    rep("from './check-grader-memory.mjs'", "from '../R/check-grader-memory.mjs'");
    rep("from './legs-decide.mjs'", "from '../R/legs-decide.mjs'");
    rep("const R_DIR = path.dirname(fileURLToPath(import.meta.url));", "const R_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'R');");
    rep("'--tools', 'Read,Write,Edit,Bash'", "'--tools', 'Read,Write,Edit'");
    if (variant === 'noadd') {
        rep("[...FLAGS(prompt), '--add-dir', blindDir, '--allowed-tools', ...rules]", "[...FLAGS(prompt), '--allowed-tools', ...rules]");
    }
    fs.writeFileSync(`${W}/lg-nobash-${variant}.mjs`, s);
    console.log(`wrote lg-nobash-${variant}.mjs`);
}
