import { memo } from 'react';
import { ROUTES, type WebRoute } from '../types/route';

interface NavigationProps {
  currentRoute: WebRoute;
  onNavigate: (route: WebRoute) => void;
}

export const Navigation = memo(function Navigation({ currentRoute, onNavigate }: NavigationProps) {
  const navRoutes = [
    ROUTES['/'],
    ROUTES['/setup'],
    ROUTES['/review'],
    ROUTES['/settings'],
    ROUTES['/privacy'],
  ];

  return (
    <nav className="app-navigation" aria-label="Main navigation">
      <div className="nav-brand">
        <h1>Cam DocFormater</h1>
      </div>
      <ul className="nav-list" role="menubar">
        {navRoutes.map((route) => (
          <li key={route.path} role="none">
            <button
              role="menuitem"
              className={`nav-link ${currentRoute.path === route.path ? 'active' : ''}`}
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