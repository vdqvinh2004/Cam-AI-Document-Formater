export interface ValidationGateInput {
  validationStatus: 'pass' | 'fail' | 'inconclusive' | 'not-run';
  formattingAvailable: boolean;
  format: 'txt' | 'markdown' | 'docx' | 'pdf';
}

export interface ValidationGateResult {
  canExport: boolean;
  reason: string;
  userMessage: string;
}

export function evaluateValidationGate(input: ValidationGateInput): ValidationGateResult {
  const { validationStatus, formattingAvailable, format } = input;

  if (!formattingAvailable) {
    return {
      canExport: false,
      reason: 'formatting-unavailable',
      userMessage: `Formatting is not available for ${format.toUpperCase()} files. The original file is preserved.`,
    };
  }

  switch (validationStatus) {
    case 'pass':
      return {
        canExport: true,
        reason: 'validation-passed',
        userMessage: 'Validation passed. Ready to export.',
      };
    case 'fail':
      return {
        canExport: false,
        reason: 'validation-failed',
        userMessage: 'Validation failed. Content changes detected. Export blocked.',
      };
    case 'inconclusive':
      return {
        canExport: false,
        reason: 'validation-inconclusive',
        userMessage: 'Validation inconclusive. Cannot verify content preservation. Export blocked.',
      };
    case 'not-run':
      return {
        canExport: false,
        reason: 'validation-not-run',
        userMessage: 'Validation has not been run. Complete formatting and validation first.',
      };
    default:
      return {
        canExport: false,
        reason: 'unknown-status',
        userMessage: 'Unknown validation state. Export blocked.',
      };
  }
}