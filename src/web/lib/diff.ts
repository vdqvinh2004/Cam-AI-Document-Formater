export interface DiffToken {
  text: string;
  type: 'equal' | 'added' | 'removed';
}

/**
 * Splits text into whitespace-preserving tokens.
 */
function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

/**
 * Computes a word-level diff between two texts using a simplified LCS approach.
 * For large texts, falls back to line-level diff to keep performance reasonable.
 */
export function diffWords(source: string, result: string): DiffToken[] {
  // For very large texts, do line-level diff instead
  if (source.length > 50000 || result.length > 50000) {
    return diffLines(source, result);
  }
  const sourceTokens = tokenize(source);
  const resultTokens = tokenize(result);
  return lcsDiff(sourceTokens, resultTokens);
}

/**
 * Line-level diff for large texts.
 */
function diffLines(source: string, result: string): DiffToken[] {
  const sourceLines = source.split('\n');
  const resultLines = result.split('\n');
  const tokens: DiffToken[] = [];
  let si = 0;
  let ri = 0;

  while (si < sourceLines.length || ri < resultLines.length) {
    if (si < sourceLines.length && ri < resultLines.length && sourceLines[si] === resultLines[ri]) {
      tokens.push({ text: sourceLines[si], type: 'equal' });
      si++;
      ri++;
    } else if (si < sourceLines.length && (ri >= resultLines.length || sourceLines.indexOf(resultLines[ri], si) === -1)) {
      tokens.push({ text: sourceLines[si], type: 'removed' });
      si++;
    } else if (ri < resultLines.length) {
      tokens.push({ text: resultLines[ri], type: 'added' });
      ri++;
    } else {
      break;
    }
  }
  return tokens;
}

/**
 * LCS-based diff algorithm (Myers simplified).
 * Returns diff tokens showing additions and removals at word level.
 */
function lcsDiff(sourceTokens: string[], resultTokens: string[]): DiffToken[] {
  const n = sourceTokens.length;
  const m = resultTokens.length;

  // For small inputs, use direct comparison
  if (n === 0 && m === 0) return [];
  if (n === 0) return resultTokens.map((text) => ({ text, type: 'added' as const }));
  if (m === 0) return sourceTokens.map((text) => ({ text, type: 'removed' as const }));

  // Build LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (sourceTokens[i - 1] === resultTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const tokens: DiffToken[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && sourceTokens[i - 1] === resultTokens[j - 1]) {
      tokens.unshift({ text: sourceTokens[i - 1], type: 'equal' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ text: resultTokens[j - 1], type: 'added' });
      j--;
    } else {
      tokens.unshift({ text: sourceTokens[i - 1], type: 'removed' });
      i--;
    }
  }

  return tokens;
}
