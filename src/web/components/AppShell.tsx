import { useWorkflow } from '../state/workflow-context';
import { Navigation } from './Navigation';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { StatusAnnouncer } from './StatusAnnouncer';
import { ROUTES, type WebRoute } from '../types/route';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { state, navigate } = useWorkflow();
  const currentRoute = state.currentRoute;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="app-header border-b">
        <Navigation currentRoute={currentRoute} onNavigate={navigate} />
      </header>
      <main id="main-content" className="app-main mx-auto w-full max-w-5xl flex-1 px-6 py-8" role="main">
        {children}
      </main>
      <footer className="app-footer border-t">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate(ROUTES['/privacy'])}>Privacy</Button>
          <span aria-hidden="true">|</span>
          <span>Cam DocFormater</span>
        </div>
      </footer>
      <KeyboardShortcuts />
      <StatusAnnouncer />
      <Toaster />
    </div>
  );
}