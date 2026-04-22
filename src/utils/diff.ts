import { createTwoFilesPatch } from 'diff';

export function computeDiff(original: string, modified: string, filePath: string): string {
  return createTwoFilesPatch(filePath, filePath, original, modified, '', '');
}
