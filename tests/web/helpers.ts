import { expect, type Page } from '@playwright/test';

export interface UploadFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export async function openApp(page: Page, path = '/') {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(path);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    const alive = await page.getByRole('menuitem', { name: 'Workspace' }).isVisible().catch(() => false);
    if (alive) return;
    await page.waitForTimeout(1000);
  }
  await expect(page.getByRole('menuitem', { name: 'Workspace' })).toBeVisible({ timeout: 60_000 });
}

export async function uploadFile(page: Page, file: UploadFile) {
  await openApp(page);
  const input = page.locator('input[type="file"]');
  try {
    await input.waitFor({ state: 'attached', timeout: 15_000 });
  } catch {
    await page.reload();
    await input.waitFor({ state: 'attached', timeout: 60_000 });
  }
  await input.setInputFiles(file);
}