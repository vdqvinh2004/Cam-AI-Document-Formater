import { useWorkflow } from '../state/workflow-context';
import { ROUTES } from '../types/route';
import { ComparisonSummary } from '../components/ComparisonSummary';
import { PreviewPanel } from '../components/PreviewPanel';
import { ExportActions } from '../components/ExportActions';
import { JobStatus } from '../components/JobStatus';

export function ReviewPage() {
  const { state, navigate, setJobStatus } = useWorkflow();
  const { source, result, jobStatus, jobMessage, jobProgress } = state;

  if (!source || !result) {
    return (
      <div className="review-page">
        <h1>Review</h1>
        <p>No formatting result to review. Please complete a formatting job first.</p>
        <button onClick={() => navigate(ROUTES['/'])} className="btn-primary">Go to Workspace</button>
      </div>
    );
  }

  return (
    <div className="review-page">
      <header className="review-header">
        <h1>Review Results</h1>
        <div className="review-meta">
          <span>Source: {source.name} ({source.format.toUpperCase()})</span>
          <span>Result: {result.filename} ({result.format.toUpperCase()})</span>
        </div>
      </header>

      <section className="comparison-section">
        <ComparisonSummary source={source} result={result} />
      </section>

      <section className="preview-section">
        <PreviewPanel source={source} result={result} />
      </section>

      <section className="export-section">
        <ExportActions result={result} onExportComplete={() => {
          setJobStatus({ status: 'complete', message: 'Export complete' });
        }} />
      </section>

      <JobStatus status={jobStatus} message={jobMessage} progress={jobProgress} />

      <div className="review-actions">
        <button onClick={() => navigate(ROUTES['/'])} className="btn-secondary">New Document</button>
        <button onClick={() => navigate(ROUTES['/setup'])} className="btn-secondary">Format Another</button>
      </div>
    </div>
  );
}