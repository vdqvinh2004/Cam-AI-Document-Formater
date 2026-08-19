import { StrictMode, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Router, useRouter } from './router';
import { AppShell } from './components/AppShell';
import { WorkflowProvider, useWorkflow } from './state/workflow-context';
import { ThemeProvider } from './providers/ThemeProvider';
import './styles/globals.css';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function RoutedPage() {
  const { currentRoute } = useRouter();

  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground">Loading…</div>}>
      {(() => {
        switch (currentRoute.path) {
          case '/': return <DashboardPage />;
          case '/setup':
          case '/review':
            return <DeepLinkRedirect />;
          case '/settings': return <SettingsPage />;
          case '/privacy': return <PrivacyPage />;
          default: return <NotFoundPage path="*" />;
        }
      })()}
    </Suspense>
  );
}

function DeepLinkRedirect() {
  const { currentRoute } = useRouter();
  const { setActivePanel } = useWorkflow();
  const panel = currentRoute.path === '/review' ? 'review' : 'configure';

  useEffect(() => {
    window.history.replaceState(null, '', `/?panel=${panel}`);
    setActivePanel(panel);
  }, [panel, setActivePanel]);

  return <DashboardPage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Router>
        <WorkflowProvider>
          <AppShell>
            <RoutedPage />
          </AppShell>
        </WorkflowProvider>
      </Router>
    </ThemeProvider>
  </StrictMode>
);