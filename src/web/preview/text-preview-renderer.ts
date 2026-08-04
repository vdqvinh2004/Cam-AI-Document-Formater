import DOMPurify from 'dompurify';

export interface TextPreviewResult {
  html: string;
  text: string;
  featureCount: number;
  warnings: string[];
}

const HEADING_REGEX = /^#+/;
const LIST_ITEM_REGEX = /^(?:[-*+]\s|\d+\.\s)/;
const LINK_REGEX = /\[([^\]]+)\]\([^)]+\)/g;

export async function renderTextPreview(
  textContent: string,
  format: 'txt' | 'markdown'
): Promise<TextPreviewResult> {
  const warnings: string[] = [];
  let html = '';
  let featureCount = 0;

  if (format === 'markdown') {
    const lines = textContent.split('\n');
    let inCodeBlock = false;
    let headingCount = 0;
    let listCount = 0;
    let codeBlockCount = 0;
    let linkCount = 0;

    const htmlParts: string[] = [];
    const len = lines.length;
    
    for (let i = 0; i < len; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          codeBlockCount++;
          htmlParts.push('<pre><code>');
        } else {
          htmlParts.push('</code></pre>');
        }
        continue;
      }
      
      if (inCodeBlock) {
        htmlParts.push(escapeHtml(line) + '\n');
        continue;
      }

      if (trimmed.startsWith('#')) {
        const match = trimmed.match(HEADING_REGEX);
        const level = match ? match[0].length : 1;
        const content = trimmed.slice(level).trim();
        headingCount++;
        htmlParts.push(`<h${level}>${escapeHtml(content)}</h${level}>`);
        continue;
      }

      if (LIST_ITEM_REGEX.test(trimmed)) {
        listCount++;
        htmlParts.push(`<li>${escapeHtml(trimmed.replace(LIST_ITEM_REGEX, ''))}</li>`);
        continue;
      }

      const linkMatches = line.match(LINK_REGEX);
      if (linkMatches) linkCount += linkMatches.length;

      if (trimmed === '') {
        htmlParts.push('<br>');
      } else {
        htmlParts.push(`<p>${escapeHtml(line)}</p>`);
      }
    }

    html = DOMPurify.sanitize(htmlParts.join('\n'));
    featureCount = headingCount + listCount + codeBlockCount + linkCount;
    
    if (headingCount > 0) warnings.push(`${headingCount} heading(s)`);
    if (listCount > 0) warnings.push(`${listCount} list item(s)`);
    if (codeBlockCount > 0) warnings.push(`${codeBlockCount} code block(s)`);
    if (linkCount > 0) warnings.push(`${linkCount} link(s)`);
  } else {
    const lines = textContent.split('\n');
    featureCount = lines.length;
    html = DOMPurify.sanitize(lines.map(l => `<p>${escapeHtml(l) || '<br>'}</p>`).join('\n'));
  }

  return { html, text: textContent, featureCount, warnings };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}