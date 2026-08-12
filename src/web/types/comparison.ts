export type ComparisonKind = 'content' | 'presentation' | 'unavailable';
export type ComparisonStatus = 'preserved' | 'presentation-changed' | 'content-changed' | 'unavailable';
export type ValidationStatus = 'pass' | 'fail' | 'inconclusive' | 'not-run';

export interface ComparisonRow {
  location: string;
  kind: ComparisonKind;
  before?: string;
  after?: string;
  explanation: string;
}

export interface ComparisonEvidence {
  status: ComparisonStatus;
  summary: string;
  categories: ('content' | 'typography' | 'spacing' | 'layout' | 'structure' | 'assets' | 'unavailable')[];
  rows: ComparisonRow[];
  validation: ValidationStatus;
  /** True when content is preserved exactly and no presentation change was detected at all. */
  noChangesApplied?: boolean;
}