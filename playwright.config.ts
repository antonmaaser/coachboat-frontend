import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    webServer: {
        command: 'npm run build && npm run preview',
        port: 4173,
        reuseExistingServer: !process.env.CI,
    },
    testDir: 'tests',
    testMatch: /(.+\.)?(spec|test)\.[jt]s/,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html'],
        ['list']
    ],
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            },
        },
        // {
        //     name: 'firefox',
        //     use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //     name: 'webkit',
        //     use: { ...devices['Desktop Safari'] },
        // },
    ],
});
