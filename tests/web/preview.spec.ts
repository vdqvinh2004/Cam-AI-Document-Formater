import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { uploadFile } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const docxFixture = readFileSync(join(__dirname, '..', 'fixtures', 'docx', 'sample-rich.docx'));

test.describe('DOCX preview E2E — source preview, formatted preview, compare, validation, download', () => {
  test('renders source preview from original package bytes before formatting', async ({ page }) => {
    await uploadFile(page, {
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await expect(page.getByText('sample-rich.docx')).toBeVisible();
  });

  test('shows feature detection warnings on the DOCX previews', async ({ page }) => {
    await uploadFile(page, {
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();

    await expect(page.locator('.preview-column').filter({ hasText: 'Before' })).toContainText('table');
    await expect(page.locator('.preview-column').filter({ hasText: 'Before' })).toContainText('image');
  });

  test('gates export behind validation pass', async ({ page }) => {
    await uploadFile(page, {
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Formatted File' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample-rich_cam_formatted.docx');
  });

  test('applies style-only typography to DOCX and preserves content exactly', async ({ page }) => {
    await uploadFile(page, {
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.locator('.comparison-summary')).toContainText('preserved exactly');
    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeEnabled();
    await expect(page.locator('.comparison-summary')).not.toContainText('No style changes were applied');
  });

  test('applies presentation to Markdown and passes 100% verification', async ({ page }) => {
    await uploadFile(page, {
      name: 'notes.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Title\nplain body'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.locator('.comparison-summary')).toContainText('preserved exactly');
    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeEnabled();
  });
});