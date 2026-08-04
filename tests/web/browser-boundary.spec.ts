import { expect, test } from '@playwright/test';

test.describe('Browser boundary — direct navigation and refresh', () => {
  test('direct navigation to /privacy renders the privacy page', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy & Data Handling' })).toBeVisible();
  });

  test('direct navigation to /settings renders the settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('direct navigation to unknown route renders NotFoundPage with workspace link', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Workspace' })).toBeVisible();
  });

  test('refresh on /privacy keeps the privacy page', async ({ page }) => {
    await page.goto('/privacy');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Privacy & Data Handling' })).toBeVisible();
  });

  test('refresh on unknown route keeps the not-found page', async ({ page }) => {
    await page.goto('/does-not-exist');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
  });
});

test.describe('Footer privacy link', () => {
  test('clicking the footer Privacy link navigates to /privacy', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { name: 'Privacy & Data Handling' })).toBeVisible();
  });
});