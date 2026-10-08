// THROWAWAY (scratchpad): routing experiment on the running dev app. Optionally force the window mode to
// 'overlay' from the overlay renderer, then press its "Answer now" button (re-answers the in-flight
// question through the same suggested_answer events) and watch the overlay DOM for an answer bubble.
// usage: node ui-probe4.mjs [set-overlay]
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/package.json');
const WebSocket = require('ws');
const setOverlay = process.argv.includes('set-overlay');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = await (await fetch('http://127.0.0.1:9222/json')).json();
const t = list.find((x) => x.type === 'page' && /window=overlay/.test(x.url));
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
let id = 0; const pending = new Map();
ws.on('message', (d) => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
const evaluate = (expression) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })); }).then((r) => r.result?.value);
const STATE = String.raw`(() => { const sc = document.querySelector('.overflow-y-auto'); const rows = sc ? [...sc.children].map((c) => c.innerText.replace(/\s+/g, ' ').slice(0, 90)) : []; return JSON.stringify({ rows, win: [window.innerWidth, window.innerHeight] }); })()`;
console.log('before: ' + await evaluate(STATE));
if (setOverlay) { console.log('setWindowMode(overlay) -> ' + JSON.stringify(await evaluate(`window.electronAPI.setWindowMode('overlay').then(() => 'ok')`))); await sleep(1000); }
const clicked = await evaluate(String.raw`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Answer now'); if (!b) return 'no Answer now button'; b.click(); return 'clicked'; })()`);
console.log('click: ' + clicked);
for (let s = 2; s <= 14; s += 2) { await sleep(2000); console.log('t+' + s + 's: ' + await evaluate(STATE)); }
ws.close();
