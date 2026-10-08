import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'jsdom', include: ['electron/**/*.test.ts'], exclude: ['node_modules/**'], globals: true } });
