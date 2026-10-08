// Throwaway: prints the arguments this process received, one bracketed token each.
console.log(process.argv.slice(2).map((a) => `[${a}]`).join(' '));
