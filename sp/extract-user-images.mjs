// Throwaway: pull the images the user pasted (top-level image blocks in user messages, not tool results)
// out of a session transcript, so a chart can be re-read after compaction.
//   node extract-user-images.mjs <transcript.jsonl> <outDir>
import fs from 'node:fs';
import readline from 'node:readline';
const [, , file, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
let n = 0;
for await (const line of rl) {
    if (!line.includes('"type":"image"')) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    if (j.type !== 'user' || !Array.isArray(j.message?.content)) continue;
    for (const b of j.message.content) {
        if (b.type !== 'image' || b.source?.type !== 'base64') continue;
        n++;
        const ext = (b.source.media_type ?? 'image/png').split('/')[1];
        const out = `${outDir}/user-image-${n}.${ext}`;
        fs.writeFileSync(out, Buffer.from(b.source.data, 'base64'));
        const text = j.message.content.filter((x) => x.type === 'text').map((x) => x.text).join(' ').slice(0, 120);
        console.log(`${out}  ${j.timestamp}  ${Math.round(b.source.data.length * 0.75 / 1024)} KB  text: ${JSON.stringify(text)}`);
    }
}
console.log(`user images: ${n}`);
