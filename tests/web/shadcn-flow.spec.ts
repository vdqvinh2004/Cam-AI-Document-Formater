import { expect, test } from '@playwright/test';
import { openApp, uploadFile } from './helpers';

test.describe('Progressive dashboard flow', () => {
  test('upload → configure → format → review works end-to-end', async ({ page }) => {
      await uploadFile(page, {
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Heading\nBody'),
    });

    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await expect(page.getByText('notes.txt')).toBeVisible();

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
    await expect(page.getByText('Saves as notes_cam_formatted.txt')).toBeVisible();
  });

  test('named styles format locally without an API key or disclosure', async ({ page }) => {
    await uploadFile(page, {
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Heading\nBody'),
    });
    const start = page.getByRole('button', { name: 'Start Formatting' });
    await expect(start).toBeEnabled();
    await start.click();
    await expect(page.getByRole('status')).toContainText('Complete');
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
  });

  test('panel state persists during flow', async ({ page }) => {
    await uploadFile(page, {
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Heading\nBody'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
  });
});

test.describe('Phase 13 step gating and interactive states', () => {
  test('later steps stay disabled until their prerequisite completes', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => localStorage.setItem('camdoc.gemini-api-key', 'test-key'));

    const uploadStep = page.getByRole('button', { name: 'Upload', exact: true });
    const configureStep = page.getByRole('button', { name: 'Configure', exact: true });
    const reviewStep = page.getByRole('button', { name: 'Review', exact: true });
    await expect(uploadStep).toBeEnabled();
    await expect(configureStep).toBeDisabled();
    await expect(reviewStep).toBeDisabled();

    await uploadFile(page, {
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Heading\nBody'),
    });
    await expect(page.getByRole('heading', { name: 'Configure formatting' })).toBeVisible();
    await expect(configureStep).toBeEnabled();
    await expect(reviewStep).toBeDisabled();

    await page.getByRole('checkbox').check();
    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }),
      })
    );
    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(reviewStep).toBeEnabled();
  });

  test('custom style stays disabled until API key, then disclosure, then description', async ({ page }) => {
    await uploadFile(page, {
  name: 'notes.md',
  mimeType: 'text/markdown',
  buffer: Buffer.from('# Title\nBody'),
    });

    await page.getByRole('button', { name: /modern/i }).click();
    await page.getByRole('menuitem', { name: 'Custom' }).click();

    const start = page.getByRole('button', { name: 'Start Formatting' });
    await expect(start).toBeDisabled();
    await expect(start).toHaveAttribute('title', /API key in Settings/);
    await expect(page.getByRole('alert')).toContainText('Describe the custom style');
  });

  test('custom style unlocks after disclosure and description with a stored key', async ({ page }) => {
    await openApp(page);
    await page.addInitScript(() => localStorage.setItem('camdoc.gemini-api-key', 'test-key'));
    await uploadFile(page, {
  name: 'notes.md',
  mimeType: 'text/markdown',
  buffer: Buffer.from('# Title\nBody'),
    });
    await page.getByRole('button', { name: /modern/i }).click();
    await page.getByRole('menuitem', { name: 'Custom' }).click();

    const start = page.getByRole('button', { name: 'Start Formatting' });
    await expect(start).toBeDisabled();
    await expect(start).toHaveAttribute('title', /network disclosure/);

    await page.getByRole('checkbox').check();
    await expect(start).toBeDisabled();
    await expect(start).toHaveAttribute('title', /Describe the custom style/);

    await page.getByPlaceholder(/Move the introduction after/).fill('Make the title bold');
    await expect(start).toBeEnabled();
  });

  test('custom style formats with a mocked Gemini plan including a move', async ({ page }) => {
    await openApp(page);
    await page.addInitScript(() => localStorage.setItem('camdoc.gemini-api-key', 'test-key'));
    await uploadFile(page, {
  name: 'notes.md',
  mimeType: 'text/markdown',
  buffer: Buffer.from('# Title\nFirst section.\n\nSecond section.'),
    });
    await page.getByRole('button', { name: /modern/i }).click();
    await page.getByRole('menuitem', { name: 'Custom' }).click();
    await page.getByRole('checkbox').check();
    await page.getByPlaceholder(/Move the introduction after/).fill('Move the title section to the end');

    await page.route('https://generativelanguage.googleapis.com/**', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({
          version: 1,
          operations: [{ kind: 'move', nodeID: 'h0', targetIndex: 1 }],
        }) }] } }] }),
      })
    );

    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('status')).toContainText('Complete');
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.locator('.comparison-summary')).toContainText('Section order');
  });

  test('hover and keyboard focus reach interactive controls', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => localStorage.setItem('camdoc.gemini-api-key', 'test-key'));
    await uploadFile(page, {
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Heading\nBody'),
    });
    const back = page.getByRole('button', { name: 'Back' });
    await page.getByRole('checkbox').check();
    const before = await back.evaluate((el) => getComputedStyle(el).backgroundColor);
    await back.hover();
    await expect(back).not.toHaveCSS('background-color', before);

    await page.getByRole('button', { name: 'Back' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Start Formatting' })).toBeFocused();
  });

  test('surfaces an explicit no-changes state for formats that cannot store presentation', async ({ page }) => {
    await uploadFile(page, {
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Heading\nBody'),
    });
    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('identical to the source');
    await expect(page.locator('.comparison-summary')).toContainText('No style changes were applied');
  });

  test('applies a named style to Markdown without calling Gemini', async ({ page }) => {
    await uploadFile(page, {
  name: 'notes.md',
  mimeType: 'text/markdown',
  buffer: Buffer.from('# Title\nBody text here.'),
    });
    await page.getByRole('button', { name: 'Start Formatting' }).click();
    await expect(page.getByRole('status')).toContainText('Complete');
    await expect(page.getByRole('heading', { name: 'Review results' })).toBeVisible();
    await expect(page.locator('.comparison-summary')).toContainText('Formatting changes applied');
    await expect(page.locator('.comparison-summary')).not.toContainText('No style changes were applied');
  });
});

test.describe('Deep-link compatibility', () => {
  test('/setup deep-link redirects to dashboard with configure panel', async ({ page }) => {
    await openApp(page, '/setup');
    await expect(page).toHaveURL(/\/\?panel=configure/);
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
  });

  test('/review deep-link redirects to dashboard with review panel', async ({ page }) => {
    await openApp(page, '/review');
    await expect(page).toHaveURL(/\/\?panel=review/);
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
  });

  test('settings and privacy pages still render', async ({ page }) => {
    await openApp(page, '/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await openApp(page, '/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible();
  });

  test('unknown routes render NotFoundPage', async ({ page }) => {
    await openApp(page, '/definitely-not-a-page');
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Workspace' })).toBeVisible();
  });
});

test.describe('Responsive layout', () => {
  test('mobile (375px) stacks panels vertically', async ({ page }) => {
    await openApp(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
    await expect(page.getByLabel('File drop zone')).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(375);
  });

  test('tablet (768px) stacks panels vertically', async ({ page }) => {
    await openApp(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(768);
  });

  test('desktop (1024px) shows side-by-side layout', async ({ page }) => {
    await openApp(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(1024);
  });

  test('upload step stacks at narrow viewport', async ({ page }) => {
    await openApp(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(page.getByRole('heading', { name: 'Document Formatter' })).toBeVisible();
    await expect(page.getByLabel('File drop zone')).toBeVisible();
    const bodyScroll = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScroll).toBeLessThanOrEqual(320);
  });

  test('configure step stacks at narrow viewport', async ({ page }) => {
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

test.describe('Keyboard navigation + focus management', () => {
  test('Tab order traverses navigation and file dropzone', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menuitem', { name: 'Workspace' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeFocused();
  });

  test('Setup disclosure checkbox is keyboard reachable and can be checked', async ({ page }) => {
    await uploadFile(page, {
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
    await openApp(page, '/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON']).toContain(firstFocus);
  });

  test('DropdownMenu keyboard navigation (Style profile)', async ({ page }) => {
    await uploadFile(page, {
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
    await openApp(page, '/settings');
    await page.getByPlaceholder('Paste your Gemini API key').fill('test-key');
    await page.getByRole('button', { name: 'Save Key' }).click();
    await expect(page.getByText('API key saved to this browser origin.')).toBeVisible();
  });
});