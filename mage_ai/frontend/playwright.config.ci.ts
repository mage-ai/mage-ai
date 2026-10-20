import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // This section is the same as in the playwright.config.ts file.
  expect: {
    // Maximum time expect() should wait for the condition to be met.
    timeout: 45000,
  },
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,
  // Run tests in files in parallel
  fullyParallel: true,
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: 'html',
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  testDir: './tests',
  // Time spent by the test function, fixtures, beforeEach and afterEach hooks
  timeout: 100000,
  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,
  
  // This section below is DIFFERENT from the properties in the playwright.config.ts file.
  // Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions.
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: 'http://localhost:6789',
    // Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
    trace: 'on',
  },
  // Run your local dev server before starting the tests
  webServer: {
    command: 'python mage_ai/cli/main.py start test_project',
    cwd: '../../',
    env: {
      PYTHONPATH: '.',
      REQUIRE_USER_AUTHENTICATION: '1',
    },
    reuseExistingServer: !process.env.CI,
    url: 'http://localhost:6789',
  },
});
