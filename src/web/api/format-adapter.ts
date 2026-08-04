export interface FormatAdapter {
  readonly sourceFormat: 'txt' | 'markdown' | 'docx' | 'pdf';
  detect(input: ArrayBuffer, filename: string): { format: 'txt' | 'markdown' | 'docx' | 'pdf'; confidence: number };
  extractText(input: ArrayBuffer): Promise<string>;
  format(source: ArrayBuffer, profile: FormattingProfile): Promise<FormatResult>;
  validateRoundTrip(sourceText: string, resultText: string): Promise<ValidationResult>;
}

export interface FormattingProfile {
  style: 'simple' | 'modern' | 'professional' | 'easy-to-read' | 'academic' | 'custom';
  instructions?: string;
}

export interface FormatResult {
  blob: Blob;
  formattingAvailable: boolean;
  warnings: string[];
}

export interface ValidationResult {
  status: 'pass' | 'fail' | 'inconclusive';
  issues: string[];
}

export class BrowserFormatAdapter implements FormatAdapter {
  readonly sourceFormat: 'txt' | 'markdown' | 'docx' | 'pdf';

  constructor(format: 'txt' | 'markdown' | 'docx' | 'pdf') {
    this.sourceFormat = format;
  }

  detect(input: ArrayBuffer, filename: string): { format: 'txt' | 'markdown' | 'docx' | 'pdf'; confidence: number } {
    const ext = filename.toLowerCase().split('.').pop();
    const formatMap: Record<string, 'txt' | 'markdown' | 'docx' | 'pdf'> = {
      txt: 'txt',
      md: 'markdown',
      markdown: 'markdown',
      docx: 'docx',
      pdf: 'pdf',
    };
    return { format: formatMap[ext || ''] || 'txt', confidence: ext ? 0.9 : 0.5 };
  }

  async extractText(input: ArrayBuffer): Promise<string> {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(input);
  }

  async format(source: ArrayBuffer, profile: FormattingProfile): Promise<FormatResult> {
    const text = await this.extractText(source);
    const warnings: string[] = [];
    
    if (this.sourceFormat === 'docx' || this.sourceFormat === 'pdf') {
      warnings.push(`${this.sourceFormat.toUpperCase()} formatting not yet implemented; returning original file`);
      return {
        blob: new Blob([source], { type: this.getMimeType() }),
        formattingAvailable: false,
        warnings,
      };
    }

    const formattedText = this.applyFormatting(text, profile);
    return {
      blob: new Blob([formattedText], { type: this.getMimeType() }),
      formattingAvailable: true,
      warnings: [],
    };
  }

  async validateRoundTrip(sourceText: string, resultText: string): Promise<ValidationResult> {
    const sourceNormalized = sourceText.trim().replace(/\s+/g, ' ');
    const resultNormalized = resultText.trim().replace(/\s+/g, ' ');
    
    if (sourceNormalized === resultNormalized) {
      return { status: 'pass', issues: [] };
    }
    
    return { 
      status: 'fail', 
      issues: ['Content appears to have changed during formatting'] 
    };
  }

  private applyFormatting(text: string, profile: FormattingProfile): string {
    if (this.sourceFormat === 'markdown') {
      return text;
    }
    return text;
  }

  private getMimeType(): string {
    switch (this.sourceFormat) {
      case 'txt': return 'text/plain';
      case 'markdown': return 'text/markdown';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'pdf': return 'application/pdf';
    }
  }
}

export function createFormatAdapter(format: 'txt' | 'markdown' | 'docx' | 'pdf'): FormatAdapter {
  return new BrowserFormatAdapter(format);
}