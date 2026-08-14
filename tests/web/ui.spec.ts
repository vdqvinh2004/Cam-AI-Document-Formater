import { expect, test } from '@playwright/test';
import { openApp, uploadFile } from './helpers';

test.describe('UI accessibility — keyboard navigation', () => {
  test('Tab order traverses navigation and file dropzone', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('Tab');
    // First nav link (Workspace)
    await expect(page.getByRole('menuitem', { name: 'Workspace' })).toBeFocused();

    // Tab to next navigation item
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeFocused();
  });

  test('Custom disclosure checkbox is keyboard reachable and can be checked', async ({ page }) => {
    await uploadFile(page, {
  name: 'notes.md',
  mimeType: 'text/markdown',
  buffer: Buffer.from('# Title\nBody'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();

    await page.getByRole('button', { name: /modern/i }).click();
    await page.getByRole('menuitem', { name: 'Custom' }).click();

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.matches('[role="checkbox"]'));
      if (focused) break;
    }
    await expect(page.getByRole('checkbox')).toBeFocused();

    await page.keyboard.press('Space');
    await expect(page.getByRole('checkbox')).toBeChecked();
  });
});

test.describe('Responsive layout', () => {
  test('upload step stacks vertically at narrow viewport', async ({ page }) => {
    await openApp(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
    await expect(page.getByLabel('File drop zone')).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(320);
  });

  test('configure step stacks vertically at narrow viewport', async ({ page }) => {
    await openApp(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await uploadFile(page, {
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Heading\nBody'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(320);
  });
});

test.describe('Workflow state messaging', () => {
  test('displays Ready after file load, then completes formatting', async ({ page }) => {
      await uploadFile(page, {
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Heading\nBody'),
    });
    await expect(page.getByRole('status')).toContainText('File loaded. Configure formatting options.');

    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('status')).toContainText('Complete');
    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeVisible();
  });

  test('shows error state when file type is not supported', async ({ page }) => {
    await uploadFile(page, {
  name: 'notes.pages',
  mimeType: 'application/octet-stream',
  buffer: Buffer.from('not supported'),
    });
    await expect(page.getByRole('status')).toContainText('not supported');
  });
});