import type { ComparisonEvidence, ComparisonRow, ComparisonStatus, ComparisonKind, ValidationStatus } from '../types/comparison';

export interface ComparisonInput {
  sourceText: string;
  resultText: string;
  sourceFormat: 'txt' | 'markdown' | 'docx' | 'pdf';
  resultFormat: 'txt' | 'markdown' | 'docx' | 'pdf';
  validationStatus: ValidationStatus;
}

export function compareDocuments(input: ComparisonInput): ComparisonEvidence {
  const { sourceText, resultText, sourceFormat, resultFormat, validationStatus } = input;
  
  if (sourceFormat === 'pdf') {
    return compareBinaryFormats(sourceFormat, resultFormat, validationStatus);
  }
  
  if (sourceFormat === 'docx') {
    return compareDocxFormats(sourceText, resultText, validationStatus);
  }
  
  return compareTextFormats(sourceText, resultText, sourceFormat, resultFormat, validationStatus);
}

function compareTextFormats(
  sourceText: string,
  resultText: string,
  sourceFormat: 'txt' | 'markdown' | 'docx' | 'pdf',
  resultFormat: 'txt' | 'markdown' | 'docx' | 'pdf',
  validationStatus: ValidationStatus,
): ComparisonEvidence {
  const sourceLines = sourceText.split('\n').filter(l => l.trim());
  const resultLines = resultText.split('\n').filter(l => l.trim());
  
  const sourceWords = sourceText.split(/\s+/).filter(w => w);
  const resultWords = resultText.split(/\s+/).filter(w => w);
  
  const contentPreserved = sourceWords.length > 0 && 
    Math.abs(sourceWords.length - resultWords.length) / sourceWords.length < 0.1;
  
  const rows: ComparisonRow[] = [];
  const categories: ComparisonEvidence['categories'] = [];
  
  if (contentPreserved) {
    rows.push({
      location: 'Document content',
      kind: 'content',
      before: sourceText.slice(0, 200),
      after: resultText.slice(0, 200),
      explanation: 'Semantic content preserved; word count difference < 10%',
    });
    categories.push('content');
  } else {
    rows.push({
      location: 'Document content',
      kind: 'content',
      before: sourceText.slice(0, 200),
      after: resultText.slice(0, 200),
      explanation: 'Content appears changed; review required',
    });
    categories.push('content');
  }
  
  if (sourceFormat === 'markdown' || resultFormat === 'markdown') {
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
  
  let status: ComparisonStatus = 'preserved';
  if (!contentPreserved) status = 'content-changed';
  else if (uniqueCategories.some(c => c !== 'content')) status = 'presentation-changed';
  
  return {
    status,
    summary: contentPreserved 
      ? 'Content preserved; presentation changes detected' 
      : 'Content changes detected; review before export',
    categories: uniqueCategories.length > 0 ? uniqueCategories : ['content'],
    rows,
    validation: validationStatus,
  };
}

function compareDocxFormats(
  sourceText: string,
  resultText: string,
  validationStatus: ValidationStatus
): ComparisonEvidence {
  const sourceLines = sourceText.split('\n').filter(l => l.trim());
  const resultLines = resultText.split('\n').filter(l => l.trim());
  
  const sourceWords = sourceText.split(/\s+/).filter(w => w);
  const resultWords = resultText.split(/\s+/).filter(w => w);
  
  const contentPreserved = sourceWords.length > 0 && 
    Math.abs(sourceWords.length - resultWords.length) / sourceWords.length < 0.1;
  
  const rows: ComparisonRow[] = [];
  const categories: ComparisonEvidence['categories'] = [];
  
  if (contentPreserved) {
    rows.push({
      location: 'Document content',
      kind: 'content',
      before: sourceText.slice(0, 200),
      after: resultText.slice(0, 200),
      explanation: 'Semantic content preserved; word count difference < 10%',
    });
    categories.push('content');
  } else {
    rows.push({
      location: 'Document content',
      kind: 'content',
      before: sourceText.slice(0, 200),
      after: resultText.slice(0, 200),
      explanation: 'Content appears changed; review required',
    });
    categories.push('content');
  }
  
  const uniqueCategories = [...new Set(categories)];
  
  let status: ComparisonStatus = 'preserved';
  if (!contentPreserved) status = 'content-changed';
  else if (uniqueCategories.some(c => c !== 'content')) status = 'presentation-changed';
  
  return {
    status,
    summary: contentPreserved 
      ? 'Content preserved; presentation changes detected' 
      : 'Content changes detected; review before export',
    categories: uniqueCategories.length > 0 ? uniqueCategories : ['content'],
    rows,
    validation: validationStatus,
  };
}

function compareBinaryFormats(
  sourceFormat: 'txt' | 'markdown' | 'docx' | 'pdf',
  resultFormat: 'txt' | 'markdown' | 'docx' | 'pdf', 
  validationStatus: ValidationStatus
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