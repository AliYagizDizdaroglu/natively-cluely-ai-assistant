// Throwaway: wait for the prompt A/B to finish (its console gets a "wrote " line), print its summary, then run
// the audio A/B and stream its session outcomes. Exits when the audio A/B exits.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const PROMPT_LOG = `${HERE}/health/prompt-ab-console.txt`;
for (let waited = 0; ; waited += 3000) {
    const text = fs.readFileSync(PROMPT_LOG, 'utf8');
    if (/^wrote /m.test(text)) { for (const l of text.split(/\r?\n/)) if (/^(full|minimal):/.test(l)) console.log(`prompt A/B ${l}`); break; }
    if (waited > 600000) { console.log('prompt A/B did not finish within 10 min; not starting the audio A/B'); process.exit(1); }
    await new Promise((r) => setTimeout(r, 3000));
}
const out = fs.createWriteStream(`${HERE}/health/audio-ab-console.txt`);
const child = spawn(process.execPath, [`${HERE}/audio-ab.mjs`], { cwd: HERE });
let buf = '';
const onData = (d) => {
    out.write(d);
    buf += d.toString();
    const lines = buf.split(/\r?\n/); buf = lines.pop();
    for (const l of lines) if (/first word|close|no output|no setupComplete|\] cap|rror|^(n24|d16):|^wrote /.test(l)) console.log(l);
};
child.stdout.on('data', onData);
child.stderr.on('data', onData);
child.on('exit', (code) => { if (buf) console.log(buf); console.log(`audio A/B exited ${code}`); out.end(); process.exit(0); });
