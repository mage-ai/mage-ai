import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ page: void; }>({
  page: async ({ page }, use) => {
    await page.goto('/sign-in');
    await page.getByPlaceholder('Email').click();
    await page.getByRole('textbox').first().fill('admin@admin.com');
    await page.getByRole('textbox').first().press('Tab');
    await page.locator('input[type="password"]').fill('admin');
    await page.locator('input[type="password"]').press('Enter');
    // Wait since app auto redirects to `/overview` on sign in.
    await page.waitForSelector('text=Overview');

    // Use subsequent tests.
    await use(page);
  },
});

export { expect };
