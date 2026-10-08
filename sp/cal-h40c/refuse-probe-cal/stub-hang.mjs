// Calibration stub for refuse-probe.mjs: never exits on its own (simulates a regressed
// refusal that hangs). refuse-probe.mjs must detect this at its deadline and kill it.
setInterval(() => {}, 1000);
