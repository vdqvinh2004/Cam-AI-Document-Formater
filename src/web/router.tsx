import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ROUTES, resolveRoute, getRoutePath, type WebRoute } from './types/route';

interface RouterContextValue {
  currentRoute: WebRoute;
  navigate: (route: WebRoute) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useRouter must be used within a Router');
  return context;
}

interface RouterProps {
  children: ReactNode;
}

export function Router({ children }: RouterProps) {
  const [currentRoute, setCurrentRoute] = useState<WebRoute>(() => resolveRoute(window.location.pathname));

  const navigate = (route: WebRoute) => {
    window.history.pushState(null, '', getRoutePath(route));
    setCurrentRoute(route);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(resolveRoute(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <RouterContext.Provider value={{ currentRoute, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function Route({ path, children }: { path: string; children: ReactNode }) {
  const { currentRoute } = useRouter();
  const route = resolveRoute(path);
  
  if (currentRoute.path === route.path || (path === '*' && currentRoute.path === 'not-found')) {
    return <>{children}</>;
  }
  return null;
}

export function Link({ to, children, className, ...props }: { to: string; children: ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { navigate } = useRouter();
  const route = resolveRoute(to);
  
  return (
    <button
      className={className}
      onClick={() => navigate(route)}
      {...props}
    >
      {children}
    </button>
  );
}