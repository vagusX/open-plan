/**
 * Given the full text and a substring quote, return the 1-based line range.
 * Uses first occurrence. Returns null if quote not found.
 */
export function getLineRange(fullText: string, quote: string): [number, number] | null {
  const idx = fullText.indexOf(quote);
  if (idx === -1) return null;
  const start = idx;
  const end = idx + quote.length;
  const startLine = fullText.slice(0, start).split('\n').length;
  const endLine = fullText.slice(0, end).split('\n').length;
  return [startLine, endLine];
}
