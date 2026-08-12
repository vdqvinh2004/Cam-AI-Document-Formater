import type { ComparisonEvidence, ComparisonRow, ComparisonStatus, ComparisonKind, ValidationStatus } from '../types/comparison';

export interface ComparisonInput {
  sourceText: string;
  resultText: string;
  sourceFormat: 'txt' | 'markdown' | 'docx' | 'pdf';
  resultFormat: 'txt' | 'markdown' | 'docx' | 'pdf';
  validationStatus: ValidationStatus;
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

/** Order-sensitive exact token equality: 100% identical content, presentation ignored. */
function tokensExact(source: string[], result: string[]): boolean {
  return source.length === result.length && source.every((token, index) => token === result[index]);
}

export function compareDocuments(input: ComparisonInput): ComparisonEvidence {
  const { sourceText, resultText, sourceFormat, resultFormat, validationStatus } = input;

  if (sourceFormat === 'pdf') {
    return compareBinaryFormats(sourceFormat, resultFormat, validationStatus);
  }

  if (sourceFormat === 'docx') {
    return compareTextDocuments(sourceText, resultText, validationStatus, false);
  }

  return compareTextDocuments(sourceText, resultText, validationStatus, true);
}

function compareTextDocuments(
  sourceText: string,
  resultText: string,
  validationStatus: ValidationStatus,
  includeMarkdownStructure: boolean,
): ComparisonEvidence {
  const sourceTokens = normalizeContentTokens(sourceText);
  const resultTokens = normalizeContentTokens(resultText);
  const contentExact = sourceTokens.length > 0 && tokensExact(sourceTokens, resultTokens);

  const rows: ComparisonRow[] = [];
  const categories: ComparisonEvidence['categories'] = [];

  rows.push({
    location: 'Document content',
    kind: 'content',
    before: sourceText.slice(0, 200),
    after: resultText.slice(0, 200),
    explanation: contentExact
      ? '100% of the original content is preserved; only presentation may differ'
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

  const uniqueCategories = [...new Set(categories)];
  const presentationChanges = rows.some((row) => row.kind !== 'content');

  let status: ComparisonStatus = 'preserved';
  if (!contentExact) status = 'content-changed';
  else if (presentationChanges) status = 'presentation-changed';

  return {
    status,
    summary: contentExact
      ? 'Content preserved exactly; presentation changes detected'
      : 'Content changed: the result is not 100% identical to the source. Review before export',
    categories: uniqueCategories.length > 0 ? uniqueCategories : ['content'],
    rows,
    validation: validationStatus,
    noChangesApplied: contentExact && !presentationChanges,
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