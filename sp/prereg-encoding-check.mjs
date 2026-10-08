// Throwaway: is MAIN's committed PREREGISTER-followup-replay.md a double-encoded copy of the registered
// original (SP\followup-replay\PREREGISTER-followup-replay.md, mtime 18:28:12)? Repairs the committed text by
// reading it as UTF-8, mapping each char back through Windows-1252 to a byte, and decoding those bytes
// as UTF-8; then compares with the original byte for byte.
import fs from 'node:fs';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const orig = fs.readFileSync(`${SP}/followup-replay/PREREGISTER-followup-replay.md`);
const committed = fs.readFileSync(`${MAIN}/electron/test/golden/passes/PREREGISTER-followup-replay.md`);
const st = fs.statSync(`${SP}/followup-replay/PREREGISTER-followup-replay.md`);
console.log(`original: ${orig.length} B, mtime ${st.mtime.toISOString()}, cr ${orig.includes(13)}, bom ${orig[0] === 0xef}`);
console.log(`committed: ${committed.length} B, cr ${committed.includes(13)}`);
// Windows-1252 code points 0x80-0x9F that differ from Latin-1
const CP1252 = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
const text = committed.toString('utf8');
const bytes = [];
let unmappable = 0;
for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x100) bytes.push(cp);
    else if (CP1252[cp] !== undefined) bytes.push(CP1252[cp]);
    else { unmappable++; for (const b of Buffer.from(ch, 'utf8')) bytes.push(b); }
}
const repaired = Buffer.from(Buffer.from(bytes).toString('utf8'), 'utf8');
const origLf = Buffer.from(orig.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
console.log(`unmappable chars in committed: ${unmappable}`);
console.log(`repaired committed == original (LF-normalised): ${repaired.equals(origLf)}`);
console.log(`original non-ASCII chars: ${[...orig.toString('utf8')].filter((c) => c.codePointAt(0) > 127).join(' ')}`);
if (!repaired.equals(origLf)) {
    const a = repaired.toString('utf8'), b = origLf.toString('utf8');
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    console.log(`first difference at char ${i}: repaired ${JSON.stringify(a.slice(i, i + 40))} vs original ${JSON.stringify(b.slice(i, i + 40))}`);
}
