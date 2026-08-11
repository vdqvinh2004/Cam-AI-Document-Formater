import { expect, test } from '@playwright/test';

test('uploads, discloses, formats, and offers a browser download', async ({ page }) => {
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }) }));
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('camdoc.gemini-api-key', 'test-key'));
  await page.reload();

  await page.locator('input[type="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Heading\nBody') });
  await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
  await expect(page.getByText('notes.txt')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Start Formatting' }).click();
  await expect(page.getByRole('status')).toContainText('Formatting plan applied');
  await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeVisible();
});

test('rejects unsupported files without sending a request', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({ name: 'notes.pages', mimeType: 'application/octet-stream', buffer: Buffer.from('not supported') });
  await expect(page.getByRole('status')).toContainText('not supported');
});