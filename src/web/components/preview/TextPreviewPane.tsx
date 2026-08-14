import type { PreviewEvidence } from '../../types/evidence';
import DOMPurify from 'dompurify';

interface TextPreviewPaneProps {
  evidence: PreviewEvidence;
  label: string;
}

const ALLOWED_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 's', 'code', 'pre',
  'ul', 'ol', 'li', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'a', 'img', 'div', 'span'
];

export function TextPreviewPane({ evidence, label }: TextPreviewPaneProps) {
  const sanitized = DOMPurify.sanitize(evidence.html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });

  return (
    <div aria-label={`${label} preview`}>
      {evidence.status === 'unavailable' || evidence.status === 'failed'
        ? <p>{evidence.warnings.join(' ') || 'Preview unavailable.'}</p>
        : <div dangerouslySetInnerHTML={{ __html: sanitized }} />}
      {evidence.warnings.length > 0 && <p className="mt-2 text-xs text-warning">{evidence.warnings.join(' ')}</p>}
    </div>
  );
}