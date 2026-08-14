import { useEffect, useRef, useState } from 'react';
import type { PreviewEvidence } from '../../types/evidence';

const MAX_PACKAGE_BYTES = 20 * 1024 * 1024;

interface DocxPreviewPaneProps {
  blob: Blob;
  fallback?: PreviewEvidence | null;
  label: string;
}

type PaneState = 'loading' | 'rendered' | 'failed' | 'unavailable';

export function DocxPreviewPane({ blob, fallback, label }: DocxPreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PaneState>('loading');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (blob.size === 0 || blob.size > MAX_PACKAGE_BYTES) {
      setState('unavailable');
      return;
    }

    let cancelled = false;
    setState('loading');

    (async () => {
      try {
        const { renderAsync } = await import('docx-preview');
        if (cancelled) return;
        container.replaceChildren();
        await renderAsync(blob, container, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });
        if (cancelled) return;
        setState(container.hasChildNodes() ? 'rendered' : 'failed');
      } catch {
        if (cancelled) return;
        container.replaceChildren();
        setState(fallback && fallback.text ? 'failed' : 'failed');
      }
    })();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [blob, fallback]);

  return (
    <div className="docx-preview" aria-label={`${label} DOCX preview`}>
      {state === 'loading' && <p className="text-sm text-muted-foreground">Rendering DOCX preview...</p>}
      {state === 'rendered' && fallback?.warnings.length ? (
        <p className="mb-2 text-xs text-muted-foreground">{fallback.warnings.join(' ')}</p>
      ) : null}
      {(state === 'failed' || state === 'unavailable') && (
        <div className="space-y-1">
          <p className="text-sm text-warning">
            {state === 'unavailable'
              ? 'DOCX preview unavailable: the file is empty or exceeds the preview size limit.'
              : 'DOCX preview could not be rendered.'}
          </p>
          {fallback && fallback.text && (
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{fallback.text.slice(0, 8000)}</pre>
          )}
          {fallback?.warnings.length ? <p className="text-xs text-muted-foreground">{fallback.warnings.join(' ')}</p> : null}
        </div>
      )}
      <div ref={containerRef} className={state === 'rendered' ? '' : 'hidden'} />
    </div>
  );
}