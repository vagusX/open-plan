import { describe, expect, test } from 'bun:test';
import { computeDiff } from '../src/utils/diff';

describe('computeDiff', () => {
  test('produces unified diff', () => {
    const diff = computeDiff('hello\nworld', 'hello\nthere', 'test.md');
    expect(diff).toContain('--- test.md');
    expect(diff).toContain('+++ test.md');
    expect(diff).toContain('-world');
    expect(diff).toContain('+there');
  });

  test('identical content produces empty diff', () => {
    const diff = computeDiff('same', 'same', 'test.md');
    expect(diff).toContain('--- test.md');
    expect(diff).toContain('+++ test.md');
  });
});
