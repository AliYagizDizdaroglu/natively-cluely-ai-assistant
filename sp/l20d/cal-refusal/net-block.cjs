
const hit = (what) => { process.stdout.write('NETWORK-ATTEMPT ' + what + '\n'); process.exit(99); };
const net = require('node:net'); const dns = require('node:dns');
net.Socket.prototype.connect = function () { hit('net.Socket.connect'); };
dns.lookup = function () { hit('dns.lookup'); };
if (dns.promises) dns.promises.lookup = function () { hit('dns.promises.lookup'); };
if (globalThis.fetch) globalThis.fetch = function () { hit('fetch'); };
if (globalThis.WebSocket) globalThis.WebSocket = function () { hit('WebSocket'); };
