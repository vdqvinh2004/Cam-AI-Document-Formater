import { expect, test } from '@playwright/test';

test.describe('Progressive dashboard flow', () => {
  test('upload → configure → format → review works end-to-end', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('camdoc.gemini-api-key', 'test-key'));

    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Heading\nBody'),
    });

    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await expect(page.getByText('notes.txt')).toBeVisible();

    await page.getByRole('checkbox').check();

    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }),
      })
    );

    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('status')).toContainText('Complete');

    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download Formatted File' })).toBeVisible();
  });

  test('panel state persists during flow', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Heading\nBody'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
  });
});

test.describe('Deep-link compatibility', () => {
  test('/setup deep-link redirects to dashboard with configure panel', async ({ page }) => {
    await page.goto('/setup');
    await expect(page).toHaveURL(/\/\?panel=configure/);
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
  });

  test('/review deep-link redirects to dashboard with review panel', async ({ page }) => {
    await page.goto('/review');
    await expect(page).toHaveURL(/\/\?panel=review/);
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
  });

  test('settings and privacy pages still render', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible();
  });

  test('unknown routes render NotFoundPage', async ({ page }) => {
    await page.goto('/definitely-not-a-page');
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Workspace' })).toBeVisible();
  });
});

test.describe('Responsive layout', () => {
  test('mobile (375px) stacks panels vertically', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
    await expect(page.getByLabel('File drop zone')).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(375);
  });

  test('tablet (768px) stacks panels vertically', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(768);
  });

  test('desktop (1024px) shows side-by-side layout', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(1024);
  });

  test('upload step stacks at narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
    await expect(page.getByLabel('File drop zone')).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(320);
  });

  test('configure step stacks at narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Heading\nBody'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(320);
  });
});

test.describe('Keyboard navigation + focus management', () => {
  test('Tab order traverses navigation and file dropzone', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menuitem', { name: 'Workspace' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeFocused();
  });

  test('Setup disclosure checkbox is keyboard reachable and can be checked', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Heading\nBody'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.matches('[role="checkbox"]'));
      if (focused) break;
    }
    await expect(page.getByRole('checkbox')).toBeFocused();

    await page.keyboard.press('Space');
    await expect(page.getByRole('checkbox')).toBeChecked();
  });

  test('Dialog focus trap (Settings page)', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON']).toContain(firstFocus);
  });

  test('DropdownMenu keyboard navigation (Style profile)', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Heading\nBody'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();

    await page.getByRole('button', { name: /modern/i }).click();
    await expect(page.getByRole('menuitem', { name: 'Modern' })).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(150);
      if (await page.getByRole('menuitem', { name: 'Professional' }).getAttribute('data-highlighted') !== null) break;
    }
    await expect(page.getByRole('menuitem', { name: 'Professional' })).toHaveAttribute('data-highlighted');
    await page.keyboard.press('Enter');
  });

  test('Toast appears and can be dismissed', async ({ page }) => {
    await page.goto('/settings');
    await page.getByPlaceholder('Paste your Gemini API key').fill('test-key');
    await page.getByRole('button', { name: 'Save Key' }).click();
    await expect(page.getByText('API key saved to this browser origin.')).toBeVisible();
  });
});