export type PreviewStatus = 'rendered' | 'partial' | 'unavailable' | 'failed';

export interface PreviewEvidence {
  status: PreviewStatus;
  format: 'txt' | 'markdown' | 'docx' | 'pdf';
  html: string;
  text: string;
  featureCount: number;
  warnings: string[];
}

export type ComparisonStatus = 'preserved' | 'presentation-changed' | 'content-changed' | 'unavailable';

export interface ComparisonEvidence {
  status: ComparisonStatus;
  summary: string;
  categories: ('content' | 'typography' | 'spacing' | 'layout' | 'structure' | 'assets' | 'unavailable')[];
  rows: ComparisonRow[];
  validation: 'pass' | 'fail' | 'inconclusive' | 'not-run';
}

export interface ComparisonRow {
  location: string;
  kind: 'content' | 'presentation' | 'unavailable';
  before?: string;
  after?: string;
  explanation: string;
}