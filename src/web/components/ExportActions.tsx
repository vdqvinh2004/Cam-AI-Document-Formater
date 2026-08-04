import { memo } from 'react';
import type { BrowserResult } from '../state/workflow-context';

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
    <div className="export-actions">
      <button onClick={download} className="btn-primary" disabled={!canExport}>
        Download Formatted File
      </button>
      {!canExport && <p className="export-warning">Export is unavailable until a validated formatting transformation exists.</p>}
    </div>
  );
});