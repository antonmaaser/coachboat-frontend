# Coachboat Planner - Test Style Guide

This document defines the principles and patterns for writing End-to-End (E2E) tests in the Coachboat Planner frontend. It serves as a quality assurance reference for developers and AI assistants to ensure consistency, reliability, and maintainability.

**Target Audience:** Developers & AI Coding Assistants

---

## 1. Authentication & Roles

We use Playwright's **Global Setup** and **Storage State** to handle authentication efficiently. **Do NOT** perform UI login (`/login`) in individual tests unless you are specifically testing the login flow itself.

### Pattern: Use `storageState`
Each test file or `describe` block should declare the required user role using `test.use()`. The available states are generated in `tests/auth.setup.ts`.

#### ✅ Correct Usage
```typescript
import { test } from '@playwright/test';
import { STORAGE_STATE } from './fixtures/auth';

test.describe('Admin Features', () => {
    // Authenticate as Admin for all tests in this block
    test.use({ storageState: STORAGE_STATE.admin });

    test('can see admin controls', async ({ page }) => {
        // ...
    });
});
```

#### ❌ Incorrect Usage
```typescript
test('login manually', async ({ page }) => {
    await page.goto('/login'); // SLOW & REDUNDANT
    await page.fill('input[email]', '...');
    // ...
});
```

### Available Roles (see `tests/fixtures/auth.ts`)
- `admin`: Full access (Users, Events, etc.)
- `moderator`: Can manage content but not system sets
- `user`: Standard user, can manage own content
- `group_only`: Restricted access

---

## 2. Mocking Strategy

We use extensive API mocking to ensure tests are deterministic and fast. We do not rely on a running backend for E2E tests.

### Principal: Centralized Mock Setup
Always use the `setupMocks` helper from `test-utils.ts`. This handles:
1.  **Default API Responses** (User profile, basic lists)
2.  **Permission Injection**: Automatically syncs `localStorage` permissions with the authenticated user logic.
3.  **Custom Overrides**: Allows specific tests to define unique data scenarios.

#### ✅ Correct Usage
```typescript
import { setupMocks } from './test-utils';
import { AUTH_USERS } from './fixtures/auth';

test('Shows user list', async ({ page }) => {
    const admin = AUTH_USERS.admin;
    
    // Setup default mocks + specific data for this test
    await setupMocks(page, admin, {
        'GET /users': {
            data: [
                { id: '1', attributes: { name: 'Test User' } }
            ]
        }
    });

    await page.goto('/users');
});
```

### Mock Keys
The `mockApi` helper supports two key formats:
1.  **Exact Match:** `'GET /users'`
2.  **Regex Pattern:** `'GET /users/.*'` (Use sparingly, precise matching is preferred)

---

## 3. Data Factories

Never manually construct complex objects in tests. Use the factories in `tests/factories.ts` to generate type-safe test data.

#### ✅ Correct Usage
```typescript
import { createUser, createEvent } from './factories';

const user = createUser({ firstName: 'Alice', status: 1 });
const event = createEvent({ title: 'Regatta', createdBy: user.id });
```

---

## 4. Test Structure & Isolation

-   **Isolation**: Every test should be independent. Do not rely on state from previous tests.
-   **Describe Blocks**: Group related tests using `test.describe('Feature Name', () => { ... })`.
-   **BeforeEach**: Use `test.beforeEach` for common setup, but prefer passing specific data in `setupMocks` within the test body if the data requirement varies significantly.

---

## 5. Selectors & Assertions

-   **User-Visible Locators**: Prefer `getByRole`, `getByText`, `getByLabel`. Avoid CSS classes (`.btn-primary`) or XPath where possible.
-   **Visibility**: Use `await expect(locator).toBeVisible()` to ensure elements are rendered.
-   **Regex Matching**: When matching text that might be dynamic or whitespace-sensitive, use regex.
    ```typescript
    // Matches "Alice Smith" regardless of extra spaces or case
    const nameMatch = (first, last) => new RegExp(`${first}\\s+${last}`, 'i');
    await expect(page.getByText(nameMatch('Alice', 'Smith'))).toBeVisible();
    ```

---

## 6. Permissions (RBAC)

When testing permissions:
1.  **Explicitly verify absence**: Ensure restricted elements are **NOT** visible.
2.  **Role Switching**: Create separate `describe` blocks for different roles to verify the same page under different contexts.

```typescript
test.describe('Restricted User', () => {
    test.use({ storageState: STORAGE_STATE.group_only });
    
    test('cannot see delete button', async ({ page }) => {
        await setupMocks(page, AUTH_USERS.group_only);
        await page.goto('/items');
        await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible();
    });
});
```

---

## Summary Checklist for New Tests
1.  [ ] Are you using `storageState`?
2.  [ ] Are you using `setupMocks`?
3.  [ ] Are you using `factories` for data?
4.  [ ] Are locators user-centric (`getByRole`)?
5.  [ ] Is the test deterministic (no reliance on external state)?
