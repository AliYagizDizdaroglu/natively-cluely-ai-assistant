// Scratch (launcher builder D): prints byte facts of the files given on the command line.
// Numbers only, never content. node bytes-info.mjs <file> [<file> ...]
import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
    const b = fs.readFileSync(f);
    let crlf = 0, bareLf = 0, bareCr = 0, nonAscii = 0, ctrl = 0;
    for (let i = 0; i < b.length; i++) {
        const c = b[i];
        if (c === 0x0d) { if (b[i + 1] === 0x0a) { crlf++; i++; } else bareCr++; }
        else if (c === 0x0a) bareLf++;
        else if (c > 0x7e) nonAscii++;
        else if (c < 0x20 && c !== 0x09) ctrl++;
    }
    const bom = b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
    const lastIsEol = b.length >= 2 && b[b.length - 2] === 0x0d && b[b.length - 1] === 0x0a;
    console.log(`${f.split(/[\\/]/).pop()}: ${b.length} bytes, BOM ${bom}, CRLF ${crlf}, bare LF ${bareLf}, bare CR ${bareCr}, bytes above 126: ${nonAscii}, other control bytes: ${ctrl}, ends with CRLF ${lastIsEol}`);
}
