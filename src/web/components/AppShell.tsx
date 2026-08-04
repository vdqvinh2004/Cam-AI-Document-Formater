import { useWorkflow } from '../state/workflow-context';
import { Navigation } from './Navigation';
import { ROUTES, type WebRoute } from '../types/route';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { state, navigate } = useWorkflow();
  const currentRoute = state.currentRoute;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Navigation currentRoute={currentRoute} onNavigate={navigate} />
      </header>
      <main className="app-main" role="main">
        {children}
      </main>
      <footer className="app-footer">
        <p>
          <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate(ROUTES['/privacy']); }}>Privacy</a>
          {' | '}
          <span>Cam DocFormater</span>
        </p>
      </footer>
    </div>
  );
}

