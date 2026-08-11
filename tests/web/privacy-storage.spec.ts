import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const docxFixture = readFileSync(join(__dirname, '..', 'fixtures', 'docx', 'sample-rich.docx'));

const SENTINEL = 'PRIVATE_DOCUMENT_SENTINEL';

async function readStorage(page: import('@playwright/test').Page) {
  return page.evaluate(() => ({
    localStorage: Object.entries(localStorage),
    indexedDbDatabases: typeof indexedDB.databases === 'function' ? indexedDB.databases() : Promise.resolve([]),
  }));
}

async function expectNoDocumentContent(storage: { localStorage: [string, string][]; indexedDbDatabases: Promise<unknown[]> }, sentinel = SENTINEL) {
  const databases = await storage.indexedDbDatabases;
  expect(JSON.stringify(storage.localStorage)).not.toContain(sentinel);
  expect(JSON.stringify(storage.localStorage)).not.toContain('<h1>');
  expect(JSON.stringify(databases)).not.toContain(sentinel);
}

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
    buffer: Buffer.from(SENTINEL),
  });

  await expectNoDocumentContent(await readStorage(page));
});

test('DOCX preview output, extracted text, and result bytes are not retained after reset, refresh, or completion', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((sentinel) => localStorage.setItem('camdoc.gemini-api-key', 'test-key'), 'unused');
  await page.reload();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'private-rich.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: docxFixture,
  });
  await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
  await page.getByRole('checkbox').check();

  await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }) })
  );
  await page.getByRole('button', { name: 'Start Formatting' }).click();
  await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Complete');

  // Preview resources are rendered ephemerally and never persisted.
  await expectNoDocumentContent(await readStorage(page), 'Sample Rich Document');

  // Reset to a new document clears preview and result state.
  await page.getByRole('button', { name: 'New Document' }).click();
  await expectNoDocumentContent(await readStorage(page));

  // Refresh preserves no document or preview bytes (only the API key remains).
  await page.reload();
  await expectNoDocumentContent(await readStorage(page));
});
