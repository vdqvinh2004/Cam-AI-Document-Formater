import { memo } from 'react';
import type { JobStatus as Status } from '../types/job';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface JobStatusProps {
  status: Status;
  message: string;
  progress?: number;
  onRetry?: () => void;
}

export const JobStatus = memo(function JobStatus({ status, message, progress, onRetry }: JobStatusProps) {
  if (status === 'idle') return null;

  const tone =
    status === 'failed' || status === 'blocked'
      ? 'text-destructive'
      : status === 'complete'
      ? 'text-foreground'
      : 'text-muted-foreground';

  return (
    <section
      className={cn('space-y-3 rounded-lg border p-4', tone)}
      role="status"
      aria-live="polite"
      aria-label="Formatting status"
    >
      <p><strong>{labelFor(status)}:</strong> {message}</p>
      {progress !== undefined && <Progress value={progress} aria-label={`${progress}% complete`} />}
      {status === 'failed' && onRetry && (
        <Button type="button" variant="secondary" onClick={onRetry}>Try again</Button>
      )}
    </section>
  );
});

function labelFor(status: Status): string {
  return {
    idle: 'Ready',
    ready: 'Ready',
    generating: 'Generating',
    validating: 'Validating',
    complete: 'Complete',
    blocked: 'Unavailable',
    failed: 'Error',
  }[status];
}