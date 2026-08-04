import { useWorkflow } from '../state/workflow-context';
import { ROUTES } from '../types/route';
import { FormatControls } from '../components/FormatControls';
import { JobStatus } from '../components/JobStatus';

export function SetupPage() {
  const { state, navigate, runFormatting } = useWorkflow();
  const { source, jobStatus, jobMessage, jobProgress } = state;

  if (!source) {
    return (
      <div className="setup-page">
        <h1>Setup</h1>
        <p>Please select a document first.</p>
        <button onClick={() => navigate(ROUTES['/'])} className="btn-primary">Go to Workspace</button>
      </div>
    );
  }

  const handleStart = async () => {
    if (!state.disclosed) return;
    await runFormatting();
  };

  return (
    <div className="setup-page">
      <h1>Configure Formatting</h1>
      <h2>{source.name}</h2>
      <p className="page-description">Choose a style profile and add any custom instructions.</p>

      <FormatControls />

      <div className="setup-actions">
        <button onClick={() => navigate(ROUTES['/'])} className="btn-secondary">Back to Workspace</button>
        <button onClick={handleStart} disabled={!state.disclosed || ['generating', 'validating'].includes(jobStatus)} className="btn-primary">
          {['generating', 'validating'].includes(jobStatus) ? 'Processing...' : 'Start Formatting'}
        </button>
      </div>

      <JobStatus status={jobStatus} message={jobMessage} progress={jobProgress} onRetry={handleStart} />
    </div>
  );
}