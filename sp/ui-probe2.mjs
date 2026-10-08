// THROWAWAY (scratchpad): ask every renderer window of the running dev app whether the answer text
// is in its DOM, and dump each window's visible text head. usage: node ui-probe2.mjs <needle>
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/package.json');
const WebSocket = require('ws');
const needle = process.argv[2] ?? 'FIFO';
const list = await (await fetch('http://127.0.0.1:9222/json')).json();
for (const t of list.filter((x) => x.type === 'page')) {
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
    const expr = '(() => { const all = document.body.innerHTML; const vis = document.body.innerText; return JSON.stringify({ inHtml: all.includes(' + JSON.stringify(needle) + '), inVisibleText: vis.includes(' + JSON.stringify(needle) + '), bubbles: document.querySelectorAll(".animate-fade-in-up").length, win: [window.innerWidth, window.innerHeight], visible: document.visibilityState, head: vis.replace(/\\s+/g, " ").slice(0, 300) }); })()';
    const reply = await new Promise((res, rej) => {
        ws.on('message', (d) => { const m = JSON.parse(d.toString()); if (m.id === 1) (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)); });
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    });
    console.log(t.url.replace('http://localhost:5180/', '') + '  ' + (reply.result?.value ?? JSON.stringify(reply)));
    ws.close();
}
