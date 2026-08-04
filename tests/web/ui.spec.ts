import { expect, test } from '@playwright/test';

test.describe('UI accessibility — keyboard navigation', () => {
  test('Tab order traverses navigation, file dropzone, and setup controls', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    // First nav link (Workspace)
    await expect(page.getByRole('menuitem', { name: 'Workspace' })).toBeFocused();

    // Tab through navigation items
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menuitem', { name: 'Setup' })).toBeFocused();
  });

  test('Setup page disclosure checkbox is keyboard reachable and can be checked', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Heading\nBody'),
    });
    await page.waitForURL('/setup');

    // Tab through to disclosure checkbox (may take several tabs depending on focus state)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.matches('input[type="checkbox"]'));
      if (focused) break;
    }
    await expect(page.locator('input[type="checkbox"]')).toBeFocused();

    await page.keyboard.press('Space');
    await expect(page.locator('input[type="checkbox"]')).toBeChecked();
  });
});

test.describe('Responsive layout', () => {
  test('workspace page stacks vertically at narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Workspace' })).toBeVisible();
    await expect(page.locator('.file-dropzone')).toBeVisible();
    // No horizontal overflow
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(320);
  });

  test('setup page stacks vertically at narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Heading\nBody'),
    });
    await page.waitForURL('/setup');
    await expect(page.getByRole('heading', { name: 'Configure Formatting' })).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(320);
  });
});

test.describe('Workflow state messaging', () => {
  test('displays Ready after file load, then completes formatting', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('camdoc.gemini-api-key', 'test-key'));
    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }) })
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Heading\nBody'),
    });
    // On Workspace page: Ready message
    await expect(page.getByRole('status')).toContainText('File loaded. Configure formatting options.');

    // On Setup page
    await page.waitForURL('/setup');
    await expect(page.getByRole('status')).toContainText('File loaded. Configure formatting options.');

    // Check disclosure
    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: 'Start Formatting' }).click();
    // Formatting may complete quickly with empty operations; verify it reaches completion
    await expect(page.getByRole('status')).toContainText('Complete');
    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeVisible();
  });

  test('shows error state when file type is not supported', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.pages',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('not supported'),
    });
    await expect(page.getByRole('status')).toContainText('not supported');
  });
});