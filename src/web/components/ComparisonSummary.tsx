import { useState } from 'react';
import type { BrowserSource, BrowserResult } from '../state/workflow-context';
import { useWorkflow } from '../state/workflow-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { withFormattedSuffix } from '../lib/filename';
import { ComparisonDiffView } from './ComparisonDiffView';

export function ComparisonSummary({ source, result }: { source: BrowserSource; result: BrowserResult }) {
  const { state } = useWorkflow();
  const [showDiff, setShowDiff] = useState(false);
  const sameFormat = source.format === result.format;
  const formattingAvailable = result.formattingAvailable;
  const validation = result.validationStatus;
  const comparison = state.comparison;
  const outputName = withFormattedSuffix(result.filename ?? result.name);

  const sourceText = state.sourcePreview?.text ?? '';
  const resultText = state.resultPreview?.text ?? '';
  const canShowDiff = sourceText.length > 0 && resultText.length > 0;

  return (
    <div className="comparison-summary space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Badge variant={validation === 'pass' ? 'default' : 'secondary'}>
          {validation === 'pass' ? 'Validated' : validation}
        </Badge>
        <h2 className="text-lg font-semibold">
          {formattingAvailable ? 'Formatting changes applied' : 'Formatting unavailable for this format'}
        </h2>
      </div>
      <div className="review-meta space-y-1 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Source:</strong> {source.name} ({source.format.toUpperCase()})</p>
        <p><strong className="text-foreground">Output:</strong> {outputName} ({result.format.toUpperCase()})</p>
        {!sameFormat && <p className="text-warning">The output format differs from the source format.</p>}
        {!formattingAvailable && <p className="text-warning">The original document was preserved unchanged. No formatting transformation was performed.</p>}
        {comparison?.noChangesApplied && <p className="text-warning">No style changes were applied — the result is identical to the source. Try another style or adjust your instructions.</p>}
        {result.verificationNote && <p className="text-foreground" data-testid="verification-note">{result.verificationNote}</p>}
        {comparison && <>
          <p>{comparison.summary}</p>
          <ul className="list-disc space-y-1 pl-5">
            {comparison.rows.map((row) => <li key={`${row.location}-${row.kind}`}><strong className="text-foreground">{row.location}:</strong> {row.explanation}</li>)}
          </ul>
        </>}
      </div>
      {canShowDiff && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDiff(!showDiff)}
            data-testid="toggle-diff"
            className="mb-2"
          >
            {showDiff ? 'Hide diff' : 'Show diff'}
          </Button>
          {showDiff && (
            <ComparisonDiffView
              sourceText={sourceText}
              resultText={resultText}
              className="mt-2"
            />
          )}
        </div>
      )}
    </div>
  );
}