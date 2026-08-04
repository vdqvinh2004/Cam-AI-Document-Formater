import { useWorkflow } from '../state/workflow-context';
import { ROUTES } from '../types/route';

interface NotFoundPageProps {
  path: string;
}

export function NotFoundPage({ path }: NotFoundPageProps) {
  const { navigate } = useWorkflow();

  return (
    <div className="not-found-page">
      <h1>404 — Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <button onClick={() => navigate(ROUTES['/'])} className="btn-primary">
        Go to Workspace
      </button>
    </div>
  );
}