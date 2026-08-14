import type { ComparisonEvidence, ComparisonRow, ComparisonStatus, ComparisonKind, ValidationStatus } from '../types/comparison';

export interface ComparisonInput {
  sourceText: string;
  resultText: string;
  sourceFormat: 'txt' | 'markdown' | 'docx' | 'pdf';
  resultFormat: 'txt' | 'markdown' | 'docx' | 'pdf';
  validationStatus: ValidationStatus;
  /** Count of formatting operations that were actually applied (deterministic or merged). */
  appliedChanges?: number;
  /** True when the style may structurally reorder blocks (Custom style). */
  allowReorder?: boolean;
  /** Intended content edits (heading rewrites). Exact source lines are stripped before content comparison. */
  expectedTextChanges?: Array<{ source: string; replacement: string }>;
}

const CONTENT_TOKEN_BREAKS: RegExp[] = [
  /^#{1,6}\s+/,            // Markdown heading markers
  /^\s*(?:[-*+]|\d+\.)\s+/, // List markers
  /^\s*>\s?/,              // Blockquote markers
];

/** Strips presentation-only markers so content comparison ignores them. */
export function normalizeContentTokens(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const cleaned: string[] = [];
  for (const line of lines) {
    let value = line;
    for (const pattern of CONTENT_TOKEN_BREAKS) value = value.replace(pattern, '');
    value = value.replace(/[*_`]/g, '');
    cleaned.push(value.trim());
  }
  return cleaned.join(' ').split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Removes whole lines that exactly match an intended content edit (e.g. a renumbered heading),
 * so the planned rewrite is not flagged as an unexpected content change.
 */
export function stripExpectedTextChanges(text: string, fragments: string[]): string {
  const active = fragments.map((fragment) => fragment.trim()).filter((fragment) => fragment.length > 0);
  if (active.length === 0) return text;
  return text.split(/\r?\n/).filter((line) => !active.some((fragment) => line.trim() === fragment)).join('\n');
}

/** Order-sensitive exact token equality: 100% identical content, presentation ignored. */
function tokensExact(source: string[], result: string[]): boolean {
  return source.length === result.length && source.every((token, index) => token === result[index]);
}

/** Order-insensitive but complete: every token present, counts identical, order may differ. */
function tokensComplete(source: string[], result: string[]): boolean {
  if (source.length !== result.length) return false;
  const sortedSource = [...source].sort();
  const sortedResult = [...result].sort();
  return sortedSource.every((token, index) => token === sortedResult[index]);
}

export function compareDocuments(input: ComparisonInput): ComparisonEvidence {
  const { sourceText, resultText, sourceFormat, resultFormat, validationStatus } = input;

  if (sourceFormat === 'pdf' || resultFormat === 'pdf') {
    return compareBinaryFormats(sourceFormat, resultFormat, validationStatus);
  }

  return compareTextDocuments(sourceText, resultText, sourceFormat === 'markdown' || sourceFormat === 'docx', input);
}

function compareTextDocuments(
  sourceText: string,
  resultText: string,
  includeMarkdownStructure: boolean,
  input: ComparisonInput
): ComparisonEvidence {
  const { appliedChanges = 0, allowReorder = false, validationStatus, expectedTextChanges = [] } = input;
  const sourceFragments = expectedTextChanges.map((change) => change.source);
  const resultFragments = expectedTextChanges.map((change) => change.replacement);
  const sourceTokens = normalizeContentTokens(stripExpectedTextChanges(sourceText, sourceFragments));
  const resultTokens = normalizeContentTokens(stripExpectedTextChanges(resultText, resultFragments));
  const orderedExact = sourceTokens.length > 0 && tokensExact(sourceTokens, resultTokens);
  const completeWhenReordered = allowReorder && sourceTokens.length > 0 && tokensComplete(sourceTokens, resultTokens);
  const contentExact = allowReorder ? completeWhenReordered : orderedExact;

  const rows: ComparisonRow[] = [];
  const categories: ComparisonEvidence['categories'] = [];

  rows.push({
    location: 'Document content',
    kind: 'content',
    before: sourceText.slice(0, 200),
    after: resultText.slice(0, 200),
    explanation: contentExact
      ? allowReorder
        ? 'All original content is preserved; only presentation and section order may differ'
        : '100% of the original content is preserved; only presentation may differ'
      : 'Content changed: the result text is not 100% identical to the source',
  });
  categories.push('content');

  if (includeMarkdownStructure) {
    const sourceHeadings = (sourceText.match(/^#{1,6}\s/mg) || []).length;
    const resultHeadings = (resultText.match(/^#{1,6}\s/mg) || []).length;
    if (sourceHeadings !== resultHeadings) {
      rows.push({
        location: 'Headings',
        kind: 'presentation',
        before: `${sourceHeadings} heading(s)`,
        after: `${resultHeadings} heading(s)`,
        explanation: 'Heading structure modified',
      });
      categories.push('structure');
    }

    const sourceCodeBlocks = (sourceText.match(/```/g) || []).length / 2;
    const resultCodeBlocks = (resultText.match(/```/g) || []).length / 2;
    if (sourceCodeBlocks !== resultCodeBlocks) {
      rows.push({
        location: 'Code blocks',
        kind: 'presentation',
        before: `${sourceCodeBlocks} code block(s)`,
        after: `${resultCodeBlocks} code block(s)`,
        explanation: 'Code block count changed',
      });
      categories.push('structure');
    }
  }

  const reordered = allowReorder && !orderedExact && contentExact;
  if (reordered) {
    const sourceBlocks = sourceText.split(/\n\s*\n/).length;
    const resultBlocks = resultText.split(/\n\s*\n/).length;
    rows.push({
      location: 'Section order',
      kind: 'presentation',
      before: `${sourceBlocks} section(s) in source order`,
      after: `${resultBlocks} section(s) in formatted order`,
      explanation: 'Sections were moved by the custom style',
    });
    categories.push('structure');
  }

  if (expectedTextChanges.length > 0) {
    rows.push({
      location: 'Rewritten headings',
      kind: 'presentation',
      before: expectedTextChanges.map((change) => change.source).join(' | '),
      after: expectedTextChanges.map((change) => change.replacement).join(' | '),
      explanation: 'Heading text was intentionally rewritten to match the custom style description',
    });
    categories.push('structure');
  }

  if (appliedChanges > 0) categories.push('typography');

  const uniqueCategories = [...new Set(categories)];
  const presentationChanges = reordered || expectedTextChanges.length > 0 || appliedChanges > 0 || rows.some((row) => row.kind !== 'content');

  let status: ComparisonStatus = 'preserved';
  if (!contentExact) status = 'content-changed';
  else if (presentationChanges) status = 'presentation-changed';

  return {
    status,
    summary: contentExact
      ? reordered
        ? 'Content preserved; sections were moved and presentation changed'
        : 'Content preserved exactly; presentation changes detected'
      : 'Content changed: the result is not 100% identical to the source. Review before export',
    categories: uniqueCategories.length > 0 ? uniqueCategories : ['content'],
    rows,
    validation: validationStatus,
    noChangesApplied: contentExact && !presentationChanges && appliedChanges === 0,
  };
}

function compareBinaryFormats(
  sourceFormat: 'txt' | 'markdown' | 'docx' | 'pdf',
  resultFormat: 'txt' | 'markdown' | 'docx' | 'pdf',
  validationStatus: ValidationStatus,
): ComparisonEvidence {
  const rows: ComparisonRow[] = [{
    location: `${sourceFormat.toUpperCase()} document`,
    kind: 'unavailable',
    explanation: `${sourceFormat.toUpperCase()} comparison requires semantic extraction; preview shows visual rendering only`,
  }];

  return {
    status: 'unavailable',
    summary: `${sourceFormat.toUpperCase()} formatting comparison not available; content preservation validated separately`,
    categories: ['unavailable'],
    rows,
    validation: validationStatus,
  };
}