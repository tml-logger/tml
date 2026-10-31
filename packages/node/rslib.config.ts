import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: { index: './src/index.ts' },
    tsconfigPath: fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
  },
  lib: [
    {
      format: 'esm',
      syntax: 'es2022',
      dts: {
        abortOnError: true,
        distPath: fileURLToPath(new URL('./dist', import.meta.url)),
      },
    },
  ],
  output: {
    target: 'node',
    sourceMap: true,
  },
});
