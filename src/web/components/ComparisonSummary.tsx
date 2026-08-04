import type { BrowserSource, BrowserResult } from '../state/workflow-context';
import { useWorkflow } from '../state/workflow-context';

export function ComparisonSummary({ source, result }: { source: BrowserSource; result: BrowserResult }) {
  const { state } = useWorkflow();
  const sameFormat = source.format === result.format;
  const formattingAvailable = result.formattingAvailable;
  const validation = result.validationStatus;
  const comparison = state.comparison;

  return (
    <div className="comparison-summary">
      <div className="comparison-status">
        <span className={`status-badge ${validation}`}>{validation === 'pass' ? 'Validated' : validation}</span>
        <h2>{formattingAvailable ? 'Formatting changes applied' : 'Formatting unavailable for this format'}</h2>
      </div>
      <div className="comparison-details">
        <p><strong>Source:</strong> {source.name} ({source.format.toUpperCase()})</p>
        <p><strong>Output:</strong> {result.name} ({result.format.toUpperCase()})</p>
        {!sameFormat && <p className="comparison-warning">The output format differs from the source format.</p>}
        {!formattingAvailable && <p className="comparison-warning">The original document was preserved unchanged. No formatting transformation was performed.</p>}
        {comparison && <>
          <p>{comparison.summary}</p>
          <ul className="comparison-rows">
            {comparison.rows.map((row) => <li key={`${row.location}-${row.kind}`}><strong>{row.location}:</strong> {row.explanation}</li>)}
          </ul>
        </>}
      </div>
    </div>
  );
}