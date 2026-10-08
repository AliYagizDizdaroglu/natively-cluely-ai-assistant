// THROWAWAY (scratchpad): attach to the running dev app over the Chrome DevTools Protocol, record the
// overlay renderer's console output and exceptions while the detector chain test injects two synthetic
// interviewer questions, then dump the DOM state of the chat area and save screenshots.
// usage: node ui-probe.mjs   (expects the app launched with --remote-debugging-port=9222)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/package.json');
const WebSocket = require('ws');
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'ui-probe');
fs.mkdirSync(OUT, { recursive: true });
const LOG = path.join(OUT, 'probe.log');
const log = (s) => { const line = new Date().toISOString() + ' ' + s; console.log(line); fs.appendFileSync(LOG, line + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
    try { const r = await fetch('http://127.0.0.1:9222/json'); return await r.json(); } catch { return null; }
}

let target = null;
const deadline = Date.now() + 300000;
let lastList = '';
while (Date.now() < deadline) {
    const list = await targets();
    if (list) {
        const desc = list.map((x) => x.type + ' ' + x.url).join(' | ');
        if (desc !== lastList) { log('targets: ' + desc); lastList = desc; }
        target = list.find((x) => x.type === 'page' && /window=overlay/.test(x.url));
        if (target) break;
    }
    await sleep(1500);
}
if (!target) { log('NO overlay target within 5 min'); process.exit(2); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++nextId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
});
ws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.rej(new Error(JSON.stringify(m.error))); else p.res(m.result); return; }
    if (m.method === 'Runtime.consoleAPICalled') {
        const args = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        log('[console.' + m.params.type + '] ' + args.slice(0, 300));
    }
    if (m.method === 'Runtime.exceptionThrown') log('[EXCEPTION] ' + JSON.stringify(m.params.exceptionDetails).slice(0, 800));
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Runtime.enable');
await send('Page.enable');
log('attached to ' + target.url);

const DOM_EXPR = String.raw`(() => {
    const rows = [...document.querySelectorAll('.animate-fade-in-up')];
    const sc = document.querySelector('.overflow-y-auto');
    const txt = (el) => el ? el.innerText.replace(/\s+/g, ' ').slice(0, 220) : null;
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    return JSON.stringify({
        bubbles: rows.length,
        bubbleTexts: rows.slice(-3).map(txt),
        scroll: sc ? { rect: rect(sc), scrollHeight: sc.scrollHeight, scrollTop: sc.scrollTop, display: getComputedStyle(sc).display, overflow: getComputedStyle(sc).overflowY } : null,
        window: { innerW: window.innerWidth, innerH: window.innerHeight },
        bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1200)
    });
})()`;

const probe = async (label) => {
    try {
        const r = await send('Runtime.evaluate', { expression: DOM_EXPR, returnByValue: true });
        log('[' + label + '] ' + (r.result.value ?? JSON.stringify(r)));
    } catch (e) { log('[' + label + '] evaluate failed: ' + e.message); }
    try {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(OUT, label + '.png'), Buffer.from(shot.data, 'base64'));
        log('[' + label + '] screenshot saved');
    } catch (e) { log('[' + label + '] screenshot failed: ' + e.message); }
};

await probe('t0');
await sleep(15000);
await probe('t15');
await sleep(15000);
await probe('t30');
await sleep(15000);
await probe('t45');
ws.close();
log('done');
