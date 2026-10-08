// vitest config for the Task 5 review: MAIN's own settings (vitest.config.ts) plus, when T5_MUTANT is set,
// an alias that swaps the test's './interview60.turns-finals.mjs' import for a mutant. Cache stays in scratch.
const MUT = process.env.T5_MUTANT;
export default {
    cacheDir: process.env.T5_CACHE,
    resolve: MUT ? { alias: [{ find: './interview60.turns-finals.mjs', replacement: MUT }] } : {},
    test: {
        environment: 'jsdom',
        include: ['electron/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx', '*.test.ts'],
        exclude: ['node_modules', 'dist', 'dist-electron', '.claude'],
        globals: true,
        cache: false,
    },
};
