import { useWorkflow } from '../state/workflow-context';
import { FileDropzone } from '../components/FileDropzone';
import { readSource } from '../formatting';
import { ROUTES } from '../types/route';

export function WorkspacePage() {
  const { state, setSource, setJobStatus, navigate } = useWorkflow();

  const handleFileSelect = async (file: File) => {
    try {
      const source = await readSource(file);
      setSource({
        file,
        format: source.format,
        name: file.name,
        size: file.size,
        arrayBuffer: await file.arrayBuffer(),
      });
      setJobStatus({ status: 'ready', message: 'File loaded. Configure formatting options.' });
      navigate(ROUTES['/setup']);
    } catch (error) {
      setJobStatus({ status: 'failed', message: error instanceof Error ? error.message : 'Unable to read that file.' });
    }
  };

  return (
    <div className="workspace-page">
      <h1>Workspace</h1>
      {state.jobStatus === 'failed' && <p className="file-error" role="status">{state.jobMessage}</p>}
      <p className="page-description">Drop a document or click to select a file to begin formatting.</p>
      <FileDropzone onFileSelect={handleFileSelect} onFileError={(message) => setJobStatus({ status: 'failed', message })} disabled={!!state.source} />
      {state.source && (
        <div className="file-summary">
          <h2>{state.source.name}</h2>
          <p>Selected: <strong>{state.source.name}</strong> ({state.source.format.toUpperCase()}, {formatBytes(state.source.size)})</p>
          <button onClick={() => setSource(null)} className="btn-secondary">Change file</button>
          <button onClick={() => navigate(ROUTES['/setup'])} className="btn-primary">Configure formatting</button>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}