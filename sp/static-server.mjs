// Throwaway static file server for visually inspecting the generated
// interview60.report.html in a browser. Not part of the deliverable.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const TYPES = { '.html': 'text/html', '.json': 'application/json', '.mjs': 'text/javascript' };

http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
        res.end(data);
    });
}).listen(8765, () => console.log('serving', ROOT, 'on http://localhost:8765'));
