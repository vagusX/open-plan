import { describe, expect, test } from 'bun:test';
import { generateXml } from '../src/utils/xml';
import type { Comment } from '../src/types';

describe('generateXml', () => {
  test('basic XML with comments and diff', () => {
    const comments: Comment[] = [
      { id: 'c1', quote: 'hello', lines: [1, 1], text: 'needs greeting' },
    ];
    const xml = generateXml('plan.md', 'hello\nworld', 'hello\nthere', comments);
    expect(xml).toContain('<plan file="plan.md"/>');
    expect(xml).toContain('<diff>');
    expect(xml).toContain('<comment id="c1">');
    expect(xml).toContain('<quote lines="1-1">hello</quote>');
    expect(xml).toContain('needs greeting');
    expect(xml).toContain('</review>');
  });

  test('no diff when content unchanged', () => {
    const comments: Comment[] = [];
    const xml = generateXml('plan.md', 'same', 'same', comments);
    expect(xml).not.toContain('<diff>');
    expect(xml).toContain('<plan file="plan.md"/>');
  });

  test('escapes XML special chars', () => {
    const comments: Comment[] = [
      { id: 'c1', quote: 'a < b', lines: [1, 1], text: 'x & y' },
    ];
    const xml = generateXml('plan.md', 'a < b', 'a < b', comments);
    expect(xml).toContain('a &lt; b');
    expect(xml).toContain('x &amp; y');
  });
});
