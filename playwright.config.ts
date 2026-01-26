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
    //workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html'],
        ['list']
    ],
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'on',
    },
    projects: [
        { name: 'setup', testMatch: /.*\.setup\.ts/ },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/.auth/admin.json',
            },
            dependencies: ['setup'],
        },
    ],
});
