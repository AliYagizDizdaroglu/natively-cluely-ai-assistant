import fs from 'node:fs';
const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/live-router-b/electron/services/routerArbiter.ts';
let s = fs.readFileSync(p, 'utf8');
const rep = (a, b) => { if (s.split(a).length !== 2) throw new Error('not unique: ' + a); s = s.replace(a, () => b); };
rep('endMs, q_src: t.qSrc }));', 'endMs, q_src: t.qSrc, superseded: t.superseded }));');
rep("        this.writeLiveCapture(t);              // I-1: what the user saw is still captured, as shown so far\n",
    "        t.superseded = true;                   // fix2: the live capture written here must already read superseded\n        this.writeLiveCapture(t);              // I-1: what the user saw is still captured, as shown so far\n");
rep('q_src=${t.qSrc} q_at=${t.q} sent=${t.sent}`);', 'q_src=${t.qSrc} q_at=${t.q} sent=${t.sent} superseded=${t.superseded ? \'yes\' : \'no\'}`);');
fs.writeFileSync(p, s);
