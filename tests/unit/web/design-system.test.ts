import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function globals() {
  return readFile(new URL('../../../src/web/styles/globals.css', import.meta.url), 'utf8');
}

describe('design system tokens', () => {
  it('defines SaaS (General) palette with trust blue primary and orange accent via HSL vars', async () => {
    const css = await globals();
    // Official SaaS (General) palette from ui-ux-pro-max data
    expect(css).toMatch(/--background:\s*210 40% 98%/);
    expect(css).toMatch(/--foreground:\s*217 33% 17%/);
    expect(css).toMatch(/--primary:\s*221 83% 53%/);
    expect(css).toMatch(/--accent:\s*21 90% 48%/);
    expect(css).toContain('--border');
    expect(css).toContain('--ring');
    expect(css).toMatch(/--destructive:\s*0 72% 51%/);
    expect(css).toMatch(/--muted:\s*216 52% 94%/);
  });

  it('exposes Plus Jakarta Sans as primary sans font family', async () => {
    const css = await globals();
    expect(css).toMatch(/--font-sans:\s*"Plus Jakarta Sans"/);
    expect(css).toMatch(/--font-mono:\s*"JetBrains Mono"/);
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

  it('defines dark mode palette', async () => {
    const css = await globals();
    expect(css).toMatch(/\.dark\s*\{/);
    expect(css).toMatch(/--background:\s*217 33% 11%/);
    expect(css).toMatch(/--foreground:\s*210 40% 98%/);
  });

  it('includes skip link styles for keyboard accessibility', async () => {
    const css = await globals();
    expect(css).toContain('.skip-link');
  });
});