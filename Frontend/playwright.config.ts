import { defineConfig } from 'playwright/test';

/**
 * Browser smoke tests. They run the real app in Chrome with the API mocked at the network
 * layer, so they need no Laravel server. Run: `npm run e2e` (starts the dev server itself).
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:3000',
        launchOptions: {
            executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
            args: ['--no-sandbox'],
        },
    },
    projects: [
        { name: 'phone', use: { viewport: { width: 360, height: 740 } } },
        { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
    },
});
