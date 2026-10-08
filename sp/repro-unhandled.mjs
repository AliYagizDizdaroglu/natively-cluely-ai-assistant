process.on('unhandledRejection', (err) => console.log('UNHANDLED', err.message));
process.on('rejectionHandled', () => console.log('HANDLED LATE'));

async function* gen(shouldThrow) {
  if (shouldThrow) throw new Error('boom');
  yield 'ok';
}

function start(shouldThrow) {
  const g = gen(shouldThrow);
  return (async () => {
    try {
      const r = await g.next();
      return { kind: 'ok', r };
    } catch (err) {
      return { kind: 'error', err };
    }
  })();
}

console.log('--- single leg ---');
await start(true);
await new Promise((r) => setTimeout(r, 50));

console.log('--- two legs, both throw ---');
const a = start(true);
const b = start(true);
await Promise.all([a, b]);
await new Promise((r) => setTimeout(r, 50));

console.log('done');
