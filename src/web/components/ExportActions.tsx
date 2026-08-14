import { memo } from 'react';
import type { BrowserResult } from '../state/workflow-context';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '../lib/download';
import { withFormattedSuffix } from '../lib/filename';

interface ExportActionsProps {
  result: BrowserResult;
  onExportComplete?: () => void;
}

export const ExportActions = memo(function ExportActions({ result, onExportComplete }: ExportActionsProps) {
  const canExport = result.validationStatus === 'pass' && result.formattingAvailable;
  const download = () => {
    downloadBlob(result.blob, withFormattedSuffix(result.filename ?? result.name));
    onExportComplete?.();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={download} disabled={!canExport}>
        Download Formatted File
      </Button>
      <p className="text-sm text-muted-foreground">
        Saves as {withFormattedSuffix(result.filename ?? result.name)}
      </p>
      {!canExport && <p className="text-sm text-muted-foreground">Export is unavailable until a validated formatting transformation exists.</p>}
    </div>
  );
});