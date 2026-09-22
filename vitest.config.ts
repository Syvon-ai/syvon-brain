import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: {
    '@syvon/organism': fileURLToPath(new URL('./packages/organism/src/index.ts', import.meta.url)),
    '@syvon/tool-library': fileURLToPath(new URL('./packages/tool-library/src/index.ts', import.meta.url)),
  } },
  test: { environment: 'node', include: ['packages/**/*.test.ts'] },
});
