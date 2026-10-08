// Shadow captions: log the Live router's input-transcription fragments during a
// meeting so a dual-configuration hour measures the 3.x model's caption accuracy
// for free (scored offline against the script and the STT transcript). No
// product behaviour changes — the transcript still comes from STT.
// usage: node apply-shadow-captions.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';

const P = path.join(process.argv[2], 'electron/main.ts');
let s = fs.readFileSync(P, 'utf8');
const nl = /\r\n/.test(s) ? '\r\n' : '\n';
const a = `    this.liveRouter = router;${nl}    void router.start();`;
if (s.split(a).length !== 2) throw new Error('startLiveRouter anchor not unique');
const b = [
  `    // Shadow captions: Live's own transcription of the interviewer channel,`,
  `    // logged verbatim so the flight test can score it against the script and`,
  `    // the STT transcript (interview60 harness). Not fed anywhere; the`,
  `    // transcript still comes from STT. Fragments, not sentences — join offline.`,
  `    router.on('caption', (c: { text: string }) => {`,
  `      if (this.isMeetingActive) console.log(\`[LiveCaption] fragment \${JSON.stringify(c.text)}\`);`,
  `    });`,
  `    this.liveRouter = router;`,
  `    void router.start();`,
].join(nl);
fs.writeFileSync(P, s.replace(a, () => b));
console.log('shadow captions applied to', P);
