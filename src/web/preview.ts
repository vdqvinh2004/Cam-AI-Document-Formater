export interface PreviewDiffRow {
  line: number;
  before: string;
  after: string;
}

export interface PreviewSnapshot {
  available: boolean;
  summary: string;
  diffs: PreviewDiffRow[];
}

export interface PreviewInput {
  sourceText: string;
  outputText: string;
  available: boolean;
  summary: string;
}

export function buildPreviewSnapshot(input: PreviewInput): PreviewSnapshot {
  if (!input.available) {
    return {
      available: false,
      summary: input.summary || 'Preview unavailable for this format.',
      diffs: [],
    };
  }

  const sourceLines = input.sourceText.split(/\r?\n/);
  const outputLines = input.outputText.split(/\r?\n/);
  const maxLines = Math.max(sourceLines.length, outputLines.length);
  const diffs: PreviewDiffRow[] = [];

  for (let index = 0; index < maxLines; index += 1) {
    const before = sourceLines[index] ?? '';
    const after = outputLines[index] ?? '';
    if (before !== after) {
      diffs.push({ line: index + 1, before, after });
    }
  }

  return {
    available: true,
    summary: input.summary || 'Preview ready',
    diffs,
  };
}
