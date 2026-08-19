import { useEffect, useRef } from 'react';
import { useWorkflow } from '../state/workflow-context';

/**
 * Announces job status changes to screen readers via an aria-live region.
 * Renders a visually hidden div that updates its text content on status changes.
 */
export function StatusAnnouncer() {
  const { jobStatus, jobMessage } = useWorkflow();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && jobMessage) {
      // Force the screen reader to re-announce by clearing then setting
      ref.current.textContent = '';
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.textContent = `[${jobStatus}] ${jobMessage}`;
        }
      });
    }
  }, [jobStatus, jobMessage]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
