/**
 * Map a selected quote back to a 1-based line range in the source markdown.
 *
 * Strategy:
 * 1. Exact substring match (fast path, works for single-block selections).
 * 2. Fallback: locate the first and last non-empty pieces of the quote line-by-line
 *    in the source. This handles multi-block selections (e.g. across list items or
 *    headings) where the rendered selection omits list markers and block breaks,
 *    so the raw quote won't appear verbatim in the markdown.
 */
export function getLineRange(fullText: string, quote: string): [number, number] | null {
  const idx = fullText.indexOf(quote);
  if (idx !== -1) {
    const startLine = fullText.slice(0, idx).split('\n').length;
    const endLine = fullText.slice(0, idx + quote.length).split('\n').length;
    return [startLine, endLine];
  }

  const pieces = quote.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (pieces.length === 0) return null;

  const firstLine = findLine(fullText, pieces[0], 1);
  if (firstLine == null) return null;
  const lastLine = findLine(fullText, pieces[pieces.length - 1], firstLine);
  if (lastLine == null) return [firstLine, firstLine];
  return [firstLine, Math.max(firstLine, lastLine)];
}

function findLine(fullText: string, needle: string, fromLine: number): number | null {
  const lines = fullText.split('\n');
  for (let i = fromLine - 1; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i + 1;
  }
  return null;
}
