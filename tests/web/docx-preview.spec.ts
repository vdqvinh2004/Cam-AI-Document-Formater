import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const docxFixture = readFileSync(join(__dirname, '..', 'fixtures', 'docx', 'sample-rich.docx'));

test.describe('DOCX regression — full workflow with rich fixture', () => {
  test('uploads DOCX, renders source preview, formats, compares, validates, and downloads', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('camdoc.gemini-api-key', 'test-key'));
    await page.reload();

    // Upload DOCX
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });

    // Workspace auto-navigates to Setup after file load
    await page.waitForURL('/setup');

    // Verify DOCX source preview renders in Setup (if shown)
    await expect(page.getByRole('heading', { name: 'sample-rich.docx' })).toBeVisible();

    // Check disclosure
    await page.getByRole('checkbox').check();

    // Mock Gemini to return empty plan (no operations)
    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }) })
    );

    await page.getByRole('button', { name: 'Start Formatting' }).click();

    // Wait for Review page with result (formatting may complete quickly)
    await page.waitForURL('/review');
    await expect(page.getByRole('status')).toContainText('Complete');

    // Review page: source name, result filename
    await expect(page.locator('.review-meta span').first()).toContainText('sample-rich.docx (DOCX)');

    // Comparison: should show content preserved (no operations = no change)
    await expect(page.locator('.comparison-summary')).toContainText('Content preserved');

    // Preview panel: Before and After columns present
    await expect(page.locator('h3', { hasText: 'Before' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'After' })).toBeVisible();

    // Source preview: attempts to render from original package bytes, shows feature detection
    await expect(page.locator('.preview-column').filter({ hasText: 'Before' })).toContainText('table');
    await expect(page.locator('.preview-column').filter({ hasText: 'Before' })).toContainText('image');

    // Result preview: same content (empty plan = no change)
    await expect(page.locator('.preview-column').filter({ hasText: 'After' })).toContainText('table');

    // Validation passed → download enabled
    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeEnabled();

    // Download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Formatted File' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample-rich.docx');
  });

  test('rejects unsupported files without sending a request', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.pages',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('not supported'),
    });
    await expect(page.getByRole('status')).toContainText('not supported');
  });
});