// Throwaway watcher for the A/B probe console: prints each new session outcome line, exits at the summary.
import fs from 'node:fs';
const F = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20/health/ab-console.txt';
const WANT = /first word|close|no output|no setupComplete|\] cap|rror|^compression|^answered/;
let seen = 0;
for (;;) {
    const lines = fs.readFileSync(F, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const l of lines.slice(seen)) if (WANT.test(l)) console.log(l);
    seen = lines.length;
    if (lines.some((l) => l.startsWith('answered'))) process.exit(0);
    await new Promise((r) => setTimeout(r, 3000));
}
