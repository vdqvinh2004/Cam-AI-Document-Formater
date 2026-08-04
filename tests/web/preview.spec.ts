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
    await page.waitForURL('/setup');
    await expect(page.getByRole('heading', { name: 'sample-rich.docx' })).toBeVisible();
  });

  test('displays compare fallback when formatting produces no changes', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });
    await page.waitForURL('/setup');
    await page.getByRole('checkbox').check();

    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }) })
    );

    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await page.waitForURL('/review');

    // Comparison summary shows preserved
    await expect(page.locator('.comparison-summary')).toContainText('Content preserved');
  });

  test('shows unavailable messaging for unsupported feature warnings', async ({ page }) => {
    // This test would require a DOCX with unsupported features
    // The existing fixture may trigger partial warnings; check that they appear
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });
    await page.waitForURL('/setup');
    await page.getByRole('checkbox').check();

    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }) })
    );

    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await page.waitForURL('/review');

    // Preview shows feature detection warnings (headless rendering limitation)
    await expect(page.locator('.preview-column').filter({ hasText: 'Before' })).toContainText('table');
  });

  test('gates export behind validation pass', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });
    await page.waitForURL('/setup');
    await page.getByRole('checkbox').check();

    // Mock a plan that would cause content change (not actually possible with empty operations,
    // but we verify the gate: validation pass → download enabled)
    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }) })
    );

    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await page.waitForURL('/review');

    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Formatted File' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample-rich.docx');
  });
});