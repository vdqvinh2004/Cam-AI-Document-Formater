export type WebRoutePath = '/' | '/setup' | '/review' | '/settings' | '/privacy' | 'not-found';
export type WebRouteKey = 'workspace' | 'setup' | 'review' | 'settings' | 'privacy' | 'not-found';

export interface WebRoute {
  path: WebRoutePath;
  label: string;
  requiresDocument: boolean;
  requiresResult: boolean;
}

export const ROUTES: Record<WebRoutePath, WebRoute> = {
  '/': { path: '/', label: 'Workspace', requiresDocument: false, requiresResult: false },
  '/setup': { path: '/setup', label: 'Setup', requiresDocument: true, requiresResult: false },
  '/review': { path: '/review', label: 'Review', requiresDocument: true, requiresResult: true },
  '/settings': { path: '/settings', label: 'Settings', requiresDocument: false, requiresResult: false },
  '/privacy': { path: '/privacy', label: 'Privacy', requiresDocument: false, requiresResult: false },
  'not-found': { path: 'not-found', label: 'Not Found', requiresDocument: false, requiresResult: false },
};

export function resolveRoute(pathname: string): WebRoute {
  const path = pathname === '/404' ? 'not-found' : pathname;
  return ROUTES[path as WebRoutePath] ?? ROUTES['not-found'];
}

export function getRoutePath(route: WebRoute): string {
  return route.path === 'not-found' ? '/404' : route.path;
}