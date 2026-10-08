// stub for a cmd-syntax dry run of launch-smoke-hedge.cmd - never touches the real app.
console.log(`STUB smoke-turn.mjs invoked with: ${process.argv.slice(2).join(' ')}`);
console.log(`  NATIVELY_VERBAL_HEDGE=${process.env.NATIVELY_VERBAL_HEDGE ?? '(unset)'}`);
console.log(`  NATIVELY_VERBAL_HEDGE_TRIGGER_MS=${process.env.NATIVELY_VERBAL_HEDGE_TRIGGER_MS ?? '(unset)'}`);
process.exit(0);
