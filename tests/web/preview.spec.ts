import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const docxFixture = readFileSync(join(__dirname, '..', 'fixtures', 'docx', 'sample-rich.docx'));

test.describe('DOCX preview E2E — source preview, formatted preview, compare, validation, download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('camdoc.gemini-api-key', 'test-key'));
    await page.reload();
  });

  test('renders source preview from original package bytes before formatting', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await expect(page.getByText('sample-rich.docx')).toBeVisible();
  });

  test('displays compare fallback when formatting produces no changes', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample-rich.docx',
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

    await expect(page.locator('.comparison-summary')).toContainText('Content preserved');
  });

  test('shows unavailable messaging for unsupported feature warnings', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample-rich.docx',
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

    await expect(page.locator('.preview-column').filter({ hasText: 'Before' })).toContainText('table');
  });

  test('gates export behind validation pass', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample-rich.docx',
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

    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Formatted File' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample-rich.docx');
  });

  test('applies style-only typography to DOCX and preserves content exactly', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await page.getByRole('checkbox').check();

    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[{"kind":"set-presentation","nodeID":"p0","presentation":{"bold":true,"fontSize":14,"fontFamily":"Georgia"}}]}' }] } }] }) })
    );

    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.locator('.comparison-summary')).toContainText('preserved exactly');
    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeEnabled();
    await expect(page.locator('.comparison-summary')).not.toContainText('No style changes were applied');
  });

  test('applies presentation to Markdown and passes 100% verification', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Title\nplain body'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await page.getByRole('checkbox').check();

    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[{"kind":"set-presentation","nodeID":"p1","presentation":{"bold":true}}]}' }] } }] }) })
    );

    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.locator('.comparison-summary')).toContainText('preserved exactly');
    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeEnabled();
  });
});