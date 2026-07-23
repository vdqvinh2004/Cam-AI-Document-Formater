export type BrowserStyleName = 'simple' | 'modern' | 'professional' | 'easy-to-read' | 'academic' | 'custom';

export interface BrowserStyleTokens {
  name: BrowserStyleName;
  document: Record<string, string | number | boolean>;
  heading: Record<string, string | number | boolean>;
  paragraph: Record<string, string | number | boolean>;
  table: Record<string, string | number | boolean>;
}

const profiles: Record<Exclude<BrowserStyleName, 'custom'>, BrowserStyleTokens> = {
  simple: { name: 'simple', document: { fontFamily: 'Helvetica', fontSize: 12 }, heading: { bold: true, spacingAfter: 10 }, paragraph: { spacingAfter: 6, lineSpacing: 1.2 }, table: { border: 'light' } },
  modern: { name: 'modern', document: { fontFamily: 'Avenir Next', fontSize: 12 }, heading: { bold: true, spacingAfter: 12 }, paragraph: { spacingAfter: 8, lineSpacing: 1.25 }, table: { border: 'minimal' } },
  professional: { name: 'professional', document: { fontFamily: 'Helvetica Neue', fontSize: 11 }, heading: { bold: true, spacingAfter: 8 }, paragraph: { spacingAfter: 5, lineSpacing: 1.15 }, table: { border: 'grid' } },
  'easy-to-read': { name: 'easy-to-read', document: { fontFamily: 'Atkinson Hyperlegible', fontSize: 13 }, heading: { bold: true, spacingAfter: 10 }, paragraph: { spacingAfter: 9, lineSpacing: 1.4 }, table: { border: 'light' } },
  academic: { name: 'academic', document: { fontFamily: 'Georgia', fontSize: 11 }, heading: { bold: true, spacingAfter: 8 }, paragraph: { spacingAfter: 4, lineSpacing: 1.15, indentation: 18 }, table: { border: 'grid' } },
};

export function resolveBrowserStyle(style: BrowserStyleName): BrowserStyleTokens {
  return style === 'custom' ? { name: 'custom', document: {}, heading: {}, paragraph: {}, table: {} } : profiles[style];
}