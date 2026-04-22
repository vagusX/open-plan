import { describe, expect, test } from 'bun:test';
import { getLineRange } from '../src/utils/lines';

describe('getLineRange', () => {
  test('single line quote', () => {
    const text = 'line1\nline2\nline3';
    expect(getLineRange(text, 'line2')).toEqual([2, 2]);
  });

  test('multi-line quote', () => {
    const text = 'line1\nline2\nline3\nline4';
    expect(getLineRange(text, 'line2\nline3')).toEqual([2, 3]);
  });

  test('not found returns null', () => {
    const text = 'line1\nline2';
    expect(getLineRange(text, 'missing')).toBeNull();
  });

  test('empty quote at start', () => {
    const text = 'line1\nline2';
    expect(getLineRange(text, 'line1')).toEqual([1, 1]);
  });
});
