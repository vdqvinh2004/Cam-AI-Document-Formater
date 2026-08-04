import { memo } from 'react';
import type { JobStatus as Status } from '../types/job';

interface JobStatusProps {
  status: Status;
  message: string;
  progress?: number;
  onRetry?: () => void;
}

export const JobStatus = memo(function JobStatus({ status, message, progress, onRetry }: JobStatusProps) {
  if (status === 'idle') return null;

  return (
    <section className={`job-status job-status-${status}`} role="status" aria-live="polite" aria-label="Formatting status">
      <p><strong>{labelFor(status)}:</strong> {message}</p>
      {progress !== undefined && <progress value={progress} max="100" aria-label={`${progress}% complete`} />}
      {status === 'failed' && onRetry && <button type="button" className="btn-secondary" onClick={onRetry}>Try again</button>}
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