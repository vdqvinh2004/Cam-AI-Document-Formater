import { useRouter } from '../router';
import { ROUTES } from '../types/route';
import { Button } from '@/components/ui/button';

interface NotFoundPageProps {
  path: string;
}

export function NotFoundPage({ path }: NotFoundPageProps) {
  const { navigate } = useRouter();

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">404 — Page Not Found</h1>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate(ROUTES['/'])}>Go to Workspace</Button>
    </div>
  );
}