// Calibration probe (spec review v4): what process.cwd() a vitest worker sees when vitest is started from a
// temp cwd with --root elsewhere (the plan's TEST form), and whether __dirname is the test file's folder.
it('prints the worker cwd and __dirname', () => {
    console.log(`WORKER_CWD=${process.cwd()}`);
    console.log(`WORKER_DIRNAME=${typeof __dirname === 'string' ? __dirname : '(undefined)'}`);
});
