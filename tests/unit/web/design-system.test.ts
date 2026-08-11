import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function globals() {
  return readFile(new URL('../../../src/web/styles/globals.css', import.meta.url), 'utf8');
}

describe('design system tokens', () => {
  it('defines a warm paper background and green/orange accents via HSL vars', async () => {
    const css = await globals();
    expect(css).toMatch(/--background:\s*48 33% 97%/);
    expect(css).toMatch(/--primary:\s*20 72% 50%/);
    expect(css).toMatch(/--secondary:\s*162/);
    expect(css).toContain('--accent');
    expect(css).toContain('--border');
    expect(css).toContain('--ring');
  });

  it('exposes a serif display font family', async () => {
    const css = await globals();
    expect(css).toMatch(/--font-serif:\s*Georgia/);
  });

  it('keeps a coherent radius scale', async () => {
    const css = await globals();
    expect(css).toMatch(/--radius-md:\s*calc\(var\(--radius\) - 2px\)/);
    expect(css).toMatch(/--radius-sm:\s*calc\(var\(--radius\) - 4px\)/);
  });

  it('defines a visible focus ring via the ring token', async () => {
    const css = await globals();
    expect(css).toContain('--ring:');
    expect(css).toContain('focus-visible-ring');
  });

  it('orders surfaces via z-50 and provides shadow-card utility', async () => {
    const css = await globals();
    expect(css).toContain('--shadow-card:');
    expect(css).toContain('shadow-card');
  });

  it('respects reduced motion preferences', async () => {
    const css = await globals();
    expect(css).toContain('prefers-reduced-motion');
  });
});