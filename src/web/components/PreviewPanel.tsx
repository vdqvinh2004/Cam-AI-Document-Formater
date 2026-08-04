import { memo } from 'react';
import type { BrowserSource, BrowserResult } from '../state/workflow-context';
import { useWorkflow } from '../state/workflow-context';
import type { PreviewEvidence } from '../types/evidence';
import DOMPurify from 'dompurify';

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 's', 'code', 'pre',
      'ul', 'ol', 'li', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img', 'div', 'span'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

export function PreviewPanel({ source, result }: { source: BrowserSource; result: BrowserResult }) {
  const { state } = useWorkflow();
  const sourcePreview = state.sourcePreview;
  const resultPreview = state.resultPreview;

  return (
    <div className="preview-panel">
      <PreviewColumn title="Before" preview={sourcePreview} />
      <PreviewColumn title="After" preview={resultPreview} />
    </div>
  );
}

const PreviewColumn = memo(function PreviewColumn({ title, preview }: { title: string; preview: PreviewEvidence | null }) {
  return (
    <div className="preview-column">
      <h3>{title}</h3>
      {!preview ? <p className="preview-pane">Loading preview...</p> : (
        <div className="preview-pane" aria-label={`${title} preview`}>
          {preview.status === 'unavailable' || preview.status === 'failed'
            ? <p>{preview.warnings.join(' ') || 'Preview unavailable.'}</p>
            : <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview.html) }} />}
          {preview.warnings.length > 0 && <p className="preview-warning">{preview.warnings.join(' ')}</p>}
        </div>
      )}
    </div>
  );
});