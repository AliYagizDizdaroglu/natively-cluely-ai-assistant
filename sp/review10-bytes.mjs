// Read-only: BOM / CR / non-ASCII check on the three Task 10 files in MAIN.
import fs from 'node:fs';
import path from 'node:path';
const MAIN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant';
const files = ['electron/test/golden/interview60.flight.mjs', 'electron/test/golden/interview60.flight.test.ts', 'electron/test/golden/README.md'];
for (const rel of files) {
    const buf = fs.readFileSync(path.join(MAIN, rel));
    const bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const cr = buf.includes(0x0d);
    const text = buf.toString('utf8');
    const replacement = text.includes('\ufffd');
    const endsLf = text.endsWith('\n');
    console.log(`${rel}: bytes=${buf.length} BOM=${bom} CR=${cr} U+FFFD=${replacement} endsWithLF=${endsLf}`);
    const lines = text.split('\n');
    const show = rel.endsWith('flight.mjs') ? [3, 4, 22, 23, 46, 47, 48, 49, 50, 56] : rel.endsWith('README.md') ? [161, 166, 247, 248, 249] : [104, 105, 106, 107, 108, 109];
    for (const n of show) {
        const l = lines[n - 1] ?? '';
        const nonAscii = [...l].filter((c) => c.charCodeAt(0) > 127).map((c) => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
        console.log(`  ${String(n).padStart(4)} nonASCII=[${[...new Set(nonAscii)].join(',')}] ${l.length > 160 ? l.slice(0, 160) + '...' : l}`);
    }
}
