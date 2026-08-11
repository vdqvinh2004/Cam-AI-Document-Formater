import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Router, useRouter } from './router';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { WorkflowProvider, useWorkflow } from './state/workflow-context';
import './styles/globals.css';

function RoutedPage() {
  const { currentRoute } = useRouter();

  switch (currentRoute.path) {
    case '/': return <DashboardPage />;
    case '/setup':
    case '/review':
      return <DeepLinkRedirect />;
    case '/settings': return <SettingsPage />;
    case '/privacy': return <PrivacyPage />;
    default: return <NotFoundPage path="*" />;
  }
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
    <Router>
      <WorkflowProvider>
        <AppShell>
          <RoutedPage />
        </AppShell>
      </WorkflowProvider>
    </Router>
  </StrictMode>
);