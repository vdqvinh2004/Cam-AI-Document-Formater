import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { expect, test } from '@playwright/test';
import { uploadFile } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const docxFixture = readFileSync(join(__dirname, '..', 'fixtures', 'docx', 'sample-rich.docx'));

test('uploads, formats locally, and offers a suffixed browser download', async ({ page }) => {
  await uploadFile(page, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Heading\nBody') });
  await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
  await expect(page.getByText('notes.txt')).toBeVisible();
  await page.getByRole('button', { name: 'Start Formatting' }).click();
  await expect(page.getByRole('status')).toContainText('no style changes were applied');
  await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeVisible();
  await expect(page.getByText('Saves as notes_cam_formatted.txt')).toBeVisible();
});

test('applies a named style to a DOCX and offers a suffixed download', async ({ page }) => {
  await uploadFile(page, {
    name: 'sample.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: docxFixture,
  });
  await page.getByRole('button', { name: 'Start Formatting' }).click();
  await expect(page.getByRole('status')).toContainText('Complete');
  await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeVisible();
  await expect(page.getByText('Saves as sample_cam_formatted.docx')).toBeVisible();
});

test('rejects unsupported files without sending a request', async ({ page }) => {
  await uploadFile(page, { name: 'notes.pages', mimeType: 'application/octet-stream', buffer: Buffer.from('not supported') });
  await expect(page.getByRole('status')).toContainText('not supported');
});