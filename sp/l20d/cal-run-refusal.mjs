// Rule-8 calibration of run.mjs's instruction-hash refusal, WITHOUT touching l20d/instruction.txt and WITHOUT any
// network call. Everything runs from cal-refusal/: a copy of run.mjs whose HERE points at cal-refusal/ (the only
// change), cal-refusal/instruction.txt (a copy, modified or not) and a copy of items.json. A preload (--require)
// hooks every way node can open a connection (net.Socket.connect, dns.lookup, fetch, WebSocket); the first attempt
// prints NETWORK-ATTEMPT and exits 99 BEFORE a byte is sent. So:
//   exit 2 + "refusing to run" + no NETWORK-ATTEMPT   = refused before any network call;
//   exit 99 + NETWORK-ATTEMPT                         = got past the hash check and reached the network (blocked).
// Cases: the hook itself (a local fetch must hit it; without the hook the same fetch must not); a one-byte change,
// an appended newline, a deleted file; the unmodified copy and a CRLF copy (the runner normalises line endings, as
// registered) must reach the network. The real instruction.txt's sha256 and mtime are read before and after.
//   node cal-refusal.mjs   (this file: node cal-run-refusal.mjs)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const REAL = `${SP}/l20d/instruction.txt`, D = `${SP}/l20d/cal-refusal`;
const realState = () => ({ sha: crypto.createHash('sha256').update(fs.readFileSync(REAL)).digest('hex'), mtime: fs.statSync(REAL).mtimeMs, size: fs.statSync(REAL).size });
const before = realState();
fs.rmSync(D, { recursive: true, force: true });
fs.mkdirSync(D, { recursive: true });
let ok = true;
const check = (name, cond, extra = '') => { if (!cond) ok = false; console.log(`${cond ? 'OK ' : 'BAD'} ${name}${cond ? '' : `  ${extra}`}`); };

fs.writeFileSync(`${D}/net-block.cjs`, `
const hit = (what) => { process.stdout.write('NETWORK-ATTEMPT ' + what + '\\n'); process.exit(99); };
const net = require('node:net'); const dns = require('node:dns');
net.Socket.prototype.connect = function () { hit('net.Socket.connect'); };
dns.lookup = function () { hit('dns.lookup'); };
if (dns.promises) dns.promises.lookup = function () { hit('dns.promises.lookup'); };
if (globalThis.fetch) globalThis.fetch = function () { hit('fetch'); };
if (globalThis.WebSocket) globalThis.WebSocket = function () { hit('WebSocket'); };
`);
fs.writeFileSync(`${D}/fetch-local.mjs`, 'try { await fetch("http://127.0.0.1:9/"); console.log("fetch returned"); } catch (e) { console.log("fetch failed locally: " + (e.cause?.code ?? e.code ?? e.message)); }\n');
const node = (args) => { const r = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 120000 }); return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }; };

// the hook itself
let r = node(['--require', `${D}/net-block.cjs`, `${D}/fetch-local.mjs`]);
check('hook calibration: with the hook, a fetch to 127.0.0.1 -> NETWORK-ATTEMPT, exit 99', r.code === 99 && /NETWORK-ATTEMPT fetch/.test(r.out), r.out.slice(0, 200));
r = node([`${D}/fetch-local.mjs`]);
check('hook calibration: without the hook the same fetch runs and fails locally (nothing external), exit 0, no NETWORK-ATTEMPT', r.code === 0 && !/NETWORK-ATTEMPT/.test(r.out) && /fetch failed locally|fetch returned/.test(r.out), r.out.slice(0, 200));
fs.writeFileSync(`${D}/socket-local.mjs`, 'import net from "node:net"; const s = net.connect(9, "127.0.0.1"); s.on("error", (e) => console.log("socket failed locally: " + e.code)); s.on("connect", () => console.log("connected"));\n');
r = node(['--require', `${D}/net-block.cjs`, `${D}/socket-local.mjs`]);
check('hook calibration: a raw net.connect (what a WebSocket uses) is caught too', r.code === 99 && /NETWORK-ATTEMPT net\.Socket\.connect/.test(r.out), r.out.slice(0, 200));

// the runner copy: only HERE differs from the real l20d/run.mjs
const run = fs.readFileSync(`${SP}/l20d/run.mjs`, 'utf8');
const hereLine = run.split('\n').find((l) => l.startsWith('const HERE = '));
if (!hereLine || !hereLine.includes('/scratchpad/l20d\';')) throw new Error('HERE line not found in l20d/run.mjs');
fs.writeFileSync(`${D}/run.mjs`, run.replace(hereLine, () => `const HERE = '${D}';`));
const diffLines = run.split('\n').length === fs.readFileSync(`${D}/run.mjs`, 'utf8').split('\n').length;
check('the runner copy has the same number of lines as the real run.mjs (only the HERE line differs)', diffLines);
fs.copyFileSync(`${SP}/l20d/items.json`, `${D}/items.json`);
const ins = fs.readFileSync(REAL);
const runIt = () => node(['--require', `${D}/net-block.cjs`, `${D}/run.mjs`, '--rep', '1']);

const flipped = Buffer.from(ins); flipped[ins.length >> 1] = flipped[ins.length >> 1] ^ 1;
fs.writeFileSync(`${D}/instruction.txt`, flipped);
r = runIt();
check('one byte of the instruction changed -> exit 2, "refusing to run", no NETWORK-ATTEMPT', r.code === 2 && /refusing to run/.test(r.out) && !/NETWORK-ATTEMPT/.test(r.out), `exit ${r.code} ${r.out.slice(0, 200)}`);
fs.writeFileSync(`${D}/instruction.txt`, Buffer.concat([ins, Buffer.from(' ')]));
r = runIt();
check('a space appended -> refused, no network', r.code === 2 && /refusing to run/.test(r.out) && !/NETWORK-ATTEMPT/.test(r.out), `exit ${r.code}`);
fs.writeFileSync(`${D}/instruction.txt`, ins.subarray(0, ins.length - 1));
r = runIt();
check('the last byte removed -> refused, no network', r.code === 2 && /refusing to run/.test(r.out) && !/NETWORK-ATTEMPT/.test(r.out), `exit ${r.code}`);
fs.rmSync(`${D}/instruction.txt`);
r = runIt();
check('instruction.txt missing -> the runner stops (non-zero), no network', r.code !== 0 && r.code !== 99 && !/NETWORK-ATTEMPT/.test(r.out) && /ENOENT/.test(r.out), `exit ${r.code} ${r.out.slice(0, 150)}`);

fs.writeFileSync(`${D}/instruction.txt`, ins);
r = runIt();
check('the UNMODIFIED copy passes the hash check and reaches the network (blocked by the hook): exit 99, NETWORK-ATTEMPT, no refusal', r.code === 99 && /NETWORK-ATTEMPT/.test(r.out) && !/refusing/.test(r.out), `exit ${r.code} ${r.out.slice(0, 300)}`);
fs.writeFileSync(`${D}/instruction.txt`, ins.toString('utf8').replace(/\n/g, '\r\n'));
r = runIt();
check('a CRLF copy of the same text also passes (the runner normalises line endings before hashing, as registered)', r.code === 99 && /NETWORK-ATTEMPT/.test(r.out) && !/refusing/.test(r.out), `exit ${r.code}`);
check('the run file was never written by a refused run (no runs/ output beyond the empty folder)', !fs.existsSync(`${D}/runs/l20d-r1.json`));

const after = realState();
check(`SP/l20d/instruction.txt untouched: sha256 ${after.sha === before.sha ? 'same' : 'CHANGED'}, mtime ${after.mtime === before.mtime ? 'same' : 'CHANGED'}, size ${after.size} (1210), sha256 = e29bf381...`, after.sha === before.sha && after.mtime === before.mtime && after.size === 1210 && after.sha.startsWith('e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f'.slice(0, 8)));
console.log(ok ? 'RUN.MJS REFUSAL CALIBRATION OK' : 'RUN.MJS REFUSAL CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
