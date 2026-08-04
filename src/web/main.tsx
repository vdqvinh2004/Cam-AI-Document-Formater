import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Router, useRouter } from './router';
import { AppShell } from './components/AppShell';
import { WorkspacePage } from './pages/WorkspacePage';
import { SetupPage } from './pages/SetupPage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { WorkflowProvider } from './state/workflow-context';
import './styles/web.css';

function RoutedPage() {
  const { currentRoute } = useRouter();

  switch (currentRoute.path) {
    case '/': return <WorkspacePage />;
    case '/setup': return <SetupPage />;
    case '/review': return <ReviewPage />;
    case '/settings': return <SettingsPage />;
    case '/privacy': return <PrivacyPage />;
    default: return <NotFoundPage path="*" />;
  }
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
