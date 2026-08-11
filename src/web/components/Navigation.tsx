import { memo } from 'react';
import { ROUTES, type WebRoute } from '../types/route';
import { cn } from '@/lib/utils';

interface NavigationProps {
  currentRoute: WebRoute;
  onNavigate: (route: WebRoute) => void;
}

export const Navigation = memo(function Navigation({ currentRoute, onNavigate }: NavigationProps) {
  const navRoutes = [
    ROUTES['/'],
    ROUTES['/settings'],
    ROUTES['/privacy'],
  ];

  return (
    <nav className="app-navigation flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6" aria-label="Main navigation">
      <div className="nav-brand">
        <h1 className="text-lg font-semibold">Cam DocFormater</h1>
      </div>
      <ul className="flex list-none items-center gap-2" role="menubar">
        {navRoutes.map((route) => (
          <li key={route.path} role="none">
            <button
              role="menuitem"
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                currentRoute.path === route.path && 'bg-accent text-accent-foreground'
              )}
              onClick={() => onNavigate(route)}
              aria-current={currentRoute.path === route.path ? 'page' : undefined}
            >
              {route.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
});