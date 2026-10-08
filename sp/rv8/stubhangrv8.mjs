// Throwaway stub child (task-7 re-review): never exits by itself, like a hung app. Its own
// safety net: it exits after 60 s so nothing outlives this review even if the kill path fails.
setTimeout(() => process.exit(0), 60_000);
setInterval(() => {}, 1000);
