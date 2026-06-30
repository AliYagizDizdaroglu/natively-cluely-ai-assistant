import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['electron/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
        // electron/test/ holds upstream's standalone CLI scripts that call
        // process.exit() — they're not vitest suites. Upstream's node --test
        // runner (npm test) covers them via electron/**/__tests__/*.test.mjs
        // patterns, so vitest must exclude them.
        exclude: [
            'node_modules', 'dist', 'dist-electron', '.claude',
            'electron/test/**',
            'electron/**/__tests__/**',
        ],
        globals: true,
    },
});
