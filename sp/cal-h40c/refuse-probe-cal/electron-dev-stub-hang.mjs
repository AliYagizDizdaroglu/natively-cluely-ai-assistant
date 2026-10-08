// Calibration stub for refuse-probe.mjs, named so its OWN command line contains "electron"
// (matching interview60.run.mjs appStop's real looksLikeOurs regex, /electron(\.exe)?/i) -
// the same way the real spawned command ("npm run electron:dev") does. A stub named without
// "electron" in its path is invisible to appStop's real kill logic and gives a false PASS on
// the kill-verification step without actually exercising it (found the hard way: an earlier
// attempt with a stub at a non-"electron" path left a real process running on the machine for
// several minutes, undetected by that attempt's own in-script check, until it was found and
// killed by hand). Never exits on its own.
setInterval(() => {}, 1000);
