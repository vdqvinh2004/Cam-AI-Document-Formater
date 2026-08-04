import { describe, expect, it } from 'vitest';
import { ROUTES, resolveRoute, getRoutePath } from '../../../src/web/types/route';

describe('route resolution', () => {
  it('resolves every registered pathname to its route', () => {
    expect(resolveRoute('/').path).toBe('/');
    expect(resolveRoute('/setup').path).toBe('/setup');
    expect(resolveRoute('/review').path).toBe('/review');
    expect(resolveRoute('/settings').path).toBe('/settings');
    expect(resolveRoute('/privacy').path).toBe('/privacy');
  });

  it('maps the not-found sentinel to the not-found route', () => {
    expect(resolveRoute('/404').path).toBe('not-found');
    expect(resolveRoute('/definitely-not-a-page').path).toBe('not-found');
  });

  it('round-trips routes through getRoutePath', () => {
    expect(getRoutePath(ROUTES['/'])).toBe('/');
    expect(getRoutePath(ROUTES['/privacy'])).toBe('/privacy');
    expect(getRoutePath(ROUTES['not-found'])).toBe('/404');
  });

  it('declares route document and result requirements', () => {
    expect(ROUTES['/setup'].requiresDocument).toBe(true);
    expect(ROUTES['/review'].requiresDocument).toBe(true);
    expect(ROUTES['/review'].requiresResult).toBe(true);
    expect(ROUTES['/'].requiresDocument).toBe(false);
    expect(ROUTES['/privacy'].requiresResult).toBe(false);
  });

  it('has a unique path and label per route', () => {
    const paths = Object.values(ROUTES).map((route) => route.path);
    const labels = Object.values(ROUTES).map((route) => route.label);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
