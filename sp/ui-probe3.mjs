// THROWAWAY (scratchpad): dump the overlay renderer's message DOM — where the answer text lives,
// the scroll container geometry, and the full visible text. usage: node ui-probe3.mjs <needle>
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/package.json');
const WebSocket = require('ws');
const needle = process.argv[2] ?? 'FIFO';
const list = await (await fetch('http://127.0.0.1:9222/json')).json();
const t = list.find((x) => x.type === 'page' && /window=overlay/.test(x.url));
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const expr = String.raw`(() => {
  const N = ${JSON.stringify(needle)};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = null; while ((node = walker.nextNode())) { if (node.textContent.includes(N)) break; }
  const chain = []; let el = node ? node.parentElement : null;
  while (el && el !== document.body) { const r = el.getBoundingClientRect(); chain.push((el.tagName.toLowerCase()) + '.' + String(el.className).split(' ').filter(Boolean).slice(0, 5).join('.') + ' [' + Math.round(r.y) + ',' + Math.round(r.height) + '] ' + getComputedStyle(el).display + '/' + getComputedStyle(el).visibility + '/' + getComputedStyle(el).opacity); el = el.parentElement; }
  const sc = document.querySelector('.overflow-y-auto');
  const rows = sc ? [...sc.children].map((c) => ({ cls: String(c.className).slice(0, 40), h: Math.round(c.getBoundingClientRect().height), y: Math.round(c.getBoundingClientRect().y), text: c.innerText.replace(/\s+/g, ' ').slice(0, 80) })) : null;
  return JSON.stringify({ found: !!node, textAround: node ? node.textContent.slice(0, 160) : null, chain, scroll: sc ? { y: Math.round(sc.getBoundingClientRect().y), h: Math.round(sc.getBoundingClientRect().height), scrollHeight: sc.scrollHeight, scrollTop: sc.scrollTop, children: sc.children.length } : null, rows, win: [window.innerWidth, window.innerHeight], fullText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 2500) }, null, 1);
})()`;
const reply = await new Promise((res, rej) => {
    ws.on('message', (d) => { const m = JSON.parse(d.toString()); if (m.id === 1) (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)); });
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
});
console.log(reply.result?.value ?? JSON.stringify(reply));
ws.close();
