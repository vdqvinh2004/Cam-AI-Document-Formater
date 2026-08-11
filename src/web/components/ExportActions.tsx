import { memo } from 'react';
import type { BrowserResult } from '../state/workflow-context';
import { Button } from '@/components/ui/button';

interface ExportActionsProps {
  result: BrowserResult;
  onExportComplete?: () => void;
}

export const ExportActions = memo(function ExportActions({ result, onExportComplete }: ExportActionsProps) {
  const canExport = result.validationStatus === 'pass' && result.formattingAvailable;
  const download = () => {
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename ?? result.name;
    link.click();
    URL.revokeObjectURL(url);
    onExportComplete?.();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={download} disabled={!canExport}>
        Download Formatted File
      </Button>
      {!canExport && <p className="text-sm text-muted-foreground">Export is unavailable until a validated formatting transformation exists.</p>}
    </div>
  );
});