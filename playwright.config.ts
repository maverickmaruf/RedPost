import { defineConfig, devices } from '@playwright/test';

// Locally we reuse an installed browser (PW_CHANNEL=msedge or chrome) to avoid a download.
// CI runs `npx playwright install chromium` and leaves PW_CHANNEL unset.
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'allow', ...(channel ? { channel } : {}) },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 5'], ...(channel ? { channel } : {}) } }],
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
