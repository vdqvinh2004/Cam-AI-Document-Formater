import { memo, useMemo } from 'react';
import type { BrowserSource, BrowserResult } from '../state/workflow-context';
import { useWorkflow } from '../state/workflow-context';
import type { PreviewEvidence } from '../types/evidence';
import { DocxPreviewPane } from './preview/DocxPreviewPane';
import { TextPreviewPane } from './preview/TextPreviewPane';

export function PreviewPanel({ source, result }: { source: BrowserSource; result: BrowserResult }) {
  const { state } = useWorkflow();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PreviewColumn title="Before" source={source} result={result} evidence={state.sourcePreview} side="source" />
      <PreviewColumn title="After" source={source} result={result} evidence={state.resultPreview} side="result" />
    </div>
  );
}

const PreviewColumn = memo(function PreviewColumn({
  title,
  source,
  result,
  evidence,
  side,
}: {
  title: string;
  source: BrowserSource;
  result: BrowserResult;
  evidence: PreviewEvidence | null;
  side: 'source' | 'result';
}) {
  const format = side === 'source' ? source.format : result.format;
  const docxBlob = useMemo(
    () => (format === 'docx' ? (side === 'source' ? new Blob([source.arrayBuffer]) : result.blob) : null),
    [format, side, source.arrayBuffer, result.blob]
  );

  return (
    <div className="preview-column space-y-2">
      <h3 className="font-medium">{title}</h3>
      {!evidence ? (
        <p className="text-sm text-muted-foreground">Loading preview...</p>
      ) : (
        <div className="rounded-md border bg-background p-4 text-sm">
          {format === 'docx' && docxBlob ? (
            <DocxPreviewPane
              blob={docxBlob}
              fallback={evidence}
              label={title}
            />
          ) : (
            <TextPreviewPane evidence={evidence} label={title} />
          )}
        </div>
      )}
    </div>
  );
});