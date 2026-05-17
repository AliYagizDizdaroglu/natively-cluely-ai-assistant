import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['electron/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
        exclude: ['node_modules', 'dist', 'dist-electron', '.claude'],
        globals: true,
    },
});
