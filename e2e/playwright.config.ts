import { defineConfig } from '@playwright/test';

// E2E_PORT lets a run use its own dev server instead of one that is already open on 5173.
const PORT = process.env.E2E_PORT ?? '5173';

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: `pnpm --dir ../frontend dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL || undefined,
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
    permissions: ['camera'],
  },
});
