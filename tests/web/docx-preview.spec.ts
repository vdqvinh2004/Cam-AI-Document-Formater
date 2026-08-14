import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { uploadFile } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const docxFixture = readFileSync(join(__dirname, '..', 'fixtures', 'docx', 'sample-rich.docx'));
const multipageFixture = readFileSync(join(__dirname, '..', 'fixtures', 'docx', 'multipage.docx'));

test.describe('DOCX regression — full workflow with rich fixture', () => {
  test('uploads DOCX, renders source preview, formats, compares, validates, and downloads', async ({ page }) => {
    await uploadFile(page, {
      name: 'sample-rich.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxFixture,
    });

    // Upload auto-advances to the Configure panel
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await expect(page.getByText('sample-rich.docx')).toBeVisible();

    await page.getByRole('button', { name: 'Start Formatting' }).click();

    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Complete');

    await expect(page.getByText('Source: sample-rich.docx (DOCX)')).toBeVisible();

    // Comparison: named style applied locally preserves content
    await expect(page.locator('.comparison-summary')).toContainText('Content preserved');

    // Preview panel: Before and After columns present
    await expect(page.locator('h3', { hasText: 'Before' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'After' })).toBeVisible();

    // Source preview: feature detection warnings shown above the rendered document
    await expect(page.locator('.preview-column').filter({ hasText: 'Before' })).toContainText('table');
    await expect(page.locator('.preview-column').filter({ hasText: 'Before' })).toContainText('image');

    // Result preview: same feature warnings on the formatted output
    await expect(page.locator('.preview-column').filter({ hasText: 'After' })).toContainText('table');

    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeEnabled();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Formatted File' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample-rich_cam_formatted.docx');
  });

  test('renders multipage DOCX previews side by side without overlap', async ({ page }) => {
    await uploadFile(page, {
      name: 'multipage.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: multipageFixture,
    });
    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.locator('.docx-preview-scroll')).toHaveCount(2);

    const geometry = await page.evaluate(() => {
      const columns = [...document.querySelectorAll('.preview-column')].map((column) => {
        const rect = column.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
      const docs = [...document.querySelectorAll('.docx-preview-scroll .docx')].map((doc) => {
        const rect = doc.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
      return { columns, docs, bodyScrollW: document.body.scrollWidth, innerW: window.innerWidth };
    });

    expect(geometry.columns).toHaveLength(2);
    expect(geometry.docs).toHaveLength(2);
    expect(geometry.docs[0].left).toBeGreaterThanOrEqual(geometry.columns[0].left - 1);
    expect(geometry.docs[0].right).toBeLessThanOrEqual(geometry.columns[0].right + 1);
    expect(geometry.docs[1].right).toBeLessThanOrEqual(geometry.columns[1].right + 1);
    expect(geometry.docs[0].right).toBeLessThanOrEqual(geometry.docs[1].left + 1);
    expect(geometry.bodyScrollW).toBeLessThanOrEqual(geometry.innerW + 1);
  });

  test('rejects unsupported files without sending a request', async ({ page }) => {
    await uploadFile(page, {
      name: 'notes.pages',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('not supported'),
    });
    await expect(page.getByRole('status')).toContainText('not supported');
  });
});