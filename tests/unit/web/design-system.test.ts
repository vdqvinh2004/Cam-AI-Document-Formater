import { describe, expect, it } from 'vitest';
import { designTokens } from '../../../src/web/styles/design-tokens';

describe('design system tokens', () => {
  it('defines a warm paper background and green/orange accents', () => {
    expect(designTokens.colors.background).toBe('#f1eee6');
    expect(designTokens.colors.backgroundWarm).toBe('#fffdf6');
    expect(designTokens.colors.accentPrimary).toBe('#d46e4b');
    expect(designTokens.colors.textPrimary).toBe('#173f3b');
  });

  it('exposes a serif display font stack', () => {
    expect(designTokens.typography.fontFamily.serif).toContain('Georgia');
  });

  it('keeps spacing and radii scales coherent', () => {
    const spacing = Object.values(designTokens.spacing);
    expect(spacing.every((value) => value.endsWith('px'))).toBe(true);
    expect(designTokens.radii.sm).toBe('4px');
    expect(designTokens.radii.md).toBe('8px');
    expect(designTokens.radii.lg).toBe('12px');
  });

  it('orders focus, card, and overlay surfaces by z-index', () => {
    expect(designTokens.zIndex.dropdown).toBeLessThan(designTokens.zIndex.modal);
    expect(designTokens.zIndex.modal).toBeLessThan(designTokens.zIndex.tooltip);
  });

  it('provides a visible focus ring token', () => {
    expect(designTokens.colors.focusRing).toContain('rgba(212, 110, 75');
    expect(designTokens.colors.borderFocus).toBe(designTokens.colors.accentPrimary);
  });

  it('defines typography scales used by headings and controls', () => {
    expect(designTokens.typography.fontSize.display).toMatch(/clamp\(/);
    expect(designTokens.typography.fontSize.base).toBe('13px');
    expect(designTokens.typography.fontWeight.bold).toBe(700);
  });
});
