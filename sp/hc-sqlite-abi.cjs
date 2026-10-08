// hc-sqlite-abi.cjs — run with ELECTRON_RUN_AS_NODE=1 by MAIN's own electron.exe (no app code, no
// window, no AppData): does the better-sqlite3 native module in MAIN's node_modules load under the
// app's actual runtime, and can it open a database? Plain Node refuses it (ABI 127 vs its 130),
// which is expected only if 130 is Electron's ABI — this proves that instead of assuming it.
const Database = require('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/node_modules/better-sqlite3');
console.log(`electron ${process.versions.electron}  node ${process.versions.node}  modules ABI ${process.versions.modules}`);
const db = new Database(':memory:');
db.exec('create table t (x integer)');
db.prepare('insert into t values (?)').run(42);
console.log(`better-sqlite3 loaded and queried: ${db.prepare('select x from t').get().x === 42 ? 'OK' : 'WRONG VALUE'}`);
db.close();
