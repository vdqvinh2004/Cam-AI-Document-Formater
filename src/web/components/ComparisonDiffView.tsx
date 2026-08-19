import { useMemo } from 'react';
import { diffWords, type DiffToken } from '../lib/diff';

interface ComparisonDiffViewProps {
  sourceText: string;
  resultText: string;
  className?: string;
}

function DiffTokenSpan({ token }: { token: DiffToken }) {
  if (token.type === 'equal') {
    return <span>{token.text}</span>;
  }
  return (
    <span
      className={
        token.type === 'added'
          ? 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-red-100 text-red-900 line-through dark:bg-red-900/30 dark:text-red-300'
      }
    >
      {token.text}
    </span>
  );
}

export function ComparisonDiffView({ sourceText, resultText, className }: ComparisonDiffViewProps) {
  const tokens = useMemo(() => diffWords(sourceText, resultText), [sourceText, resultText]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const token of tokens) {
      if (token.type === 'added') added++;
      if (token.type === 'removed') removed++;
    }
    return { added, removed };
  }, [tokens]);

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> {stats.added} added
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> {stats.removed} removed
        </span>
      </div>
      <div className="whitespace-pre-wrap rounded-md border bg-background p-4 font-mono text-sm leading-relaxed">
        {tokens.map((token, index) => (
          <DiffTokenSpan key={`${token.type}-${index}`} token={token} />
        ))}
      </div>
    </div>
  );
}
