import { expect, test } from '@playwright/test';

test('privacy route and unknown route survive direct navigation', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy & Data Handling' })).toBeVisible();

  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
});

test('document contents are not written to browser storage', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'private-notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('PRIVATE_DOCUMENT_SENTINEL'),
  });

  const storage = await page.evaluate(() => ({
    localStorage: Object.entries(localStorage),
    indexedDbDatabases: typeof indexedDB.databases === 'function' ? indexedDB.databases() : Promise.resolve([]),
  }));
  const databases = await storage.indexedDbDatabases;
  expect(JSON.stringify(storage.localStorage)).not.toContain('PRIVATE_DOCUMENT_SENTINEL');
  expect(JSON.stringify(databases)).not.toContain('PRIVATE_DOCUMENT_SENTINEL');
});
