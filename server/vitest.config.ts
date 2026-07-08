import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

const parsedEnv = loadEnv({ path: path.resolve(__dirname, '.env.test'), quiet: true }).parsed ?? {};

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.ts',
    env: parsedEnv,
    fileParallelism: false,
  },
});
