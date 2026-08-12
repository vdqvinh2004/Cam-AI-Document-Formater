import { useEffect } from 'react';
import { useWorkflow } from '../state/workflow-context';
import { panelFromSearch, type DashboardPanel } from '../types/panel';
import { FileDropzone } from '../components/FileDropzone';
import { FormatControls } from '../components/FormatControls';
import { JobStatus } from '../components/JobStatus';
import { PreviewPanel } from '../components/PreviewPanel';
import { ComparisonSummary } from '../components/ComparisonSummary';
import { ExportActions } from '../components/ExportActions';
import { readSource } from '../formatting';
import { createLocalStorageKeyStore } from '../api-key-storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UploadCloud, SlidersHorizontal, CheckCircle2 } from 'lucide-react';

const STEPS: { panel: DashboardPanel; label: string; icon: typeof UploadCloud }[] = [
  { panel: 'upload', label: 'Upload', icon: UploadCloud },
  { panel: 'configure', label: 'Configure', icon: SlidersHorizontal },
  { panel: 'review', label: 'Review', icon: CheckCircle2 },
];

export function DashboardPage() {
  const { state, setActivePanel, setSource, setJobStatus, runFormatting } = useWorkflow();
  const { source, result, activePanel, jobStatus, jobMessage, jobProgress } = state;
  const hasApiKey = !!createLocalStorageKeyStore().getKey();

  const stepGate: Record<DashboardPanel, { available: boolean; reason: string | null }> = {
    upload: { available: true, reason: null },
    configure: { available: !!source, reason: source ? null : 'Select a document first.' },
    review: { available: !!(source && result && result.validationStatus === 'pass'), reason: source && result ? 'Complete a formatting job with valid results first.' : 'Format a document to unlock review.' },
  };

  useEffect(() => {
    const panel = panelFromSearch(window.location.search);
    if (panel !== activePanel) setActivePanel(panel);
    const handlePopState = () => {
      const next = panelFromSearch(window.location.search);
      if (next !== activePanel) setActivePanel(next);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activePanel, setActivePanel]);

  const handleFileSelect = async (file: File) => {
    try {
      const sourceData = await readSource(file);
      setSource({
        file,
        format: sourceData.format,
        name: file.name,
        size: file.size,
        arrayBuffer: await file.arrayBuffer(),
      });
      setJobStatus({ status: 'ready', message: 'File loaded. Configure formatting options.' });
      setActivePanel('configure');
    } catch (error) {
      setJobStatus({ status: 'failed', message: error instanceof Error ? error.message : 'Unable to read that file.' });
    }
  };

  const handleStart = async () => {
    if (!state.disclosed) return;
    await runFormatting();
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Document Formatter</h1>
        <p className="text-muted-foreground">Upload a document, choose a style, and review the formatted result — all in your browser.</p>
      </header>

      <StepIndicator current={activePanel} onSelect={setActivePanel} gate={stepGate} />

      {activePanel === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload a document</CardTitle>
            <CardDescription>Drop a file or click to browse. Supported formats: TXT, Markdown, DOCX, PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobStatus === 'failed' && <p className="text-sm text-destructive" role="status">{jobMessage}</p>}
            <FileDropzone onFileSelect={handleFileSelect} onFileError={(message) => setJobStatus({ status: 'failed', message })} disabled={!!source} />
            {source && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p className="font-medium">{source.name}</p>
                  <p className="text-sm text-muted-foreground">{source.format.toUpperCase()} · {formatBytes(source.size)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setSource(null)}>Change file</Button>
                  <Button onClick={() => setActivePanel('configure')}>Configure formatting</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activePanel === 'configure' && (
        <Card>
          <CardHeader>
            <CardTitle>Configure formatting</CardTitle>
            <CardDescription>
              {source ? `${source.name} · ${source.format.toUpperCase()}` : 'Select a document first.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!source ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">You haven't selected a document yet.</p>
                <Button onClick={() => setActivePanel('upload')}>Go to upload</Button>
              </div>
            ) : (
              <>
                <FormatControls />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setActivePanel('upload')}>Back</Button>
                  <Button onClick={handleStart} disabled={!state.disclosed || !hasApiKey || ['generating', 'validating'].includes(jobStatus)} title={!hasApiKey ? 'Add a Gemini API key in Settings first.' : undefined}>
                    {['generating', 'validating'].includes(jobStatus) ? 'Processing...' : 'Start Formatting'}
                  </Button>
                </div>
              </>
            )}
            <JobStatus status={jobStatus} message={jobMessage} progress={jobProgress} onRetry={handleStart} />
          </CardContent>
        </Card>
      )}

      {activePanel === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review results</CardTitle>
            <CardDescription>
              {result ? `Output: ${result.filename ?? result.name} (${result.format.toUpperCase()})` : 'No formatting result yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!source || !result ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">No formatting result to review. Complete a formatting job first.</p>
                <Button onClick={() => setActivePanel('upload')}>Go to upload</Button>
              </div>
            ) : (
              <>
                <ComparisonSummary source={source} result={result} />
                <PreviewPanel source={source} result={result} />
                <ExportActions result={result} onExportComplete={() => setJobStatus({ status: 'complete', message: 'Export complete' })} />
                <JobStatus status={jobStatus} message={jobMessage} progress={jobProgress} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setSource(null)}>New Document</Button>
                  <Button variant="secondary" onClick={() => setActivePanel('configure')}>Format Another</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({ current, onSelect, gate }: { current: DashboardPanel; onSelect: (panel: DashboardPanel) => void; gate: Record<DashboardPanel, { available: boolean; reason: string | null }> }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = current === step.panel;
        const isComplete = STEPS.findIndex((s) => s.panel === current) > index;
        const { available, reason } = gate[step.panel];
        return (
          <li key={step.panel} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(step.panel)}
              disabled={!available}
              title={reason ?? undefined}
              aria-disabled={!available}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]',
                isActive ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                isComplete && 'border-transparent bg-muted',
                !available && 'cursor-not-allowed border-transparent bg-muted text-muted-foreground opacity-60 hover:bg-muted'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive && 'text-primary')} aria-hidden="true" />
              {step.label}
            </button>
            {index < STEPS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}